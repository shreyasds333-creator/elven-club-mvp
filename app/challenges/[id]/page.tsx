"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { color, radius, typo, space, motion, tierStyle } from "@/lib/tokens";
import { ALL_CHALLENGES, fmt, fmtCoins, rgb, PROOF_ICON, timeToMidnight, timeToMidnightRaw, type Challenge } from "@/lib/challengeData";
import { useAppStore } from "@/lib/appStore";
import { useAuth } from "@/lib/authStore";
import ProofCamera from "@/app/components/ProofCamera";
import { supabase } from "@/lib/supabaseClient";

// ─── Leaderboard mock ────────────────────────────────────────────────────────
const LB = [
  { rank: 1, name: "Priya K.",  initials: "PK", bg: "linear-gradient(135deg,#145C38,#062010)", streak: 28, pct: 93, estWin: 12400, isMe: false },
  { rank: 2, name: "Arjun S.", initials: "AS", bg: "linear-gradient(135deg,#7A4A18,#3A2008)", streak: 25, pct: 83, estWin: 8200,  isMe: false },
  { rank: 3, name: "Rahul D.", initials: "RD", bg: "linear-gradient(135deg,#1A3A6A,#081528)", streak: 22, pct: 73, estWin: 4100,  isMe: false },
  { rank: 4, name: "You",      initials: "ME", bg: "linear-gradient(135deg,#4A306A,#1C0E28)", streak: 11, pct: 37, estWin: 0,     isMe: true  },
  { rank: 5, name: "Nisha R.", initials: "NR", bg: "linear-gradient(135deg,#6A2A10,#2A0E06)", streak: 9,  pct: 30, estWin: 0,     isMe: false },
];

// ─── Activity feed mock ───────────────────────────────────────────────────────
type FeedItem =
  | { type: "proof" | "shield" | "join-user"; initials: string; bg: string; name: string; action: string; time: string }
  | { type: "system"; text: string; time: string };

const FEED: FeedItem[] = [
  { type: "proof",     initials: "PK", bg: "linear-gradient(135deg,#145C38,#062010)", name: "Priya K.",  action: "submitted morning run proof 🏃", time: "2m" },
  { type: "shield",    initials: "AS", bg: "linear-gradient(135deg,#7A4A18,#3A2008)", name: "Arjun S.", action: "activated ELVN Shield 🛡️",        time: "18m" },
  { type: "proof",     initials: "NR", bg: "linear-gradient(135deg,#6A2A10,#2A0E06)", name: "Nisha R.", action: "logged day 9 check-in ✓",          time: "34m" },
  { type: "system",    text: "12 athletes joined today",                                                                                             time: "" },
  { type: "join-user", initials: "VM", bg: "linear-gradient(135deg,#3A3080,#141228)", name: "Vikram M.", action: "just joined the challenge",       time: "1h" },
];

