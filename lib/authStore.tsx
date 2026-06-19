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
  login:     (email: string, password: string) => Promise<{ error?: string }>;
  signup:    (email: string, password: string, name?: string, handle?: string) => Promise<{ error?: string; requiresConfirmation?: boolean }>;
  sendOtp:   (email: string, name?: string, handle?: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  logout:    () => void;
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

    // Email not confirmed — auto-confirm via server API then retry
    if (error?.message?.toLowerCase().includes("email not confirmed")) {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        const { error: retryErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        });
        if (retryErr) return { error: retryErr.message };
        return {};
      }
      return { error: "Please check your email and click the confirmation link, then try again." };
    }

    if (error) return { error: error.message };
    return {};
  }, []);

  const signup = useCallback(async (
    email:    string,
    password: string,
    name?:    string,
    handle?:  string,
  ): Promise<{ error?: string; requiresConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Signup failed — please try again." };

    const resolvedName   = name?.trim()   || email.split("@")[0].replace(/[._-]/g, " ");
    const resolvedHandle = handle?.trim() || resolvedName.toLowerCase().replace(/\s+/g, "_");
    const initials       = buildInitials(resolvedName);

    // Insert profile row
    await supabase.from("profiles").insert({
      id:       data.user.id,
      email:    email.trim().toLowerCase(),
      name:     resolvedName,
      handle:   resolvedHandle,
      initials,
    });

    // If Supabase requires email confirmation, auto-confirm via server API
    if (!data.session) {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id }),
      });

      if (!res.ok) {
        // Fallback: show check-email screen
        return { requiresConfirmation: true };
      }

      // Now sign in to get the session
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInErr) return { requiresConfirmation: true };
    }

    setUser({ id: data.user.id, email: email.trim().toLowerCase(), name: resolvedName, handle: resolvedHandle, initials });
    return {};
  }, []);

  const sendOtp = useCallback(async (email: string, name?: string, handle?: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: name ? { name, handle } : undefined,
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Verification failed. Try again." };

    const existing = await fetchProfile(data.user.id);
    if (!existing) {
      const meta          = data.user.user_metadata ?? {};
      const resolvedName  = meta.name  || email.split("@")[0].replace(/[._-]/g, " ");
      const resolvedHandle= meta.handle|| resolvedName.toLowerCase().replace(/\s+/g, "_");
      const initials      = buildInitials(resolvedName);
      await supabase.from("profiles").upsert({
        id: data.user.id, email: email.trim().toLowerCase(),
        name: resolvedName, handle: resolvedHandle, initials,
      });
      setUser({ id: data.user.id, email: email.trim().toLowerCase(), name: resolvedName, handle: resolvedHandle, initials });
    }
    return {};
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, isLoading, login, signup, sendOtp, verifyOtp, logout }}>
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
