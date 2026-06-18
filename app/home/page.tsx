"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell, Flame, Trophy, ChevronRight,
  Zap, Target, TrendingUp, Crown, Star,
} from "lucide-react";
import { color, radius, shadow, typo, space, motion, tierStyle } from "@/lib/tokens";
import { CHALLENGES, fmt } from "@/lib/challengeData";
import { useAuth } from "@/lib/authStore";
import { useAppStore } from "@/lib/appStore";


// ─── Activity feed ────────────────────────────────────────────────────────────

const feed: {
  id: number;
  user: string;
  initials: string;
  avatarHue: string;
  verb: string;
  target: string;
  time: string;
  actionType: "joined" | "completed" | "ranked";
}[] = [
  {
    id: 1,
    user: "Rahul S.",
    initials: "RS",
    avatarHue: "linear-gradient(135deg,#4B3A8A,#2A1E60)",
    verb: "joined",
    target: "10K Daily Walk · ₹200",
    time: "2m ago",
    actionType: "joined",
  },
  {
    id: 2,
    user: "Priya K.",
    initials: "PK",
    avatarHue: "linear-gradient(135deg,#3A3080,#1E1650)",
    verb: "completed",
    target: "Day 5 of Office Step Challenge",
    time: "12m ago",
    actionType: "completed",
  },
  {
    id: 3,
    user: "Arjun T.",
    initials: "AT",
    avatarHue: "linear-gradient(135deg,#7A4A18,#4A2C0A)",
    verb: "ranked #1 in",
    target: "10K Daily Walk · won ₹12K",
    time: "1h ago",
    actionType: "ranked",
  },
  {
    id: 4,
    user: "Neha R.",
    initials: "NR",
    avatarHue: "linear-gradient(135deg,#145C38,#082A1A)",
    verb: "joined",
    target: "Summer Shred · ₹5,000",
    time: "2h ago",
    actionType: "joined",
  },
];

// ─── Leaderboard ──────────────────────────────────────────────────────────────

const rankings = [
  {
    rank: 1,
    user: "Arjun T.",
    initials: "AT",
    avatarBg: "linear-gradient(135deg,#7A4A18,#4A2C0A)",
    steps: 14892,
    rupeesWon: 12000,
    isYou: false,
  },
  {
    rank: 2,
    user: "Rahul S.",
    initials: "RS",
    avatarBg: "linear-gradient(135deg,#5A2858,#321430)",
    steps: 13241,
    rupeesWon: 5800,
    isYou: false,
  },
  {
    rank: 3,
    user: "You",
    initials: "",
    avatarBg: color.gold.gradient,
    steps: 8247,
    rupeesWon: 1200,
    isYou: true,
  },
];

