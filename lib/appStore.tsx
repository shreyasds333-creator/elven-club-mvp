"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Challenge, Tier } from "./challengeData";
import { ALL_CHALLENGES } from "./challengeData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateChallengeConfig {
  isPublic:  boolean;
  memberCap: number;
  title:     string;
  tagline:   string;
  category:  string;
  stepGoal:  number;
  proofType: string;
  minStreak: number;
  duration:  number;
  entry:     number;
}

export interface ProofEntry {
  challengeId:    number;
  challengeTitle: string;
  timestamp:      number; // unix ms
  streak:         number;
}

interface AppStore {
  coins:             number;
  streak:            number;
  longestStreak:     number;
  lastProofDate:     string | null;  // "YYYY-MM-DD"
  provedToday:       boolean;        // derived: lastProofDate === today
  proofLog:          ProofEntry[];
  joined:            Set<number>;
  recovering:        Set<number>;
  proofSent:         Set<number>;    // resets each calendar day
  shielded:          Set<number>;
  shields:           number;
  createdChallenges: Challenge[];
  joinChallenge:    (id: number, entry: number) => void;
  sendProof:        (id: number) => void;
  activateShield:   (id: number) => void;
  createChallenge:  (config: CreateChallengeConfig) => Challenge;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORE_KEY = "elvn_app_store";

interface PersistedStore {
  coins:             number;
  streak:            number;
  longestStreak:     number;
  lastProofDate:     string | null;
  proofSentDate:     string | null;  // date proofSent Set was populated
  shields:           number;
  joined:            number[];
  recovering:        number[];
  proofSent:         number[];
  shielded:          number[];
  proofLog:          ProofEntry[];
  createdChallenges: Challenge[];
}

function loadStore(): PersistedStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as PersistedStore) : null;
  } catch {
    return null;
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function yesterdayStr(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

// ─── Streak initialization ────────────────────────────────────────────────────
// Handles both fresh starts and daily reset on app reopen.
// Migration safety: if lastProofDate is null (legacy users), preserve existing streak.

function computeInitialStreak(saved: PersistedStore | null): number {
  const currentStreak = saved?.streak ?? 0;
  const lastDate      = saved?.lastProofDate ?? null;

  // New user or legacy account with no date recorded → keep whatever streak is saved
  if (lastDate === null) return currentStreak;

  const t = todayStr();
  const y = yesterdayStr();

  // Streak is intact if they proved today or yesterday (still have until midnight)
  if (lastDate === t || lastDate === y) return currentStreak;

  // Missed at least one full day → streak breaks
  return 0;
}

// ─── Category maps ────────────────────────────────────────────────────────────

const CAT_ACCENT: Record<string, string> = {
  elite: "#E2BE74", transformation: "#4DC87A",
  performance: "#8B8BDE", discipline: "#E07840", social: "#6098D8",
};
const CAT_EMOJI: Record<string, string> = {
  elite: "⚡", transformation: "🔥", performance: "🏆", discipline: "🧠", social: "👥",
};
const CAT_CARDBG: Record<string, string> = {
  elite:          "radial-gradient(ellipse at 24% 22%, rgba(201,168,76,0.22) 0%, transparent 58%), linear-gradient(160deg,#0D0A04 0%,#080600 100%)",
  transformation: "radial-gradient(ellipse at 20% 26%, rgba(4,120,87,0.30) 0%, transparent 58%), linear-gradient(160deg,#050E09 0%,#020704 100%)",
  performance:    "radial-gradient(ellipse at 22% 20%, rgba(99,102,241,0.22) 0%, transparent 58%), linear-gradient(160deg,#07070F 0%,#040408 100%)",
  discipline:     "radial-gradient(ellipse at 22% 22%, rgba(224,120,64,0.18) 0%, transparent 58%), linear-gradient(160deg,#0C0804 0%,#060402 100%)",
  social:         "radial-gradient(ellipse at 20% 24%, rgba(37,99,235,0.22) 0%, transparent 58%), linear-gradient(160deg,#050810 0%,#030406 100%)",
};

function toTier(entry: number): Tier {
  if (entry >= 10000) return "Insane";
  if (entry >= 1000)  return "Elite";
  if (entry >= 500)   return "Warrior";
  return "Rookie";
}

function generateInviteCode(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<AppStore | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const saved = loadStore();

  // ── State initialization ────────────────────────────────────────────────────
  // All lazy initializers run once at mount. streak is computed from date logic
  // so that a missed day resets the streak immediately on next app open.

  const [coins,             setCoins]             = useState(saved?.coins ?? 25000);
  const [streak,            setStreak]            = useState(() => computeInitialStreak(saved));
  const [longestStreak,     setLongestStreak]     = useState(saved?.longestStreak ?? saved?.streak ?? 0);
  const [lastProofDate,     setLastProofDate]     = useState<string | null>(saved?.lastProofDate ?? null);
  const [proofSentDate,     setProofSentDate]     = useState<string | null>(saved?.proofSentDate ?? null);
  const [shields,           setShields]           = useState(saved?.shields ?? 2);
  const [joined,            setJoined]            = useState<Set<number>>(() => new Set(saved?.joined ?? [1]));
  const [recovering,        setRecovering]        = useState<Set<number>>(() => new Set(saved?.recovering ?? [1]));

  // proofSent resets each calendar day — don't restore stale entries from another day
  const [proofSent, setProofSent] = useState<Set<number>>(() => {
    if (!saved?.proofSentDate || saved.proofSentDate !== todayStr()) return new Set();
    return new Set(saved.proofSent ?? []);
  });

  const [shielded,          setShielded]          = useState<Set<number>>(() => new Set(saved?.shielded ?? []));
  const [proofLog,          setProofLog]          = useState<ProofEntry[]>(saved?.proofLog ?? []);
  const [createdChallenges, setCreatedChallenges] = useState<Challenge[]>(saved?.createdChallenges ?? []);

  // Derived: did the user already submit proof today?
  const provedToday = lastProofDate === todayStr();

  // ── Persist on every state change ──────────────────────────────────────────
  useEffect(() => {
    const payload: PersistedStore = {
      coins, streak, longestStreak, lastProofDate, proofSentDate, shields,
      joined:            [...joined],
      recovering:        [...recovering],
      proofSent:         [...proofSent],
      shielded:          [...shielded],
      proofLog,
      createdChallenges,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  }, [coins, streak, longestStreak, lastProofDate, proofSentDate, shields,
      joined, recovering, proofSent, shielded, proofLog, createdChallenges]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function joinChallenge(id: number, entry: number) {
    setCoins(c => c - entry);
    setJoined(s => new Set([...s, id]));
  }

  function sendProof(id: number) {
    const t = todayStr();
    const y = yesterdayStr();

    // Determine the effective proofSent set for today (may have been cleared on new day)
    const effectiveProofSent: Set<number> =
      proofSentDate === t ? proofSent : new Set();

    // Guard: this specific challenge was already proved today
    if (effectiveProofSent.has(id)) return;

    // Look up challenge title
    const allChalls = [...createdChallenges, ...ALL_CHALLENGES];
    const ch        = allChalls.find(c => c.id === id);

    // ── Streak logic ──────────────────────────────────────────────────────────
    // Rule 1: first proof of today counts toward the streak (once per day)
    // Rule 2: consecutive days grow the streak
    // Rule 3: a gap of ≥ 1 full day resets streak to 1

    const alreadyProvedToday = lastProofDate === t;

    let newStreak: number;
    if (alreadyProvedToday) {
      // Second+ challenge proved today — streak doesn't change
      newStreak = streak;
    } else if (!lastProofDate || lastProofDate === y) {
      // First proof ever, OR consecutive day
      newStreak = streak + 1;
    } else {
      // Gap detected (this path is a safety net; normally handled on mount)
      newStreak = 1;
    }

    const newLongest = Math.max(longestStreak, newStreak);

    const entry: ProofEntry = {
      challengeId:    id,
      challengeTitle: ch?.title ?? "Challenge",
      timestamp:      Date.now(),
      streak:         newStreak,
    };

    setProofLog(prev => [entry, ...prev.slice(0, 49)]);
    setProofSent(new Set([...effectiveProofSent, id]));
    setProofSentDate(t);
    setStreak(newStreak);
    setLongestStreak(newLongest);
    if (!alreadyProvedToday) setLastProofDate(t);
  }

  function activateShield(id: number) {
    if (shields < 1 || shielded.has(id)) return;
    setShields(s => s - 1);
    setShielded(s => new Set([...s, id]));
    setRecovering(s => { const n = new Set(s); n.delete(id); return n; });
  }

  function createChallenge(config: CreateChallengeConfig): Challenge {
    const id          = Date.now();
    const accentColor = CAT_ACCENT[config.category] ?? "#C9A84C";
    const totalPool   = config.memberCap * config.entry;
    const prize       = Math.round(totalPool * 0.80);

    const challenge: Challenge = {
      id,
      title:           config.title,
      tagline:         config.tagline || `${config.duration} day challenge. Are you in?`,
      emoji:           CAT_EMOJI[config.category] ?? "🏃",
      category:        config.category,
      duration:        config.duration,
      entry:           config.entry,
      prize,
      participants:    1,
      maxParticipants: config.memberCap,
      winnersCount:    Math.max(1, Math.round(config.memberCap * 0.20)),
      daysLeft:        config.duration,
      tier:            toTier(config.entry),
      accentColor,
      cardBg:          CAT_CARDBG[config.category] ?? CAT_CARDBG.elite,
      trending:        false,
      isLive:          false,
      friendsJoined:   [],
      recentProofs:    [],
      proofType:       config.proofType,
      minStreak:       config.minStreak,
      joinedToday:     1,
      liveTicket:      `You created this · ${config.duration}d challenge`,
      proofsToday:     0,
      activeNow:       1,
      socialBlip:      `${config.title} just launched`,
      missedYesterday: 0,
      creator:    { name: "Arjun Sharma", initials: "AS", bg: "linear-gradient(135deg,#7A4A18,#3A2008)" },
      isPublic:   config.isPublic,
      inviteCode: config.isPublic ? undefined : generateInviteCode(),
      memberCap:  config.memberCap,
      stepGoal:   config.stepGoal > 0 ? config.stepGoal : undefined,
    };

    if (config.entry > 0) setCoins(c => c - config.entry);
    setJoined(s => new Set([...s, id]));
    setCreatedChallenges(prev => [challenge, ...prev]);
    return challenge;
  }

  return (
    <Ctx.Provider value={{
      coins, streak, longestStreak, lastProofDate, provedToday,
      proofLog, joined, recovering, proofSent, shielded, shields,
      createdChallenges,
      joinChallenge, sendProof, activateShield, createChallenge,
    }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppStore must be used within AppProvider");
  return ctx;
}
