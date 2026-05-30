"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = "elvn_session";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUser(email: string): ELVNUser {
  const storedName   = localStorage.getItem("elvn_user_name")   ?? "";
  const storedHandle = localStorage.getItem("elvn_user_handle") ?? "";

  const name   = storedName.trim() || email.split("@")[0].replace(/[._-]/g, " ");
  const words  = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  return {
    id:      Math.random().toString(36).slice(2) + Date.now().toString(36),
    email:   email.trim().toLowerCase(),
    name,
    handle:  storedHandle || name.toLowerCase().replace(/\s+/g, "_"),
    initials,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<AuthCtx | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<ELVNUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw) as ELVNUser);
    } catch {}
    setIsLoading(false);
  }, []);

  const login = useCallback(async (
    email: string,
    _password: string,
  ): Promise<{ error?: string }> => {
    // MVP: check if this email matches an existing stored session
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as ELVNUser;
        if (stored.email === email.trim().toLowerCase()) {
          setUser(stored);
          return {};
        }
        // Different email → account not found
        return { error: "No account found for this email. Join instead." };
      }
    } catch {}
    // No stored session at all — auto-create (frictionless MVP)
    const u = buildUser(email);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
    return {};
  }, []);

  const signup = useCallback(async (
    email: string,
    _password: string,
  ): Promise<{ error?: string }> => {
    const u = buildUser(email);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
    return {};
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