// ─── Shared components ────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action = "See all",
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ ...typo.heading, color: color.text.primary, margin: 0 }}>
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          style={{
            ...typo.caption,
            color: color.gold.base,
            fontWeight: 500,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {action}
          <ChevronRight size={13} />
        </Link>
      ) : (
        <button
          style={{
            ...typo.caption,
            color: color.gold.base,
            fontWeight: 500,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {action}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [greeting, setGreeting] = useState("Good Morning");
  const { user: authUser } = useAuth();
  const { streak, joined, coins } = useAppStore();

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good Morning");
    else if (h < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const steps = 8247;
  const goal = 10000;
  const pct = steps / goal;
  const R = 36;
  const circ = 2 * Math.PI * R;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: color.bg.base,
        color: color.text.primary,
        paddingBottom: 90,
      }}
    >

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          padding: `54px ${space.screenX}px 16px`,
        }}
      >
        {/* Wordmark */}
        <p
          style={{
            fontSize: "0.5625rem",
            fontWeight: 700,
            letterSpacing: "0.32em",
            color: "rgba(201,168,76,0.42)",
            textAlign: "center",
            textTransform: "uppercase",
            margin: "0 0 18px",
            lineHeight: 1,
          }}
        >
          ELVN CLUB
        </p>

        {/* Greeting row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ ...typo.label, color: color.text.tertiary, margin: "0 0 5px" }}>
              {greeting}
            </p>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "-0.035em",
                margin: 0,
                lineHeight: 1,
              }}
            >
              {authUser?.name ?? authUser?.email?.split("@")[0] ?? "Welcome"}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Streak */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: radius.full,
                background: "rgba(201,168,76,0.07)",
                border: `1px solid ${color.gold.border}`,
              }}
            >
              <Flame size={13} style={{ color: color.status.streak }} />
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: color.gold.base,
                  letterSpacing: "-0.01em",
                }}
              >
                {streak}
              </span>
            </div>

            {/* Bell */}
            <div style={{ position: "relative" }}>
              <button
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.full,
                  background: color.bg.surface,
                  border: `1px solid ${color.border.subtle}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  transition: `opacity ${motion.fast}`,
                }}
              >
                <Bell size={16} style={{ color: color.text.secondary }} />
              </button>
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 16,
                  height: 16,
                  borderRadius: radius.full,
                  background: color.gold.base,
                  color: "#000",
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                3
              </span>
            </div>

            {/* Avatar — taps to profile */}
            <Link
              href="/profile"
              style={{
                width: 38,
                height: 38,
                borderRadius: radius.full,
                background: color.gold.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "#000",
                letterSpacing: "0.03em",
                textDecoration: "none",
              }}
            >
              {authUser?.initials ?? "?"}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Performance Card ───────────────────────────────────────────── */}
      <section style={{ padding: `0 ${space.screenX}px`, marginTop: 2 }}>
        <div
          style={{
            position: "relative",
            borderRadius: radius.xl,
            overflow: "hidden",
            background: color.bg.card,
            border: `1px solid ${color.border.faint}`,
            padding: space.cardPad,
          }}
        >
          <div
            className="gold-aura"
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              top: -110,
              right: -90,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(201,168,76,0.11) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Step count */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <p style={{ ...typo.label, color: color.text.tertiary, margin: "0 0 8px" }}>
                Today&apos;s Steps
              </p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <span
                  style={{
                    ...typo.metric,
                    fontSize: "3.25rem",
                    color: color.text.primary,
                  }}
                >
                  {steps.toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: color.text.tertiary,
                    marginBottom: 7,
                    letterSpacing: "-0.01em",
                  }}
                >
                  / 10K
                </span>
              </div>
              <p style={{ ...typo.caption, color: color.text.tertiary, margin: "4px 0 0" }}>
                Strong output — 1,753 steps from target
              </p>
            </div>

            {/* Progress ring */}
            <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
              <svg
                width={88}
                height={88}
                viewBox="0 0 88 88"
                style={{ transform: "rotate(-90deg)", display: "block" }}
              >
                <circle cx={44} cy={44} r={R} fill="none" stroke={color.bg.surface} strokeWidth={5} />
                <circle
                  cx={44} cy={44} r={R}
                  fill="none"
                  stroke="url(#ringGold)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                  style={{ transition: `stroke-dashoffset ${motion.slow}` }}
                />
                <defs>
                  <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E2BE74" />
                    <stop offset="100%" stopColor="#A07828" />
                  </linearGradient>
                </defs>
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: color.gold.base,
                  letterSpacing: "-0.02em",
                }}
              >
                {Math.round(pct * 100)}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 3,
              background: color.bg.muted,
              borderRadius: radius.full,
              marginBottom: 18,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct * 100}%`,
                background: `linear-gradient(90deg, ${color.gold.deep}, ${color.gold.bright})`,
                borderRadius: radius.full,
                transition: `width ${motion.slow}`,
              }}
            />
          </div>

          {/* Stat trio */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              {
                icon: <Flame size={12} style={{ color: color.status.streak }} />,
                label: "Streak",
                value: String(streak),
                sub: streak === 1 ? "day" : "days",
                accent: color.status.streak,
              },
              {
                icon: <Target size={12} style={{ color: color.gold.base }} />,
                label: "Challenges",
                value: String(joined.size),
                sub: joined.size === 1 ? "active" : "active",
                accent: color.gold.base,
              },
              {
                icon: <TrendingUp size={12} style={{ color: color.status.success }} />,
                label: "Coins",
                value: fmt(coins),
                sub: "balance",
                accent: color.status.success,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: color.bg.surface,
                  border: `1px solid ${color.border.faint}`,
                  borderRadius: radius.md,
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    marginBottom: 5,
                  }}
                >
                  {s.icon}
                  <span style={{ ...typo.label, color: s.accent, fontSize: "0.5625rem" }}>
                    {s.label}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: color.text.primary,
                    margin: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    ...typo.caption,
                    color: color.text.muted,
                    margin: "2px 0 0",
                    fontSize: "0.625rem",
                  }}
                >
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Active Challenges ──────────────────────────────────────────── */}
      <section style={{ marginTop: space.sectionY }}>
        <div style={{ padding: `0 ${space.screenX}px` }}>
          <SectionHeader title="Active Challenges" href="/challenges" />
        </div>

        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingLeft: space.screenX,
            paddingBottom: 4,
            scrollSnapType: "x mandatory",
          }}
        >
          {CHALLENGES.slice(0, 4).map((c) => {
            const tier       = tierStyle[c.tier];
            const spotsLeft  = c.maxParticipants - c.participants;
            const isCritical = spotsLeft <= 5;
            return (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                style={{
                  flexShrink: 0, width: 228, borderRadius: radius.xl,
                  overflow: "hidden", border: `1px solid ${color.border.subtle}`,
                  scrollSnapAlign: "start", background: color.bg.card,
                  boxShadow: shadow.cardLift, textDecoration: "none", display: "block",
                }}
              >
                {/* Cover */}
                <div style={{ height: 128, background: c.cardBg, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
                  <span aria-hidden style={{ position: "absolute", right: -4, bottom: -12, fontSize: "6.5rem", fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1, color: "rgba(255,255,255,0.045)", userSelect: "none", pointerEvents: "none" }}>
                    {c.duration}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ ...typo.label, fontSize: "0.5625rem", color: "rgba(255,255,255,0.50)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: radius.xs, padding: "3px 7px" }}>
                      {c.duration}-Day
                    </span>
                    <span style={{ ...typo.label, fontSize: "0.5rem", color: tier.text, background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: radius.xs, padding: "2px 6px" }}>
                      {c.tier}
                    </span>
                  </div>
                  <h3 style={{ ...typo.title, color: color.text.primary, margin: 0 }}>{c.title}</h3>
                </div>

                {/* Card body */}
                <div style={{ padding: "12px 14px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                    <div>
                      <p style={{ ...typo.label, color: color.text.muted, margin: "0 0 2px" }}>Prize Pool</p>
                      <p style={{ fontSize: "1.125rem", fontWeight: 800, letterSpacing: "-0.04em", color: c.accentColor, margin: 0, fontVariantNumeric: "tabular-nums" }}>{fmt(c.prize)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ ...typo.label, color: color.text.muted, margin: "0 0 2px" }}>Entry</p>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: color.text.secondary, margin: 0, fontVariantNumeric: "tabular-nums" }}>{fmt(c.entry)}</p>
                    </div>
                  </div>

                  {/* Room capacity */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: "0.625rem", color: isCritical ? "#E07840" : color.text.tertiary, fontWeight: isCritical ? 700 : 400 }}>
                      {c.participants}/{c.maxParticipants} locked in{isCritical ? ` · ${spotsLeft} left!` : ""}
                    </span>
                    <span style={{ fontSize: "0.5625rem", color: color.text.tertiary }}>{c.proofsToday} proofs today</span>
                  </div>

                  <div style={{ width: "100%", background: color.gold.gradient, color: "#000", borderRadius: radius.md, padding: "10px 0", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em", textAlign: "center", boxShadow: shadow.goldCTA, textTransform: "uppercase" as const }}>
                    View Room
                  </div>
                </div>
              </Link>
            );
          })}
          <div style={{ width: space.screenX, flexShrink: 0 }} />
        </div>
      </section>

      {/* ── Activity Feed ──────────────────────────────────────────────── */}
      <section style={{ padding: `0 ${space.screenX}px`, marginTop: space.sectionY }}>
        <SectionHeader title="Activity" href="/feed" />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {feed.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: color.bg.card,
                border: `1px solid ${color.border.faint}`,
                borderRadius: radius.lg,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.full,
                  background: item.avatarHue,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                }}
              >
                {item.initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.8125rem", margin: 0, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600 }}>{item.user}</span>
                  <span style={{ color: color.text.tertiary }}> {item.verb} </span>
                  <span
                    style={{
                      fontWeight: 500,
                      color: item.actionType === "ranked" ? color.gold.base : color.text.secondary,
                    }}
                  >
                    {item.target}
                  </span>
                </p>
                <p style={{ ...typo.caption, color: color.text.muted, margin: "3px 0 0" }}>
                  {item.time}
                </p>
              </div>

              {item.actionType === "ranked" && (
                <Trophy size={13} style={{ color: color.gold.base, flexShrink: 0 }} />
              )}
              {item.actionType === "completed" && (
                <Star size={13} style={{ color: color.status.success, flexShrink: 0 }} />
              )}
              {item.actionType === "joined" && (
                <Zap size={13} style={{ color: color.status.info, flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Leaderboard ────────────────────────────────────────────────── */}
      <section style={{ padding: `0 ${space.screenX}px`, marginTop: space.sectionY }}>
        <SectionHeader title="Leaderboard" action="Full board" />

        <div
          style={{
            borderRadius: radius.xl,
            overflow: "hidden",
            border: `1px solid ${color.border.faint}`,
            background: color.bg.card,
          }}
        >
          {rankings.map((entry, i) => (
            <div
              key={entry.rank}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 16px",
                borderBottom: i < rankings.length - 1 ? `1px solid ${color.border.faint}` : "none",
                background: entry.isYou ? "rgba(201,168,76,0.04)" : "transparent",
              }}
            >
              <div style={{ width: 22, textAlign: "center", flexShrink: 0 }}>
                {entry.rank === 1 ? (
                  <Crown size={15} style={{ color: color.gold.base }} />
                ) : (
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: entry.isYou ? color.gold.base : color.text.muted,
                    }}
                  >
                    {entry.rank}
                  </span>
                )}
              </div>

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.full,
                  background: entry.avatarBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                  color: entry.isYou ? "#000" : color.text.primary,
                  boxShadow: entry.rank === 1 ? "0 0 0 1.5px rgba(201,168,76,0.35)" : "none",
                }}
              >
                {entry.isYou ? (authUser?.initials ?? "?") : entry.initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                    color: entry.isYou ? color.gold.base : color.text.primary,
                    margin: 0,
                  }}
                >
                  {entry.user}
                  {entry.isYou && (
                    <span style={{ fontSize: "0.6875rem", fontWeight: 400, color: color.text.tertiary, marginLeft: 6 }}>
                      you
                    </span>
                  )}
                </p>
                <p style={{ ...typo.caption, color: color.text.muted, margin: "2px 0 0" }}>
                  {entry.steps.toLocaleString()} steps
                </p>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: color.status.success,
                    letterSpacing: "-0.02em",
                    margin: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(entry.rupeesWon)}
                </p>
                <p style={{ ...typo.caption, color: color.text.muted, margin: "2px 0 0" }}>
                  won
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
