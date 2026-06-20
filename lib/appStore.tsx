"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { Challenge, Tier } from "./challengeData";
import { ALL_CHALLENGES } from "./challengeData";
import { supabase } from "./supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateChallengeConfig {
  isPublic:        boolean;
  memberCap:       number;
  title:           string;
  tagline:         string;
  category:        string;
  stepGoal:        number;
  proofType:       string;
  minStreak:       number;
  duration:        number;
  entry:           number;
  creatorName:     string;
  creatorInitials: string;
}

export interface ProofEntry {
  challengeId:    number;
  challengeTitle: string;
  timestamp:      number; // unix ms
  streak:         number;
}

export interface Transaction {
  id:        string;
  label:     string;
  coins:     number;
  isDebit:   boolean;
  emoji:     string;
  category:  "Win" | "Streak" | "Proof" | "Entry" | "Bonus";
  timestamp: number;
}

interface AppStore {
  coins:             number;
  streak:            number;
  longestStreak:     number;
  lastProofDate:     string | null;
  provedToday:       boolean;
  proofLog:          ProofEntry[];
  transactions:      Transaction[];
  joined:            Set<number>;
  recovering:        Set<number>;
  proofSent:         Set<number>;
  shielded:          Set<number>;
  shields:           number;
  createdChallenges: Challenge[];
  claimedChallenges: Set<number>;
  actionError:       string | null;
  clearActionError:  () => void;
  joinChallenge:    (id: number, entry: number) => void;
  sendProof:        (id: number, imageUrl?: string) => void;
  activateShield:   (id: number) => void;
  createChallenge:  (config: CreateChallengeConfig) => Challenge;
  addCoins:         (amount: number, label: string, category: Transaction["category"], emoji?: string) => void;
  claimPrize:       (id: number, amount: number, title: string) => void;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

function computeStreak(saved: number, lastDate: string | null): number {
  if (!lastDate) return saved;
  const t = todayStr();
  const y = yesterdayStr();
  if (lastDate === t || lastDate === y) return saved;
  return 0; // missed a day
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
  // userId ref for background Supabase writes (avoids stale closures)
  const uidRef = useRef<string | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [coins,             setCoins]             = useState(100);
  const [streak,            setStreak]            = useState(0);
  const [longestStreak,     setLongestStreak]     = useState(0);
  const [lastProofDate,     setLastProofDate]     = useState<string | null>(null);
  const [shields,           setShields]           = useState(2);
  const [joined,            setJoined]            = useState<Set<number>>(() => new Set());
  const [recovering,        setRecovering]        = useState<Set<number>>(() => new Set());
  const [proofSent,         setProofSent]         = useState<Set<number>>(() => new Set());
  const [shielded,          setShielded]          = useState<Set<number>>(() => new Set());
  const [claimedChallenges, setClaimedChallenges] = useState<Set<number>>(() => new Set());
  const [proofLog,          setProofLog]          = useState<ProofEntry[]>([]);
  const [createdChallenges, setCreatedChallenges] = useState<Challenge[]>([]);
  const [transactions,      setTransactions]      = useState<Transaction[]>([{
    id: "starter", label: "Welcome bonus", coins: 100,
    isDebit: false, emoji: "🎁", category: "Bonus", timestamp: Date.now(),
  }]);
  const [actionError, setActionError] = useState<string | null>(null);

  const provedToday = lastProofDate === todayStr();
  function clearActionError() { setActionError(null); }

  // ── Load from Supabase on auth state change ─────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id ?? null;
      uidRef.current = uid;
      if (!uid) return;

      const today = todayStr();

      // allSettled so one missing table never aborts the rest
      const [appStateRes, txnsRes, membershipsRes, todayProofsRes, allProofsRes, claimedRes, shieldedRes, createdRes] =
        await Promise.allSettled([
          supabase.from("user_app_state").select("*").eq("user_id", uid).single(),
          supabase.from("transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
          supabase.from("challenge_memberships").select("challenge_id").eq("user_id", uid),
          supabase.from("proof_submissions").select("challenge_id").eq("user_id", uid).gte("submitted_at", `${today}T00:00:00`),
          supabase.from("proof_submissions").select("*").eq("user_id", uid).order("submitted_at", { ascending: false }).limit(50),
          supabase.from("claimed_challenges").select("challenge_id").eq("user_id", uid),
          supabase.from("shielded_challenges").select("challenge_id").eq("user_id", uid),
          supabase.from("created_challenges").select("data").eq("user_id", uid),
        ]);

      // Safely unwrap each settled result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function ok<T>(r: PromiseSettledResult<any>): T | null {
        return r.status === "fulfilled" ? (r.value.data as T) : null;
      }

      // Core game state
      const st = ok<Record<string, unknown>>(appStateRes);
      if (st) {
        const lastDate = st.last_proof_date as string | null;
        setCoins((st.coins as number) ?? 100);
        setStreak(computeStreak((st.streak as number) ?? 0, lastDate));
        setLongestStreak((st.longest_streak as number) ?? 0);
        setLastProofDate(lastDate);
        setShields((st.shields as number) ?? 2);
      } else {
        // First sign-in — seed state row and welcome transaction
        await supabase.from("user_app_state").insert({
          user_id: uid, coins: 100, streak: 0, longest_streak: 0, shields: 2,
        });
        await supabase.from("transactions").insert({
          user_id: uid, label: "Welcome bonus", coins: 100,
          is_debit: false, emoji: "🎁", category: "Bonus",
        });
      }

      // Transactions
      const txns = ok<Record<string, unknown>[]>(txnsRes);
      if (txns?.length) {
        setTransactions(txns.map(t => ({
          id:        t.id as string,
          label:     t.label as string,
          coins:     t.coins as number,
          isDebit:   t.is_debit as boolean,
          emoji:     t.emoji as string,
          category:  t.category as Transaction["category"],
          timestamp: new Date(t.created_at as string).getTime(),
        })));
      }

      // Joined challenges
      const memberships = ok<{ challenge_id: number }[]>(membershipsRes);
      setJoined(new Set(memberships?.map(m => m.challenge_id) ?? []));

      // Today's proofs
      const todayProofs = ok<{ challenge_id: number }[]>(todayProofsRes);
      setProofSent(new Set(todayProofs?.map(p => p.challenge_id) ?? []));

      // Full proof log
      const allProofs = ok<{ challenge_id: number; challenge_title: string; submitted_at: string; streak_at_time: number }[]>(allProofsRes);
      if (allProofs?.length) {
        setProofLog(allProofs.map(p => ({
          challengeId:    p.challenge_id,
          challengeTitle: p.challenge_title,
          timestamp:      new Date(p.submitted_at).getTime(),
          streak:         p.streak_at_time,
        })));
      }

      const claimedData  = ok<{ challenge_id: number }[]>(claimedRes);
      const shieldedData = ok<{ challenge_id: number }[]>(shieldedRes);
      const createdData  = ok<{ data: unknown }[]>(createdRes);

      setClaimedChallenges(new Set(claimedData?.map(c => c.challenge_id) ?? []));
      setShielded(new Set(shieldedData?.map(s => s.challenge_id) ?? []));
      if (createdData?.length) {
        setCreatedChallenges(createdData.map(d => d.data as Challenge));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function joinChallenge(id: number, entry: number) {
    const ch       = [...createdChallenges, ...ALL_CHALLENGES].find(c => c.id === id);
    const newCoins = coins - entry;

    // Optimistic update
    setCoins(newCoins);
    setJoined(s => new Set([...s, id]));

    const uid = uidRef.current;
    if (!uid) return;

    const tx: Transaction | null = entry > 0 ? {
      id: `join-${id}-${Date.now()}`,
      label: `Joined ${ch?.title ?? "Challenge"}`,
      coins: entry, isDebit: true, emoji: "⚡", category: "Entry",
      timestamp: Date.now(),
    } : null;
    if (tx) setTransactions(prev => [tx, ...prev]);

    try {
      const [memberRes, stateRes] = await Promise.all([
        supabase.from("challenge_memberships").upsert({ user_id: uid, challenge_id: id, entry_coins: entry }),
        supabase.from("user_app_state").update({ coins: newCoins, updated_at: new Date().toISOString() }).eq("user_id", uid),
      ]);
      if (memberRes.error) throw memberRes.error;
      if (stateRes.error)  throw stateRes.error;
      if (tx) {
        const txRes = await supabase.from("transactions").insert({ user_id: uid, label: tx.label, coins: entry, is_debit: true, emoji: "⚡", category: "Entry" });
        if (txRes.error) throw txRes.error;
      }
    } catch {
      // Roll back
      setCoins(coins);
      setJoined(s => { const n = new Set(s); n.delete(id); return n; });
      if (tx) setTransactions(prev => prev.filter(t => t.id !== tx.id));
      setActionError("Failed to join challenge. Check your connection and try again.");
    }
  }

  async function sendProof(id: number, imageUrl?: string) {
    const t = todayStr();
    const y = yesterdayStr();

    if (proofSent.has(id)) return;

    const allChalls    = [...createdChallenges, ...ALL_CHALLENGES];
    const ch           = allChalls.find(c => c.id === id);
    const alreadyToday = lastProofDate === t;

    let newStreak: number;
    if (alreadyToday) {
      newStreak = streak;
    } else if (!lastProofDate || lastProofDate === y) {
      newStreak = streak + 1;
    } else {
      newStreak = 1;
    }
    const newLongest = Math.max(longestStreak, newStreak);
    const newCoins   = coins + 50;

    const logEntry: ProofEntry = {
      challengeId:    id,
      challengeTitle: ch?.title ?? "Challenge",
      timestamp:      Date.now(),
      streak:         newStreak,
    };
    const proofTx: Transaction = {
      id: `proof-${id}-${Date.now()}`,
      label: `Proof · ${ch?.title ?? "Challenge"}`,
      coins: 50, isDebit: false, emoji: "📸", category: "Proof",
      timestamp: Date.now(),
    };

    // Optimistic update
    const prevCoins       = coins;
    const prevStreak      = streak;
    const prevLongest     = longestStreak;
    const prevLastProof   = lastProofDate;
    const prevProofSent   = new Set(proofSent);
    setProofLog(prev => [logEntry, ...prev.slice(0, 49)]);
    setProofSent(new Set([...proofSent, id]));
    setStreak(newStreak);
    setLongestStreak(newLongest);
    if (!alreadyToday) setLastProofDate(t);
    setCoins(newCoins);
    setTransactions(prev => [proofTx, ...prev]);

    const uid = uidRef.current;
    if (!uid) return;

    try {
      const [subRes, txRes, stateRes] = await Promise.all([
        supabase.from("proof_submissions").insert({
          user_id: uid, challenge_id: id,
          challenge_title: ch?.title ?? "Challenge",
          streak_at_time: newStreak,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        }),
        supabase.from("transactions").insert({
          user_id: uid, label: proofTx.label, coins: 50,
          is_debit: false, emoji: "📸", category: "Proof",
        }),
        supabase.from("user_app_state").update({
          coins: newCoins, streak: newStreak, longest_streak: newLongest,
          last_proof_date: t, updated_at: new Date().toISOString(),
        }).eq("user_id", uid),
      ]);
      if (subRes.error)   throw subRes.error;
      if (txRes.error)    throw txRes.error;
      if (stateRes.error) throw stateRes.error;
    } catch {
      // Roll back
      setCoins(prevCoins);
      setStreak(prevStreak);
      setLongestStreak(prevLongest);
      setLastProofDate(prevLastProof);
      setProofSent(prevProofSent);
      setProofLog(prev => prev.filter(e => e !== logEntry));
      setTransactions(prev => prev.filter(t => t.id !== proofTx.id));
      setActionError("Failed to submit proof. Check your connection and try again.");
    }
  }

  async function claimPrize(id: number, amount: number, title: string) {
    if (claimedChallenges.has(id)) return;

    // Optimistic update
    setClaimedChallenges(prev => new Set([...prev, id]));
    addCoins(amount, `Won ${title}`, "Win", "🏆");

    const uid = uidRef.current;
    if (!uid) return;

    try {
      const res = await supabase.from("claimed_challenges").insert({ user_id: uid, challenge_id: id, prize_coins: amount });
      if (res.error) throw res.error;
    } catch {
      // Roll back
      setClaimedChallenges(prev => { const n = new Set(prev); n.delete(id); return n; });
      setCoins(coins);
      setTransactions(prev => prev.filter(t => t.label !== `Won ${title}`));
      setActionError("Failed to claim prize. Check your connection and try again.");
    }
  }

  function addCoins(amount: number, label: string, category: Transaction["category"], emoji = "💰") {
    const newCoins = coins + amount;
    setCoins(newCoins);
    const tx: Transaction = {
      id: `coin-${Date.now()}`, label, coins: amount,
      isDebit: false, emoji, category, timestamp: Date.now(),
    };
    setTransactions(prev => [tx, ...prev]);

    const uid = uidRef.current;
    if (!uid) return;

    supabase.from("transactions").insert({
      user_id: uid, label, coins: amount,
      is_debit: false, emoji, category,
    }).then(() => {});

    supabase.from("user_app_state").update({
      coins: newCoins, updated_at: new Date().toISOString(),
    }).eq("user_id", uid).then(() => {});
  }

  async function activateShield(id: number) {
    if (shields < 1 || shielded.has(id)) return;
    const newShields = shields - 1;

    // Optimistic update
    setShields(newShields);
    setShielded(s => new Set([...s, id]));
    setRecovering(s => { const n = new Set(s); n.delete(id); return n; });

    const uid = uidRef.current;
    if (!uid) return;

    try {
      const [shieldRes, stateRes] = await Promise.all([
        supabase.from("shielded_challenges").insert({ user_id: uid, challenge_id: id }),
        supabase.from("user_app_state").update({ shields: newShields, updated_at: new Date().toISOString() }).eq("user_id", uid),
      ]);
      if (shieldRes.error) throw shieldRes.error;
      if (stateRes.error)  throw stateRes.error;
    } catch {
      // Roll back
      setShields(shields);
      setShielded(s => { const n = new Set(s); n.delete(id); return n; });
      setActionError("Failed to activate shield. Check your connection and try again.");
    }
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
      creator:    { name: config.creatorName || "ELVN Member", initials: config.creatorInitials || "EM", bg: "linear-gradient(135deg,#7A4A18,#3A2008)" },
      isPublic:   config.isPublic,
      inviteCode: config.isPublic ? undefined : generateInviteCode(),
      memberCap:  config.memberCap,
      stepGoal:   config.stepGoal > 0 ? config.stepGoal : undefined,
    };

    const newCoins = config.entry > 0 ? coins - config.entry : coins;
    if (config.entry > 0) setCoins(newCoins);
    setJoined(s => new Set([...s, id]));
    setCreatedChallenges(prev => [challenge, ...prev]);

    const uid = uidRef.current;
    if (!uid) return challenge;

    supabase.from("created_challenges").insert({ id, user_id: uid, data: challenge }).then(() => {});
    supabase.from("challenge_memberships").insert({ user_id: uid, challenge_id: id, entry_coins: config.entry }).then(() => {});
    if (config.entry > 0) {
      supabase.from("user_app_state").update({
        coins: newCoins, updated_at: new Date().toISOString(),
      }).eq("user_id", uid).then(() => {});
    }

    return challenge;
  }

  return (
    <Ctx.Provider value={{
      coins, streak, longestStreak, lastProofDate, provedToday,
      proofLog, transactions, joined, recovering, proofSent, shielded, shields,
      createdChallenges, claimedChallenges,
      actionError, clearActionError,
      joinChallenge, sendProof, activateShield, createChallenge, addCoins, claimPrize,
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
