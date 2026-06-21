"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./authStore";

export interface Squad {
  id:         string;
  name:       string;
  inviteCode: string;
  maxMembers: number;
}

export interface SquadMember {
  userId:   string;
  name:     string;
  initials: string;
  isYou:    boolean;
}

export function useSquad() {
  const { user, isLoading: authLoading } = useAuth();
  const [squad,   setSquad]   = useState<Squad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setSquad(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: membership } = await supabase
        .from("squad_members")
        .select("squad_id, squads(id, name, invite_code, max_members)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setSquad(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sq = membership.squads as any;
      setSquad({ id: sq.id, name: sq.name, inviteCode: sq.invite_code, maxMembers: sq.max_members });

      const { data: memberRows } = await supabase
        .from("squad_members")
        .select("user_id, profiles(name, initials)")
        .eq("squad_id", membership.squad_id);

      if (memberRows) {
        setMembers(memberRows.map(r => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = r.profiles as any;
          return {
            userId:   r.user_id as string,
            name:     p?.name     ?? "Member",
            initials: p?.initials ?? "??",
            isYou:    r.user_id === user.id,
          };
        }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) reload();
  }, [reload, authLoading]);

  async function createSquad(name: string): Promise<{ error?: string }> {
    if (!user) return { error: "Not logged in" };
    if (squad)  return { error: "Leave your current squad first" };

    const code = Math.random().toString(36).toUpperCase().slice(2, 8);

    const { data: sq, error: sqErr } = await supabase
      .from("squads")
      .insert({ name: name.trim(), created_by: user.id, invite_code: code })
      .select()
      .single();

    if (sqErr || !sq) return { error: sqErr?.message ?? "Failed to create squad" };

    const { error: mErr } = await supabase
      .from("squad_members")
      .insert({ squad_id: sq.id, user_id: user.id });

    if (mErr) {
      await supabase.from("squads").delete().eq("id", sq.id);
      return { error: mErr.message };
    }

    await reload();
    return {};
  }

  async function joinSquad(code: string): Promise<{ error?: string }> {
    if (!user) return { error: "Not logged in" };
    if (squad)  return { error: "Leave your current squad first" };

    const { data: sq, error: lookupErr } = await supabase
      .from("squads")
      .select("id, max_members")
      .eq("invite_code", code.trim().toUpperCase())
      .maybeSingle();

    if (lookupErr || !sq) return { error: "Invalid invite code" };

    const { count } = await supabase
      .from("squad_members")
      .select("*", { count: "exact", head: true })
      .eq("squad_id", sq.id);

    if ((count ?? 0) >= sq.max_members) return { error: "Squad is full (max 4 members)" };

    const { error: joinErr } = await supabase
      .from("squad_members")
      .insert({ squad_id: sq.id, user_id: user.id });

    if (joinErr) {
      if (joinErr.code === "23505") return { error: "Already in this squad" };
      return { error: joinErr.message };
    }

    await reload();
    return {};
  }

  async function leaveSquad(): Promise<void> {
    if (!user || !squad) return;
    await supabase
      .from("squad_members")
      .delete()
      .eq("squad_id", squad.id)
      .eq("user_id", user.id);
    setSquad(null);
    setMembers([]);
  }

  return { squad, members, loading, error, createSquad, joinSquad, leaveSquad, reload };
}