// ─── Recovery activities ──────────────────────────────────────────────────────
const RECOVERY = [
  { id: "meditation", emoji: "🧘", title: "5-min Meditation",    desc: "Clear your mind. Reset your energy." },
  { id: "breathing",  emoji: "🌬️", title: "4-7-8 Breathing",     desc: "4 in · 7 hold · 8 out. Nervous system reset." },
  { id: "reading",    emoji: "📖", title: "Recovery Reading",     desc: "Read about elite athlete recovery science." },
  { id: "podcast",    emoji: "🎧", title: "Wellness Podcast",     desc: "10 minutes of mindset and recovery audio." },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const c = ALL_CHALLENGES.find(ch => ch.id === parseInt(id));

  const router = useRouter();
  const store = useAppStore();
  const { user: authUser } = useAuth();
  const walletBalance  = store.coins;
  const joined         = store.joined.has(c?.id ?? -1);
  const proofSent      = store.proofSent.has(c?.id ?? -1);
  const recoveryActive = store.recovering.has(c?.id ?? -1);
  const shieldActive   = store.shielded.has(c?.id ?? -1);
  const globalShields  = store.shields;
  const claimed        = store.claimedChallenges.has(c?.id ?? -1);

  const [joining,    setJoining]    = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);
  const [showProof,  setShowProof]  = useState(false);
  const [showShield, setShowShield] = useState(false);
  const [showClaim,  setShowClaim]  = useState(false);
  const [countdown, setCountdown] = useState(() => {
    const { h, m, s } = timeToMidnightRaw();
    return { d: c?.daysLeft ?? 0, h, m, s };
  });

  const [realFeed,         setRealFeed]         = useState<{ initials: string; bg: string; name: string; action: string; time: string }[]>([]);
  const [realParticipants, setRealParticipants] = useState<number | null>(null);
  const [creatorId,        setCreatorId]        = useState<string | null>(null);
  const [showDelete,       setShowDelete]       = useState(false);
  const [deleting,         setDeleting]         = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(p => {
        let { d, h, m, s } = p;
        s--; if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; d--; }
        if (d < 0) return p;
        return { d, h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const challengeId = parseInt(id);
    if (isNaN(challengeId)) return;

    supabase
      .from("proof_submissions")
      .select("created_at, challenge_title, user_id, profiles(name, initials)")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (!data?.length) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRealFeed((data as any[]).map(row => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return {
            initials: profile?.initials ?? "??",
            bg:       "linear-gradient(135deg,#145C38,#062010)",
            name:     profile?.name ?? "Member",
            action:   "submitted proof ✓",
            time:     relTime(row.created_at),
          };
        }));
      });

    supabase
      .from("challenge_memberships")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", challengeId)
      .then(({ count }) => { if (count !== null) setRealParticipants(count); });

    supabase
      .from("challenges")
      .select("creator_id")
      .eq("id", challengeId)
      .single()
      .then(({ data }) => { if (data?.creator_id) setCreatorId(data.creator_id); });
  }, [id]);

  if (!c) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: color.text.secondary }}>
      <span style={{ fontSize: 32 }}>🔍</span>
      <span>Challenge not found</span>
      <Link href="/challenges" style={{ color: color.gold.bright, fontSize: "0.875rem" }}>← Back to Challenges</Link>
    </div>
  );

  const dayNum           = c.duration - c.daysLeft;
  const completionPct    = Math.round((dayNum / c.duration) * 100);
  const isShieldEligible = c.duration >= 14;
  const canAfford        = walletBalance >= c.entry;
  const tier             = tierStyle[c.tier];
  const prizeAmount      = Math.round(c.prize * 0.80 / c.winnersCount);
  const canClaimPrize    = joined && proofSent && !claimed;

  function handleJoinConfirm() {
    if (!canAfford || !c) return;
    setShowJoin(false);
    setJoining(true);
    setTimeout(() => { setJoining(false); store.joinChallenge(c!.id, c!.entry); }, 1400);
  }

  function handleProofSubmit() {
    store.sendProof(c!.id);
    setTimeout(() => setShowProof(false), 1800);
  }

  function handleShieldActivate() {
    if (store.shields < 1) return;
    store.activateShield(c!.id);
    setShowShield(false);
  }

  function handleClaimPrize() {
    store.claimPrize(c!.id, prizeAmount, c!.title);
    setShowClaim(false);
  }

  async function handleDelete() {
    if (!c) return;
    setDeleting(true);
    await supabase.from("challenges").delete().eq("id", c.id);
    router.replace("/challenges");
  }

  const accentClr = shieldActive ? "#6098D8" : c.accentColor;

  return (
    <div style={{ background: color.bg.base, minHeight: "100%", paddingBottom: 120, position: "relative" }}>

      {/* ── Cinematic Header Banner ─────────────────────────────────────── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: c.cardBg,
        padding: `20px ${space.screenX}px 24px`,
        minHeight: 260,
      }}>
        {/* Atmosphere layers */}
        <div style={{ position: "absolute", inset: -20, pointerEvents: "none", zIndex: 1, background: `radial-gradient(ellipse 90% 80% at 20% 30%, rgba(${rgb(c.accentColor)},0.28) 0%, transparent 60%)`, animation: "atmoPulse 5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "50%", pointerEvents: "none", zIndex: 2, background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.03) 50%,transparent 100%)", animation: "lightSweep 9s ease-in-out infinite" }} />
        <div style={{ position: "absolute", right: -20, bottom: -10, fontSize: 200, opacity: 0.038, zIndex: 3, pointerEvents: "none", animation: "silDrift 9s ease-in-out infinite", filter: "blur(3px)", lineHeight: 1 }}>{c.emoji}</div>
        {c.isLive && <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", border: `1.5px solid rgba(${rgb(c.accentColor)},0.28)`, animation: "borderPulse 3.5s ease-out infinite" }} />}

        <div style={{ position: "relative", zIndex: 10 }}>
          {/* Back + wallet row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <Link href="/challenges" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: radius.full, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.10)", textDecoration: "none" }}>
              <span style={{ fontSize: 11, color: color.text.secondary }}>←</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: color.text.secondary }}>Challenges</span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: radius.full, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(226,190,116,0.22)" }}>
              <span style={{ fontSize: 10 }}>⟡</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: color.gold.bright }}>{fmtCoins(walletBalance)}</span>
              <span style={{ fontSize: "0.5625rem", color: color.text.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>coins</span>
            </div>
          </div>

          {/* Badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ padding: "4px 10px", borderRadius: radius.full, background: `rgba(${rgb(c.accentColor)},0.16)`, border: `1px solid rgba(${rgb(c.accentColor)},0.36)`, fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: c.accentColor }}>
              {c.duration}-Day
            </span>
            {c.isLive && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: radius.full, background: "rgba(77,200,122,0.12)", border: "1px solid rgba(77,200,122,0.30)" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite" }} />
                <span style={{ fontSize: "0.5rem", fontWeight: 700, color: "#4DC87A", letterSpacing: "0.08em", textTransform: "uppercase" }}>Live</span>
              </div>
            )}
            {isShieldEligible && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 9px", borderRadius: radius.full, background: "rgba(96,152,216,0.09)", border: "1px solid rgba(96,152,216,0.24)" }}>
                <span style={{ fontSize: 8 }}>🛡️</span>
                <span style={{ fontSize: "0.5rem", fontWeight: 700, color: "#6098D8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Shield</span>
              </div>
            )}
            <span style={{ padding: "4px 10px", borderRadius: radius.full, background: tier.bg, border: `1px solid ${tier.border}`, fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: tier.text }}>
              {c.tier}
            </span>
            {joined && (
              <span style={{ padding: "4px 10px", borderRadius: radius.full, background: `rgba(${rgb(accentClr)},0.14)`, border: `1px solid rgba(${rgb(accentClr)},0.36)`, fontSize: "0.5625rem", fontWeight: 700, color: accentClr }}>
                ✓ Active
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.048em", color: color.text.primary, margin: "0 0 6px", lineHeight: 1, maxWidth: "76%" }}>
            {c.title}
          </h1>
          <p style={{ fontSize: "0.875rem", color: color.text.secondary, margin: "0 0 14px", lineHeight: 1.55, maxWidth: "76%" }}>
            {c.tagline}
          </p>

          {/* Creator byline */}
          {c.creator && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "8px 12px", borderRadius: radius.md, background: "rgba(0,0,0,0.30)", border: `1px solid ${color.border.subtle}`, alignSelf: "flex-start", width: "fit-content" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: c.creator.bg, border: `1.5px solid ${color.border.strong}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.4375rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{c.creator.initials}</div>
              <div>
                <span style={{ fontSize: "0.6875rem", color: color.text.secondary }}>Hosted by </span>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: color.text.primary }}>{c.creator.name}</span>
                {c.creator.cred && <span style={{ fontSize: "0.6875rem", color: color.text.tertiary }}> · {c.creator.cred}</span>}
              </div>
            </div>
          )}

          {/* Prize + countdown */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
            <div>
              <span style={{ ...typo.label, color: color.text.muted, display: "block", marginBottom: 3 }}>Prize Pool</span>
              <span style={{ fontSize: "2.75rem", fontWeight: 900, color: c.accentColor, letterSpacing: "-0.058em", lineHeight: 1, display: "block", animation: "prizeGlow 3.8s ease-in-out infinite" }}>{fmt(c.prize)}</span>
            </div>
            <div style={{ paddingBottom: 4 }}>
              <span style={{ ...typo.label, color: color.text.muted, display: "block", marginBottom: 3 }}>Ends in</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                {[
                  { v: countdown.d,  u: "d" },
                  { v: countdown.h,  u: "h" },
                  { v: countdown.m,  u: "m" },
                  { v: countdown.s,  u: "s" },
                ].map(({ v, u }) => (
                  <span key={u} style={{ fontSize: "1.125rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.04em" }}>
                    {String(v).padStart(2, "0")}<span style={{ fontSize: "0.5625rem", color: color.text.muted, marginLeft: 1 }}>{u}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick stats row ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", margin: `0 ${space.screenX}px`, marginTop: 16, borderRadius: radius.lg, background: color.bg.card, border: `1px solid ${color.border.subtle}`, overflow: "hidden" }}>
        {[
          { label: "Entry", value: fmt(c.entry), sub: `⟡ ${fmtCoins(c.entry)} coins` },
          { label: "Members", value: `${realParticipants ?? c.participants}/${c.maxParticipants}`, sub: `${c.maxParticipants - (realParticipants ?? c.participants)} spot${c.maxParticipants - (realParticipants ?? c.participants) !== 1 ? "s" : ""} left` },
          { label: "Days Left", value: `${c.daysLeft}d`, sub: `${c.duration}d total` },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "14px 0", textAlign: "center", borderRight: i < 2 ? `1px solid ${color.border.faint}` : "none" }}>
            <span style={{ fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.text.muted, display: "block", marginBottom: 4 }}>{s.label}</span>
            <span style={{ fontSize: "1.125rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.04em", display: "block", lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: "0.5625rem", color: color.text.tertiary, display: "block", marginTop: 3 }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Proof type + social strip ────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: `12px ${space.screenX}px 0` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: radius.full, background: "rgba(255,255,255,0.04)", border: `1px solid ${color.border.subtle}` }}>
          <span style={{ fontSize: 10 }}>{PROOF_ICON[c.proofType] ?? "📸"}</span>
          <span style={{ fontSize: "0.6875rem", color: color.text.secondary }}>{c.proofType}</span>
        </div>
        {c.minStreak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: radius.full, background: "rgba(224,120,64,0.07)", border: "1px solid rgba(224,120,64,0.18)" }}>
            <span style={{ fontSize: 9 }}>🔥</span>
            <span style={{ fontSize: "0.6875rem", color: "#E07840" }}>{c.minStreak}d streak req.</span>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.625rem", color: "#4DC87A", fontWeight: 600 }}>{c.joinedToday} joined today</span>
        </div>
      </div>

      {/* ── Progress Section (if joined) ──────────────────────────────────────── */}
      {joined && (
        <div style={{ margin: `16px ${space.screenX}px 0`, padding: "16px", borderRadius: radius.lg, background: color.bg.card, border: `1px solid rgba(${rgb(accentClr)},0.22)`, boxShadow: `0 0 24px rgba(${rgb(accentClr)},0.07)`, animation: "springIn 0.36s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <span style={{ ...typo.label, color: color.text.muted, display: "block", marginBottom: 4 }}>Your Progress</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: "1.75rem", fontWeight: 900, color: color.text.primary, letterSpacing: "-0.05em", lineHeight: 1 }}>Day {dayNum}</span>
                <span style={{ fontSize: "0.875rem", color: color.text.tertiary }}>of {c.duration}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: radius.md, background: "rgba(224,120,64,0.10)", border: "1px solid rgba(224,120,64,0.22)" }}>
                <span style={{ fontSize: 13 }}>🔥</span>
                <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#E07840", letterSpacing: "-0.04em" }}>{store.streak}</span>
                <span style={{ fontSize: "0.5625rem", color: "rgba(224,120,64,0.65)" }}>streak</span>
              </div>
            </div>
          </div>

          {/* Completion bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.625rem", color: color.text.tertiary }}>Completion</span>
              <span style={{ fontSize: "0.625rem", fontWeight: 700, color: accentClr }}>{completionPct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completionPct}%`, borderRadius: 3, background: `linear-gradient(90deg, rgba(${rgb(accentClr)},0.7), ${accentClr})`, boxShadow: `0 0 8px rgba(${rgb(accentClr)},0.6)`, transition: "width 0.6s ease" }} />
            </div>
          </div>

          {/* Daily timeline dots */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: "0.5625rem", color: color.text.muted, display: "block", marginBottom: 6 }}>Daily Check-ins</span>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {Array.from({ length: Math.min(c.duration, 20) }, (_, i) => {
                const day       = i + 1;
                const isDone    = day <= dayNum && day !== 4;
                const isMissed  = day === 4;
                const isToday   = day === dayNum;
                const isFuture  = day > dayNum;
                return (
                  <div key={i} style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: isMissed ? "rgba(224,120,64,0.15)"
                      : isDone ? `rgba(${rgb(accentClr)},0.22)`
                      : isToday ? `rgba(${rgb(accentClr)},0.30)`
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isMissed ? "rgba(224,120,64,0.36)"
                      : isDone ? `rgba(${rgb(accentClr)},0.44)`
                      : isToday ? `rgba(${rgb(accentClr)},0.60)`
                      : "rgba(255,255,255,0.06)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8,
                    boxShadow: isToday ? `0 0 8px rgba(${rgb(accentClr)},0.35)` : "none",
                  }}>
                    {isMissed ? "⚡" : isDone || isToday ? "✓" : isFuture ? "" : ""}
                  </div>
                );
              })}
              {c.duration > 20 && <span style={{ fontSize: "0.5625rem", color: color.text.muted, alignSelf: "center" }}>+{c.duration - 20} more</span>}
            </div>
          </div>

          {/* Momentum message */}
          {!recoveryActive && !shieldActive && (
            <div style={{ padding: "9px 12px", borderRadius: radius.md, background: `rgba(${rgb(accentClr)},0.07)`, border: `1px solid rgba(${rgb(accentClr)},0.18)`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12 }}>⚡</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: accentClr }}>You're on track.</span>
              <span style={{ fontSize: "0.6875rem", color: color.text.tertiary }}>Keep the streak alive.</span>
            </div>
          )}
          {recoveryActive && !shieldActive && (
            <div style={{ padding: "9px 12px", borderRadius: radius.md, background: "rgba(224,120,64,0.08)", border: "1px solid rgba(224,120,64,0.26)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 12, animation: "urgencyPulse 1.6s ease-in-out infinite" }}>⚠️</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#E07840" }}>Recovery window open</span>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#E07840", animation: "urgencyPulse 1.6s ease-in-out infinite" }}>{timeToMidnight()}</span>
            </div>
          )}
          {shieldActive && (
            <div style={{ padding: "9px 12px", borderRadius: radius.md, background: "rgba(96,152,216,0.09)", border: "1px solid rgba(96,152,216,0.24)", display: "flex", alignItems: "center", gap: 7, animation: "shieldEntry 0.45s cubic-bezier(.175,.885,.32,1.275) both" }}>
              <span style={{ fontSize: 14 }}>🛡️</span>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6098D8", display: "block", lineHeight: 1.2 }}>ELVN Shield protected your streak</span>
                <span style={{ fontSize: "0.5625rem", color: "rgba(96,152,216,0.65)" }}>Recovery is discipline. Back tomorrow.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Leaderboard ───────────────────────────────────────────────────────── */}
      <SectionTitle title="Leaderboard" icon="🏆" />
      <div style={{ margin: `0 ${space.screenX}px`, borderRadius: radius.lg, background: color.bg.card, border: `1px solid ${color.border.subtle}`, overflow: "hidden" }}>
        {LB.map((row, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
            borderBottom: i < LB.length - 1 ? `1px solid ${color.border.faint}` : "none",
            background: row.isMe ? `rgba(${rgb(c.accentColor)},0.06)` : "transparent",
            position: "relative",
          }}>
            {row.isMe && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: c.accentColor, borderRadius: "2px 0 0 2px" }} />}
            {/* Rank */}
            <div style={{ width: 24, textAlign: "center", flexShrink: 0 }}>
              {row.rank <= 3 ? (
                <span style={{ fontSize: 13 }}>{["🥇","🥈","🥉"][row.rank-1]}</span>
              ) : (
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: color.text.muted }}>#{row.rank}</span>
              )}
            </div>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: row.bg, border: row.isMe ? `1.5px solid rgba(${rgb(c.accentColor)},0.50)` : `1.5px solid ${color.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: row.isMe ? `0 0 10px rgba(${rgb(c.accentColor)},0.25)` : "none" }}>
              {row.isMe ? (authUser?.initials ?? "?") : row.initials}
            </div>
            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "0.875rem", fontWeight: row.isMe ? 800 : 600, color: row.isMe ? color.text.primary : color.text.secondary, display: "block", lineHeight: 1.2, letterSpacing: "-0.01em" }}>{row.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 8 }}>🔥</span>
                <span style={{ fontSize: "0.5625rem", color: "#E07840", fontWeight: 700 }}>{row.isMe ? store.streak : row.streak}d</span>
                <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>·</span>
                <span style={{ fontSize: "0.5625rem", color: color.text.tertiary }}>{row.isMe ? Math.min(Math.round((store.streak / c.duration) * 100), 99) : row.pct}% done</span>
              </div>
            </div>
            {/* Est. winnings */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {row.estWin > 0 ? (
                <>
                  <span style={{ fontSize: "0.875rem", fontWeight: 800, color: c.accentColor, letterSpacing: "-0.03em", display: "block", lineHeight: 1 }}>{fmt(row.estWin)}</span>
                  <span style={{ fontSize: "0.5rem", color: color.text.muted }}>est. win</span>
                </>
              ) : (
                <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Social Activity Feed ──────────────────────────────────────────────── */}
      <SectionTitle title="Live Activity" icon="●" iconColor="#4DC87A" animate />
      <div style={{ margin: `0 ${space.screenX}px`, borderRadius: radius.lg, background: color.bg.card, border: `1px solid ${color.border.subtle}`, overflow: "hidden" }}>
        {(realFeed.length > 0
          ? realFeed.map(r => ({ type: "proof" as const, ...r }))
          : [...FEED, ...(c.recentProofs.slice(0,2).map(p => ({
              type: "proof" as const, initials: p.initials, bg: p.bg, name: p.initials, action: p.action, time: p.timeAgo,
            })))]
        ).slice(0, 6).map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: i < 5 ? `1px solid ${color.border.faint}` : "none", animation: `feedIn 0.28s ease ${i * 0.05}s both` }}>
            {item.type === "system" ? (
              <>
                <div style={{ width: 28, height: 28, borderRadius: radius.sm, background: "rgba(77,200,122,0.10)", border: "1px solid rgba(77,200,122,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11 }}>👥</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: color.text.secondary, flex: 1 }}>{item.text}</span>
                <span style={{ fontSize: "0.5625rem", color: "#4DC87A", fontWeight: 600, flexShrink: 0 }}>today</span>
              </>
            ) : (
              <>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: item.bg, border: `1.5px solid ${color.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.4375rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {item.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "0.75rem", color: color.text.secondary }}>
                    <span style={{ fontWeight: 700, color: color.text.primary }}>{item.name}</span> {item.action}
                  </span>
                </div>
                {item.type === "shield" ? (
                  <span style={{ fontSize: "0.5rem", color: "#6098D8", fontWeight: 600, flexShrink: 0 }}>{item.time} ago</span>
                ) : (
                  <span style={{ fontSize: "0.5rem", color: color.text.muted, flexShrink: 0 }}>{item.time} ago</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Shield Status ─────────────────────────────────────────────────────── */}
      {isShieldEligible && (
        <>
          <SectionTitle title="ELVN Shield" icon="🛡️" />
          <div style={{ margin: `0 ${space.screenX}px`, padding: "16px", borderRadius: radius.lg, background: shieldActive ? "rgba(96,152,216,0.07)" : color.bg.card, border: `1px solid ${shieldActive ? "rgba(96,152,216,0.30)" : color.border.subtle}`, boxShadow: shieldActive ? "0 0 28px rgba(96,152,216,0.12)" : "none", transition: "all 0.4s ease", animation: shieldActive ? "shieldGlow 2.8s ease-in-out infinite" : "none" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: color.text.primary, marginBottom: 2 }}>
                  {shieldActive ? "Shield Active" : "Shield Eligible"}
                </div>
                <div style={{ fontSize: "0.6875rem", color: color.text.tertiary }}>
                  {shieldActive ? "Your streak is protected for today" : "14+ day challenges only · 2 free/month"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: radius.sm, background: i < globalShields ? "rgba(96,152,216,0.18)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${i < globalShields ? "rgba(96,152,216,0.44)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, boxShadow: i < globalShields ? "0 0 10px rgba(96,152,216,0.24)" : "none", transition: "all 0.35s ease" }}>
                    {i < globalShields ? "🛡️" : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Status strip */}
            {shieldActive ? (
              <div style={{ padding: "10px 14px", borderRadius: radius.md, background: "rgba(96,152,216,0.11)", border: "1px solid rgba(96,152,216,0.28)", display: "flex", alignItems: "center", gap: 8, animation: "shieldEntry 0.45s ease both" }}>
                <span style={{ fontSize: 16 }}>🛡️</span>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6098D8", lineHeight: 1.2 }}>ELVN Shield active</div>
                  <div style={{ fontSize: "0.5625rem", color: "rgba(96,152,216,0.65)" }}>Streak frozen for 24h. Recovery counts as discipline.</div>
                </div>
              </div>
            ) : recoveryActive && joined ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowShield(true)} disabled={globalShields < 1}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: radius.md, cursor: globalShields < 1 ? "not-allowed" : "pointer", background: globalShields > 0 ? "rgba(96,152,216,0.13)" : "rgba(255,255,255,0.04)", border: `1px solid ${globalShields > 0 ? "rgba(96,152,216,0.34)" : "rgba(255,255,255,0.08)"}`, opacity: globalShields < 1 ? 0.48 : 1 }}>
                  <span style={{ fontSize: 14 }}>🛡️</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: globalShields > 0 ? "#6098D8" : color.text.muted, lineHeight: 1.1 }}>Activate Shield</div>
                    <div style={{ fontSize: "0.5rem", color: "rgba(96,152,216,0.55)" }}>{globalShields} left · resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                </button>
                <button onClick={() => setShowProof(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: radius.md, background: "rgba(77,200,122,0.09)", border: "1px solid rgba(77,200,122,0.26)", cursor: "pointer" }}>
                  <span style={{ fontSize: 14 }}>📸</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4DC87A" }}>Post Proof</span>
                </button>
              </div>
            ) : (
              <div style={{ padding: "9px 14px", borderRadius: radius.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${color.border.faint}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10 }}>ℹ️</span>
                <span style={{ fontSize: "0.6875rem", color: color.text.tertiary }}>If you miss a day, you can activate a Shield to protect your streak instead of losing progress.</span>
              </div>
            )}

            {/* Shields remaining label */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>{globalShields} shield{globalShields !== 1 ? "s" : ""} remaining · Resets Jun 1</span>
              {globalShields < 2 && <span style={{ fontSize: "0.5625rem", color: "rgba(96,152,216,0.55)" }}>Extra shields → Premium (coming soon)</span>}
            </div>
          </div>
        </>
      )}

      {/* ── Prize Split Section ───────────────────────────────────────────────── */}
      <SectionTitle title="Prize Split" icon="⟡" />
      <div style={{ margin: `0 ${space.screenX}px`, padding: "18px", borderRadius: radius.lg, background: color.bg.card, border: `1px solid ${color.border.subtle}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: "2rem", fontWeight: 900, color: c.accentColor, letterSpacing: "-0.05em", lineHeight: 1 }}>{fmt(c.prize)}</span>
          <span style={{ fontSize: "0.75rem", color: color.text.muted }}>total prize pool</span>
        </div>

        {/* Split bar */}
        <div style={{ height: 7, borderRadius: 4, overflow: "hidden", display: "flex", marginBottom: 14 }}>
          <div style={{ width: "5%",  background: "#8B8BDE" }} />
          <div style={{ width: "15%", background: "#E2BE74", marginLeft: 1 }} />
          <div style={{ width: "80%", background: c.accentColor, marginLeft: 1 }} />
        </div>

        {/* Breakdown rows */}
        {[
          { label: "Creator Reward",  pct: 5,  color: "#8B8BDE", amount: c.prize * 0.05, desc: "Challenge creator" },
          { label: "ELVN Platform",   pct: 15, color: "#E2BE74", amount: c.prize * 0.15, desc: "Platform & operations" },
          { label: "Winners Pool",    pct: 80, color: c.accentColor, amount: c.prize * 0.80, desc: "Split among top completers" },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
            <div style={{ width: 3, height: 28, borderRadius: 2, background: row.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: color.text.primary, lineHeight: 1.2 }}>{row.label}</div>
              <div style={{ fontSize: "0.5625rem", color: color.text.muted }}>{row.desc}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 800, color: row.color, letterSpacing: "-0.03em" }}>{fmt(row.amount)}</div>
              <div style={{ fontSize: "0.5rem", color: color.text.muted }}>{row.pct}%</div>
            </div>
          </div>
        ))}

        {/* Your potential winnings */}
        {joined && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: radius.md, background: `rgba(${rgb(c.accentColor)},0.07)`, border: `1px solid rgba(${rgb(c.accentColor)},0.20)` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.6875rem", color: color.text.secondary }}>Your potential winnings</span>
              <span style={{ fontSize: "1.125rem", fontWeight: 800, color: c.accentColor, letterSpacing: "-0.04em" }}>
                {fmt(Math.round(c.prize * 0.8 / c.winnersCount))}
              </span>
            </div>
            <div style={{ fontSize: "0.5625rem", color: color.text.muted, marginTop: 2 }}>Split among top {c.winnersCount} completers · increases if fewer finish</div>
          </div>
        )}
      </div>

      {/* ── Delete (creator only, 0 participants) ───────────────────────────── */}
      {authUser?.id && authUser.id === creatorId && (realParticipants ?? 1) === 0 && (
        <div style={{ padding: `0 ${space.screenX}px`, marginTop: 24 }}>
          <button
            onClick={() => setShowDelete(true)}
            style={{ width: "100%", padding: "13px", borderRadius: radius.lg, background: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,60,60,0.18)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,80,80,0.70)", letterSpacing: "0.01em" }}
          >
            Delete Challenge
          </button>
        </div>
      )}

      {/* ── Spacer ────────────────────────────────────────────────────────────── */}
      <div style={{ height: 20 }} />

      {/* ── Sticky Bottom CTA ─────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", bottom: 0, zIndex: 40,
        padding: `10px ${space.screenX}px 12px`,
        background: "linear-gradient(0deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.82) 100%)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${color.border.subtle}`,
      }}>
        {joining ? (
          <div style={{ padding: "14px", borderRadius: radius.lg, background: "rgba(226,190,116,0.10)", border: "1px solid rgba(226,190,116,0.32)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, animation: "youreIn 1.4s ease both" }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: color.gold.bright, letterSpacing: "-0.02em", lineHeight: 1.1 }}>You're in.</div>
              <div style={{ fontSize: "0.6875rem", color: "rgba(226,190,116,0.65)", marginTop: 2 }}>⟡ {c.entry.toLocaleString("en-IN")} coins committed</div>
            </div>
          </div>
        ) : joined && claimed ? (
          <div style={{ padding: "14px", borderRadius: radius.lg, background: "rgba(77,200,122,0.09)", border: "1px solid rgba(77,200,122,0.26)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#4DC87A", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Prize claimed</div>
              <div style={{ fontSize: "0.6875rem", color: "rgba(77,200,122,0.55)", marginTop: 2 }}>⟡ {prizeAmount.toLocaleString("en-IN")} coins deposited to vault</div>
            </div>
          </div>
        ) : joined ? (
          canClaimPrize ? (
            <button onClick={() => setShowClaim(true)} style={{ width: "100%", padding: "15px", borderRadius: radius.lg, background: "linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 32px rgba(201,168,76,0.50), inset 0 1px 0 rgba(255,255,255,0.20)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "32%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", animation: "shimmer 2.4s ease-in-out infinite" }} />
              <span style={{ fontSize: 16, position: "relative" }}>🏆</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: 900, color: "#000", letterSpacing: "0.06em", textTransform: "uppercase", position: "relative" }}>Claim Prize</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgba(0,0,0,0.55)", position: "relative" }}>· {fmt(prizeAmount)}</span>
            </button>
          ) : shieldActive ? (
            <div style={{ padding: "14px", borderRadius: radius.lg, background: "rgba(96,152,216,0.10)", border: "1px solid rgba(96,152,216,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, animation: "shieldEntry 0.45s ease both" }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#6098D8" }}>ELVN Shield Protected Your Streak</span>
            </div>
          ) : proofSent ? (
            <div style={{ padding: "14px", borderRadius: radius.lg, background: "rgba(77,200,122,0.09)", border: "1px solid rgba(77,200,122,0.24)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>✓</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#4DC87A" }}>Proof sent · Day {dayNum} complete</span>
            </div>
          ) : recoveryActive ? (
            <div style={{ display: "flex", gap: 8 }}>
              {isShieldEligible && (
                <button onClick={() => setShowShield(true)} disabled={globalShields < 1}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px", borderRadius: radius.lg, cursor: globalShields < 1 ? "not-allowed" : "pointer", background: globalShields > 0 ? "rgba(96,152,216,0.13)" : "rgba(255,255,255,0.04)", border: `1px solid ${globalShields > 0 ? "rgba(96,152,216,0.36)" : "rgba(255,255,255,0.08)"}`, opacity: globalShields < 1 ? 0.48 : 1 }}>
                  <span style={{ fontSize: 14 }}>🛡️</span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: globalShields > 0 ? "#6098D8" : color.text.muted }}>Use Shield</span>
                </button>
              )}
              <button onClick={() => setShowProof(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px", borderRadius: radius.lg, background: "rgba(77,200,122,0.11)", border: "1px solid rgba(77,200,122,0.30)", cursor: "pointer" }}>
                <span style={{ fontSize: 14 }}>📸</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#4DC87A" }}>Post Proof</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setShowProof(true)} style={{ width: "100%", padding: "15px", borderRadius: radius.lg, background: "rgba(77,200,122,0.12)", border: "1px solid rgba(77,200,122,0.32)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📸</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#4DC87A", letterSpacing: "0.03em" }}>Post Proof</span>
            </button>
          )
        ) : canAfford ? (
          <button onClick={() => setShowJoin(true)} style={{ width: "100%", padding: "15px", borderRadius: radius.lg, background: "linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 32px rgba(201,168,76,0.44), inset 0 1px 0 rgba(255,255,255,0.18)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "32%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)", animation: "shimmer 3s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.9375rem", fontWeight: 900, color: "#000", letterSpacing: "0.08em", textTransform: "uppercase", position: "relative" }}>Join Room</span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgba(0,0,0,0.58)", position: "relative" }}>· {fmt(c.entry)}</span>
          </button>
        ) : (
          <div style={{ padding: "14px", borderRadius: radius.lg, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: "0.875rem", color: color.text.muted }}>⟡ Insufficient coins · Need {fmt(c.entry)}</span>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {showJoin   && <JoinModal   c={c} walletBalance={walletBalance} onConfirm={handleJoinConfirm} onClose={() => setShowJoin(false)} />}
      {showProof  && <ProofModal  c={c} dayNum={dayNum} proofSent={proofSent} onSubmit={handleProofSubmit} onClose={() => setShowProof(false)} />}
      {showShield && <ShieldModal globalShields={globalShields} onActivate={handleShieldActivate} onClose={() => setShowShield(false)} />}
      {showClaim  && <ClaimModal  c={c} prizeAmount={prizeAmount} onClaim={handleClaimPrize} onClose={() => setShowClaim(false)} />}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "flex-end" }} onClick={() => setShowDelete(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#0A0A0D", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", borderRadius: "20px 20px 0 0", padding: "24px 20px calc(env(safe-area-inset-bottom,0px) + 28px)" }}>
            <p style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Delete this challenge?</p>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.42)", margin: "0 0 24px", lineHeight: 1.55 }}>
              This cannot be undone. The challenge will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: "14px", borderRadius: radius.lg, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.60)", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "14px", borderRadius: radius.lg, background: deleting ? "rgba(255,60,60,0.10)" : "rgba(255,60,60,0.18)", border: "1px solid rgba(255,60,60,0.36)", color: deleting ? "rgba(255,80,80,0.40)" : "rgba(255,80,80,0.90)", fontSize: "0.875rem", fontWeight: 800, cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes atmoPulse    { 0%,100%{opacity:0.70;transform:scale(1);} 50%{opacity:1;transform:scale(1.08);} }
        @keyframes lightSweep   { 0%,40%{transform:translateX(-130%);} 80%,100%{transform:translateX(340%);} }
        @keyframes silDrift     { 0%,100%{transform:rotate(-8deg) translateY(0);} 50%{transform:rotate(-8deg) translateY(-10px);} }
        @keyframes borderPulse  { 0%,100%{opacity:0.55;} 50%{opacity:0.07;} }
        @keyframes liveDot      { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.26;transform:scale(0.72);} }
        @keyframes prizeGlow    { 0%,100%{opacity:0.88;} 50%{opacity:1;filter:brightness(1.14);} }
        @keyframes urgencyPulse { 0%,100%{opacity:1;} 50%{opacity:0.38;} }
        @keyframes springIn     { 0%{opacity:0;transform:translateY(9px) scale(0.97);} 65%{opacity:1;transform:translateY(-1px) scale(1.005);} 100%{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes shimmer      { 0%,28%{transform:translateX(-200%);} 68%,100%{transform:translateX(460%);} }
        @keyframes youreIn      { 0%{opacity:0;transform:scale(0.92) translateY(4px);} 22%{opacity:1;transform:scale(1.02) translateY(-1px);} 78%{opacity:1;transform:scale(1) translateY(0);} 100%{opacity:0;transform:scale(0.98) translateY(-2px);} }
        @keyframes shieldEntry  { 0%{opacity:0;transform:scale(0.84);} 60%{opacity:1;transform:scale(1.06);} 100%{opacity:1;transform:scale(1);} }
        @keyframes shieldGlow   { 0%,100%{box-shadow:0 0 16px rgba(96,152,216,0.08);} 50%{box-shadow:0 0 32px rgba(96,152,216,0.22);} }
        @keyframes feedIn       { 0%{opacity:0;transform:translateX(-8px);} 100%{opacity:1;transform:translateX(0);} }
        @keyframes sheetUp      { 0%{transform:translateY(100%);} 100%{transform:translateY(0);} }
        @keyframes overlayIn    { 0%{opacity:0;} 100%{opacity:1;} }
        @keyframes proofSuccess { 0%{opacity:0;transform:scale(0.80);} 55%{opacity:1;transform:scale(1.06);} 100%{opacity:1;transform:scale(1);} }
        @keyframes activitySelect { 0%{transform:scale(1);} 50%{transform:scale(0.97);} 100%{transform:scale(1);} }
        @keyframes claimIn { 0%{opacity:0;transform:scale(0.72) translateY(8px);} 55%{opacity:1;transform:scale(1.04) translateY(-2px);} 100%{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes goldPulse { 0%,100%{opacity:0.88;filter:brightness(1);} 50%{opacity:1;filter:brightness(1.18);} }
      `}</style>
    </div>
  );
}

// ─── Section title helper ─────────────────────────────────────────────────────
function SectionTitle({ title, icon, iconColor, animate }: { title: string; icon: string; iconColor?: string; animate?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: `20px ${space.screenX}px 10px` }}>
      <span style={{ fontSize: icon.length > 1 ? 12 : 8, color: iconColor ?? color.text.muted, animation: animate ? "liveDot 1.8s ease-in-out infinite" : "none" }}>{icon}</span>
      <span style={{ ...typo.label, color: color.text.tertiary }}>{title}</span>
    </div>
  );
}

// ─── Join Modal ───────────────────────────────────────────────────────────────
function JoinModal({ c, walletBalance, onConfirm, onClose }: {
  c: Challenge; walletBalance: number; onConfirm: () => void; onClose: () => void;
}) {
  const canAfford     = walletBalance >= c.entry;
  const returnX       = Math.round(c.prize / c.entry);
  const spotsLeft     = c.maxParticipants - c.participants;
  const afterBalance  = walletBalance - c.entry;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, animation: "overlayIn 0.2s ease both" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: color.bg.deep, borderTop: `1px solid ${color.border.default}`,
        borderRadius: `${radius.xl} ${radius.xl} 0 0`,
        padding: `24px ${space.screenX}px calc(32px + env(safe-area-inset-bottom, 0px))`,
        animation: "sheetUp 0.32s cubic-bezier(.175,.885,.32,1.1) both",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: color.border.default, margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: radius.md, background: `rgba(${rgb(c.accentColor)},0.16)`, border: `1px solid rgba(${rgb(c.accentColor)},0.32)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.emoji}</div>
          <div>
            <div style={{ fontSize: "1.0625rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.025em" }}>{c.title}</div>
            <div style={{ fontSize: "0.6875rem", color: color.text.tertiary, marginTop: 2 }}>{c.duration}-day challenge · {c.tier}</div>
          </div>
        </div>

        {/* Financials */}
        <div style={{ borderRadius: radius.lg, background: color.bg.card, border: `1px solid ${color.border.subtle}`, overflow: "hidden", marginBottom: 16 }}>
          {[
            { label: "Entry Fee",       value: fmt(c.entry),         sub: `⟡ ${c.entry.toLocaleString("en-IN")} coins`,  color: color.gold.bright },
            { label: "Prize Pool",      value: fmt(c.prize),         sub: `Up to ${returnX}× your entry`,                color: c.accentColor },
            { label: "Your Wallet",     value: `⟡ ${fmtCoins(walletBalance)}`, sub: "current balance",                   color: color.text.primary },
            { label: "After Entry",     value: `⟡ ${fmtCoins(afterBalance)}`,  sub: "remaining balance",                 color: afterBalance < 0 ? "#E07840" : color.text.secondary },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < 3 ? `1px solid ${color.border.faint}` : "none" }}>
              <div>
                <div style={{ fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.text.muted }}>{row.label}</div>
                <div style={{ fontSize: "0.6875rem", color: color.text.tertiary, marginTop: 2 }}>{row.sub}</div>
              </div>
              <div style={{ fontSize: "1.0625rem", fontWeight: 800, color: row.color, letterSpacing: "-0.04em" }}>{row.value}</div>
            </div>
          ))}
        </div>

        {/* Member cap warning */}
        {spotsLeft <= 20 && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 13px", borderRadius: radius.md, background: "rgba(224,120,64,0.08)", border: "1px solid rgba(224,120,64,0.22)", marginBottom: 14 }}>
            <span style={{ fontSize: 11, animation: "urgencyPulse 1.6s ease-in-out infinite" }}>⚠️</span>
            <span style={{ fontSize: "0.6875rem", color: "#E07840" }}>Only {spotsLeft} spots left · {c.maxParticipants} max members</span>
          </div>
        )}

        {/* Commitment warning */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "9px 13px", borderRadius: radius.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${color.border.faint}`, marginBottom: 20 }}>
          <span style={{ fontSize: 11, marginTop: 1 }}>🔒</span>
          <span style={{ fontSize: "0.6875rem", color: color.text.muted, lineHeight: 1.5 }}>
            Coins are committed until the challenge ends. Complete daily proof to stay in the running.
          </span>
        </div>

        {/* CTAs */}
        <button
          onClick={onConfirm}
          disabled={!canAfford}
          style={{ width: "100%", padding: "15px", borderRadius: radius.lg, background: canAfford ? "linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)" : "rgba(255,255,255,0.05)", border: "none", cursor: canAfford ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: canAfford ? "0 4px 28px rgba(201,168,76,0.40)" : "none", marginBottom: 12, position: "relative", overflow: "hidden" }}>
          {canAfford && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "32%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)", animation: "shimmer 3s ease-in-out infinite" }} />}
          <span style={{ fontSize: "0.9375rem", fontWeight: 900, color: canAfford ? "#000" : color.text.muted, letterSpacing: "0.08em", textTransform: "uppercase", position: "relative" }}>
            {canAfford ? "Lock Me In" : "Insufficient Coins"}
          </span>
          {canAfford && <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgba(0,0,0,0.55)", position: "relative" }}>· {fmt(c.entry)}</span>}
        </button>
        <button onClick={onClose} style={{ width: "100%", padding: "12px", borderRadius: radius.lg, background: "transparent", border: "none", cursor: "pointer", fontSize: "0.875rem", color: color.text.muted }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Proof Modal ──────────────────────────────────────────────────────────────
function ProofModal({ c, onSubmit, onClose }: {
  c: Challenge; dayNum: number; proofSent: boolean; onSubmit: () => void; onClose: () => void;
}) {
  return (
    <ProofCamera
      challengeId={c.id}
      challengeTitle={c.title}
      onSuccess={() => { onSubmit(); }}
      onClose={onClose}
    />
  );
}

// ─── Shield Modal ─────────────────────────────────────────────────────────────
function ShieldModal({ globalShields, onActivate, onClose }: {
  globalShields: number; onActivate: () => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  function handleActivate() {
    if (!selected || globalShields < 1) return;
    setActivated(true);
    setTimeout(() => onActivate(), 1600);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, animation: "overlayIn 0.2s ease both" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: color.bg.deep, borderTop: "1px solid rgba(96,152,216,0.22)",
        borderRadius: `${radius.xl} ${radius.xl} 0 0`,
        padding: `24px ${space.screenX}px calc(32px + env(safe-area-inset-bottom, 0px))`,
        animation: "sheetUp 0.32s cubic-bezier(.175,.885,.32,1.1) both",
        boxShadow: "0 -20px 60px rgba(96,152,216,0.10)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(96,152,216,0.30)", margin: "0 auto 20px" }} />

        {activated ? (
          // Activated state
          <div style={{ textAlign: "center", padding: "16px 0 8px", animation: "shieldEntry 0.5s cubic-bezier(.175,.885,.32,1.275) both" }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🛡️</div>
            <div style={{ fontSize: "1.375rem", fontWeight: 900, color: "#6098D8", letterSpacing: "-0.04em", marginBottom: 6 }}>Shield Activated</div>
            <div style={{ fontSize: "0.875rem", color: "rgba(96,152,216,0.80)", marginBottom: 4 }}>Your streak is protected for today</div>
            <div style={{ fontSize: "0.75rem", color: color.text.muted }}>Recovery is discipline. Come back stronger.</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#6098D8", letterSpacing: "-0.02em", marginBottom: 4 }}>🛡️ ELVN Shield</div>
                <div style={{ fontSize: "0.75rem", color: color.text.tertiary }}>Complete a recovery activity to activate your shield</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ width: 26, height: 26, borderRadius: radius.sm, background: i < globalShields ? "rgba(96,152,216,0.18)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${i < globalShields ? "rgba(96,152,216,0.44)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                    {i < globalShields ? "🛡️" : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Cost note */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: radius.md, background: "rgba(96,152,216,0.06)", border: "1px solid rgba(96,152,216,0.16)", marginBottom: 18 }}>
              <span style={{ fontSize: 9 }}>ℹ️</span>
              <span style={{ fontSize: "0.6875rem", color: "rgba(96,152,216,0.75)" }}>Uses 1 of {globalShields} free shields · Streak frozen 24h · Extra shields → Premium</span>
            </div>

            {/* Recovery activities */}
            <div style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: color.text.muted, marginBottom: 10 }}>Choose Recovery Activity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {RECOVERY.map(act => (
                <button
                  key={act.id}
                  onClick={() => setSelected(selected === act.id ? null : act.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
                    borderRadius: radius.md, cursor: "pointer", textAlign: "left",
                    background: selected === act.id ? "rgba(96,152,216,0.13)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selected === act.id ? "rgba(96,152,216,0.44)" : color.border.subtle}`,
                    boxShadow: selected === act.id ? "0 0 16px rgba(96,152,216,0.14)" : "none",
                    transition: `all ${motion.base}`,
                    animation: selected === act.id ? "activitySelect 0.2s ease" : "none",
                  }}>
                  <div style={{ width: 38, height: 38, borderRadius: radius.sm, background: selected === act.id ? "rgba(96,152,216,0.16)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{act.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: selected === act.id ? "#6098D8" : color.text.primary, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{act.title}</div>
                    <div style={{ fontSize: "0.625rem", color: color.text.muted, marginTop: 2 }}>{act.desc}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${selected === act.id ? "#6098D8" : color.border.default}`, background: selected === act.id ? "#6098D8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: `all ${motion.fast}` }}>
                    {selected === act.id && <span style={{ fontSize: 8, color: "#fff" }}>✓</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Activate CTA */}
            <button
              onClick={handleActivate}
              disabled={!selected || globalShields < 1}
              style={{ width: "100%", padding: "14px", borderRadius: radius.lg, background: selected ? "rgba(96,152,216,0.16)" : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? "rgba(96,152,216,0.44)" : color.border.subtle}`, cursor: selected ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12, boxShadow: selected ? "0 0 24px rgba(96,152,216,0.16)" : "none", opacity: selected ? 1 : 0.5, transition: `all ${motion.base}` }}>
              <span style={{ fontSize: 15 }}>🛡️</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: 800, color: selected ? "#6098D8" : color.text.muted }}>Activate Shield</span>
              {globalShields > 0 && <span style={{ fontSize: "0.6875rem", color: "rgba(96,152,216,0.55)" }}>· {globalShields} left</span>}
            </button>
          </>
        )}

        <button onClick={onClose} style={{ width: "100%", padding: "11px", borderRadius: radius.lg, background: "transparent", border: "none", cursor: "pointer", fontSize: "0.875rem", color: color.text.muted }}>
          {activated ? "Done" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

// ─── Claim Prize Modal ────────────────────────────────────────────────────────
function ClaimModal({ c, prizeAmount, onClaim, onClose }: {
  c: Challenge; prizeAmount: number; onClaim: () => void; onClose: () => void;
}) {
  const [claimed, setClaimed] = useState(false);

  function handleClaim() {
    setClaimed(true);
    setTimeout(() => onClaim(), 1800);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, animation: "overlayIn 0.2s ease both" }}>
      <div onClick={!claimed ? onClose : undefined} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: color.bg.deep,
        borderTop: "1px solid rgba(201,168,76,0.28)",
        borderRadius: `${radius.xl} ${radius.xl} 0 0`,
        padding: `24px ${space.screenX}px calc(36px + env(safe-area-inset-bottom, 0px))`,
        animation: "sheetUp 0.36s cubic-bezier(.175,.885,.32,1.1) both",
        boxShadow: "0 -20px 60px rgba(201,168,76,0.14)",
        overflow: "hidden",
      }}>
        {/* Ambient gold glow */}
        <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: "70%", height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)", filter: "blur(24px)", pointerEvents: "none" }} />

        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(201,168,76,0.28)", margin: "0 auto 22px", position: "relative" }} />

        {claimed ? (
          // Claimed celebration state
          <div style={{ textAlign: "center", padding: "10px 0 12px", animation: "claimIn 0.55s cubic-bezier(.175,.885,.32,1.275) both" }}>
            <div style={{ fontSize: 58, marginBottom: 14, animation: "goldPulse 1.8s ease-in-out infinite" }}>🏆</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: color.gold.bright, letterSpacing: "-0.05em", marginBottom: 6, lineHeight: 1 }}>
              {fmt(prizeAmount)}
            </div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: color.text.primary, marginBottom: 4, letterSpacing: "-0.02em" }}>
              Deposited to your vault
            </div>
            <div style={{ fontSize: "0.75rem", color: color.text.muted, marginBottom: 20 }}>
              {c.title} · Winner
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: radius.full, background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.26)" }}>
              <span style={{ fontSize: 10 }}>⟡</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: color.gold.base }}>Check your Vault for the transaction</span>
            </div>
          </div>
        ) : (
          <>
            {/* Challenge badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{ width: 52, height: 52, borderRadius: radius.md, background: `rgba(${rgb(c.accentColor)},0.16)`, border: `1px solid rgba(${rgb(c.accentColor)},0.36)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{c.emoji}</div>
              <div>
                <div style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#4DC87A", marginBottom: 3 }}>Challenge Complete</div>
                <div style={{ fontSize: "1.0625rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.03em", lineHeight: 1.15 }}>{c.title}</div>
                <div style={{ fontSize: "0.6875rem", color: color.text.tertiary, marginTop: 2 }}>{c.duration}-day · {c.tier}</div>
              </div>
            </div>

            {/* Prize amount display */}
            <div style={{ padding: "18px 20px", borderRadius: radius.lg, background: "linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(201,168,76,0.06) 100%)", border: "1px solid rgba(201,168,76,0.24)", marginBottom: 16, textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "40%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)", animation: "shimmer 4s ease-in-out infinite", pointerEvents: "none" }} />
              <div style={{ fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: color.text.muted, marginBottom: 6 }}>Your Prize</div>
              <div style={{ fontSize: "2.75rem", fontWeight: 900, color: color.gold.bright, letterSpacing: "-0.058em", lineHeight: 1, animation: "goldPulse 3s ease-in-out infinite" }}>{fmt(prizeAmount)}</div>
              <div style={{ fontSize: "0.6875rem", color: color.text.muted, marginTop: 4 }}>Split among top {c.winnersCount} completers</div>
            </div>

            {/* Breakdown */}
            <div style={{ borderRadius: radius.md, background: color.bg.card, border: `1px solid ${color.border.subtle}`, overflow: "hidden", marginBottom: 20 }}>
              {[
                { label: "Prize Pool", value: fmt(c.prize), color: c.accentColor },
                { label: "Your Share (80%)", value: fmt(Math.round(c.prize * 0.8)), color: color.gold.base },
                { label: `÷ ${c.winnersCount} winners`, value: fmt(prizeAmount), color: "#4DC87A" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: i < 2 ? `1px solid ${color.border.faint}` : "none" }}>
                  <span style={{ fontSize: "0.6875rem", color: color.text.muted }}>{row.label}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: row.color, letterSpacing: "-0.03em" }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleClaim}
              style={{ width: "100%", padding: "16px", borderRadius: radius.lg, background: "linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 6px 36px rgba(201,168,76,0.52), inset 0 1px 0 rgba(255,255,255,0.22)", position: "relative", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "36%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)", animation: "shimmer 2.2s ease-in-out infinite", pointerEvents: "none" }} />
              <span style={{ fontSize: 18, position: "relative" }}>🏆</span>
              <span style={{ fontSize: "1rem", fontWeight: 900, color: "#000", letterSpacing: "0.06em", textTransform: "uppercase", position: "relative" }}>Claim {fmt(prizeAmount)}</span>
            </button>
            <button onClick={onClose} style={{ width: "100%", padding: "11px", borderRadius: radius.lg, background: "transparent", border: "none", cursor: "pointer", fontSize: "0.875rem", color: color.text.muted }}>
              Later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
