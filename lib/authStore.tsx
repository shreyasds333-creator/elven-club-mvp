"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ELVNUser {
  id:       string;
  email:    string;
  name:     string;
  handle:   string;
  initials: string;
}

interface AuthCtx {
  user:      ELVNUser | null;
  isLoading: boolean;
  login:  (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name?: string, handle?: string) => Promise<{ error?: string }>;
  logout: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

async function fetchProfile(userId: string): Promise<ELVNUser | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return { id: data.id, email: data.email, name: data.name, handle: data.handle, initials: data.initials };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<AuthCtx | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<ELVNUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).then(profile => {
          if (profile) setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Keep user state in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signup = useCallback(async (
    email:    string,
    password: string,
    name?:    string,
    handle?:  string,
  ): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Signup failed — no user returned." };

    const resolvedName    = name?.trim()  || email.split("@")[0].replace(/[._-]/g, " ");
    const resolvedHandle  = handle?.trim() || resolvedName.toLowerCase().replace(/\s+/g, "_");
    const initials        = buildInitials(resolvedName);

    const { error: profileErr } = await supabase.from("profiles").insert({
      id:       data.user.id,
      email:    email.trim().toLowerCase(),
      name:     resolvedName,
      handle:   resolvedHandle,
      initials,
    });

    if (profileErr) return { error: profileErr.message };

    setUser({ id: data.user.id, email: email.trim().toLowerCase(), name: resolvedName, handle: resolvedHandle, initials });
    return {};
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut(); // fire-and-forget
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
