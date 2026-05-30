"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Edit3 } from "lucide-react";
import { color, radius, typo, space, motion } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────
type Squad = {
  id: number;
  name: string;
  emoji: string;
  accentColor: string;
  activeMembers: number;
  proofCount: number;
  isLive: boolean;
};

type Conversation = {
  id: number;
  name: string;
  initials: string;
  avatarBg: string;
  accentColor: string;
  streak: number;
  lastMessage: string;
  messageType: "proof" | "milestone" | "challenge" | "text";
  timeAgo: string;
  unread: number;
  isOnline: boolean;
};

type QuickAction = {
  id: number;
  label: string;
  emoji: string;
  accent: string;
  href: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function streakRing(accent: string, streak: number): string {
  const deg = Math.round(Math.min(streak / 30, 1) * 360);
  return `conic-gradient(${accent} 0deg ${deg}deg, rgba(255,255,255,0.07) ${deg}deg 360deg)`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const SQUADS: Squad[] = [
  { id: 1, name: "Summer Shred",    emoji: "⚡", accentColor: "#E2BE74", activeMembers: 8,  proofCount: 12, isLive: true  },
  { id: 2, name: "10K Club",        emoji: "🏃", accentColor: "#4DC87A", activeMembers: 5,  proofCount: 7,  isLive: true  },
  { id: 3, name: "Office Warriors", emoji: "💼", accentColor: "#6098D8", activeMembers: 3,  proofCount: 4,  isLive: false },
  { id: 4, name: "Run Crew",        emoji: "🌙", accentColor: "#8B8BDE", activeMembers: 6,  proofCount: 9,  isLive: false },
  { id: 5, name: "75 Hard",         emoji: "🔥", accentColor: "#E07840", activeMembers: 11, proofCount: 18, isLive: true  },
];

// Community activity feed — replaces DM conversations for MVP
// Read-only: shows recent member achievements, proofs, and milestones.
const COMMUNITY_ACTIVITIES: Conversation[] = [
  {
    id: 1, name: "Priya K.", initials: "PK",
    avatarBg: "linear-gradient(135deg,#145C38,#062010)", accentColor: "#4DC87A",
    streak: 23, lastMessage: "Completed Push Day · device-verified proof",
    messageType: "proof", timeAgo: "2m", unread: 0, isOnline: true,
  },
  {
    id: 2, name: "Arjun S.", initials: "AS",
    avatarBg: "linear-gradient(135deg,#7A4A18,#3A2008)", accentColor: "#E2BE74",
    streak: 14, lastMessage: "Reached 14-day streak milestone 🔥",
    messageType: "milestone", timeAgo: "14m", unread: 0, isOnline: true,
  },
  {
    id: 3, name: "Neha R.", initials: "NR",
    avatarBg: "linear-gradient(135deg,#6A2A10,#2A0E06)", accentColor: "#E07840",
    streak: 21, lastMessage: "Earned Verified Grinder status · 21 days straight",
    messageType: "milestone", timeAgo: "31m", unread: 0, isOnline: false,
  },
  {
    id: 4, name: "Ravi S.", initials: "RS",
    avatarBg: "linear-gradient(135deg,#1A4A4A,#082020)", accentColor: "#6098D8",
    streak: 7, lastMessage: "Joined 10K Daily Walk · entry staked",
    messageType: "challenge", timeAgo: "42m", unread: 0, isOnline: true,
  },
  {
    id: 5, name: "Vikram M.", initials: "VM",
    avatarBg: "linear-gradient(135deg,#3A3080,#141228)", accentColor: "#8B8BDE",
    streak: 31, lastMessage: "Earned Gold status — top 12% this week 🥇",
    messageType: "milestone", timeAgo: "1h", unread: 0, isOnline: false,
  },
  {
    id: 6, name: "Kavya T.", initials: "KT",
    avatarBg: "linear-gradient(135deg,#4A1840,#180814)", accentColor: "#C9A84C",
    streak: 9, lastMessage: "5K morning run · health sync proof submitted",
    messageType: "proof", timeAgo: "1h 18m", unread: 0, isOnline: false,
  },
  {
    id: 7, name: "Mihail V.", initials: "MV",
    avatarBg: "linear-gradient(135deg,#304818,#101A08)", accentColor: "#4DC87A",
    streak: 30, lastMessage: "Completed 75 Hard India · Day 30 verified ✓",
    messageType: "challenge", timeAgo: "2h", unread: 0, isOnline: false,
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: 1, label: "Proof",       emoji: "📸", accent: "#4DC87A", href: "/camera"     },
  { id: 2, label: "Challenge",   emoji: "⚡", accent: "#E2BE74", href: "/challenges"  },
  { id: 3, label: "New Squad",   emoji: "👥", accent: "#6098D8", href: "/challenges"  },
  { id: 4, label: "Leaderboard", emoji: "🏆", accent: "#E07840", href: "/feed"        },
];

// Ambient city/tribe ticker — cycles to create social pressure
const CITY_LINES = [
  "HSR proving tonight · 14 online · Priya on a roll",
  "Koramangala leads proofs today · Arjun is live",
  "5 nearby grinders active · Bangalore squad grinding",
  "47 proofs today across your squads · keep it going",
];

const TOTAL_UNREAD = COMMUNITY_ACTIVITIES.reduce((s, c) => s + c.unread, 0);
const TYPE_ICON: Record<Conversation["messageType"], string> = {
  proof: "📸", milestone: "⭐", challenge: "⚡", text: "💬",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search,        setSearch]        = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSquad,   setActiveSquad]   = useState<number | null>(null);
  const [tickerIdx,     setTickerIdx]     = useState(0);

  // City ticker rotation
  useEffect(() => {
    const id = setInterval(() => setTickerIdx(n => n + 1), 4400);
    return () => clearInterval(id);
  }, []);

  const filtered = COMMUNITY_ACTIVITIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="main-content no-scrollbar" style={{ background: color.bg.base, overflowY: "auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: `20px ${space.screenX}px 0` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.04em", margin: 0, color: color.text.primary, lineHeight: 1 }}>
                Community
              </h1>
              <span style={{ fontSize: "0.4375rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(201,168,76,0.70)", padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(201,168,76,0.22)", background: "rgba(201,168,76,0.06)" }}>
                Beta
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite" }} />
              <span style={{ fontSize: "0.75rem", color: color.text.secondary, fontWeight: 500 }}>
                {COMMUNITY_ACTIVITIES.filter(c => c.isOnline).length} active now
              </span>
              <span style={{ fontSize: "0.75rem", color: color.text.muted }}>·</span>
              <span style={{ fontSize: "0.75rem", color: color.text.tertiary }}>
                Live features rolling out
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="hdr-btn"
              onClick={() => searchRef.current?.focus()}
              style={{
                width: 36, height: 36, borderRadius: radius.full,
                background: color.bg.surface, border: `1px solid ${color.border.subtle}`,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <Search size={14} style={{ color: color.text.secondary }} />
            </button>
            <button
              className="hdr-btn"
              onClick={() => router.push("/challenges")}
              style={{
                width: 36, height: 36, borderRadius: radius.full,
                background: "rgba(226,190,116,0.08)", border: `1px solid ${color.gold.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <Edit3 size={14} style={{ color: color.gold.bright }} />
            </button>
          </div>
        </div>

        {/* ── Search bar — compact ───────────────────────────────────────── */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "8px 14px",
            borderRadius: radius.xl,
            background: searchFocused ? color.bg.surface : "rgba(255,255,255,0.04)",
            border: `1px solid ${searchFocused ? "rgba(226,190,116,0.28)" : color.border.subtle}`,
            boxShadow: searchFocused ? "0 0 0 3px rgba(226,190,116,0.05), 0 4px 20px rgba(0,0,0,0.35)" : "none",
            transition: `all ${motion.base}`,
          }}
        >
          <Search
            size={13}
            style={{ color: searchFocused ? color.gold.base : color.text.muted, flexShrink: 0, transition: `color ${motion.base}` }}
          />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search squads and friends…"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect="off"
            style={{
              background: "none", border: "none", outline: "none", flex: 1,
              fontSize: "0.8125rem", color: color.text.primary, fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: color.text.muted, fontSize: "1.1rem", lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {!search && (
        <>
          {/* ── Active Squad Pills ─── compact horizontal pills ──────────── */}
          <div style={{ marginTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: space.screenX, paddingRight: space.screenX, marginBottom: 10 }}>
              <span style={{ ...typo.label, color: color.text.tertiary }}>Squads</span>
              <span style={{ fontSize: "0.5625rem", color: "#4DC87A", fontWeight: 600 }}>
                {SQUADS.filter(s => s.isLive).length} live
              </span>
            </div>
            <div className="no-scrollbar" style={{ display: "flex", gap: 8, paddingLeft: space.screenX, paddingRight: space.screenX, overflowX: "auto" }}>
              {SQUADS.map(sq => {
                const isActive = activeSquad === sq.id;
                return (
                  <button
                    key={sq.id}
                    className="squad-pill"
                    onClick={() => setActiveSquad(isActive ? null : sq.id)}
                    style={{
                      flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "7px 12px",
                      borderRadius: radius.full,
                      background: isActive
                        ? `rgba(${hexToRgb(sq.accentColor)}, 0.13)`
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isActive ? sq.accentColor + "44" : color.border.subtle}`,
                      cursor: "pointer",
                      transition: `background ${motion.base}, border-color ${motion.base}`,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{sq.emoji}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isActive ? sq.accentColor : color.text.primary, letterSpacing: "-0.01em" }}>
                      {sq.name}
                    </span>
                    {sq.isLive && (
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite", flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: "0.5rem", color: color.text.muted }}>
                      <span style={{ color: sq.accentColor, fontWeight: 700 }}>{sq.activeMembers}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Quick Actions — compact pill row ──────────────────────────── */}
          <div style={{ padding: `14px ${space.screenX}px 0` }}>
            <div className="no-scrollbar" style={{ display: "flex", gap: 7, overflowX: "auto" }}>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.id}
                  className="action-chip"
                  onClick={() => router.push(action.href)}
                  style={{
                    flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 12px",
                    borderRadius: radius.full,
                    background: `rgba(${hexToRgb(action.accent)}, 0.06)`,
                    border: `1px solid rgba(${hexToRgb(action.accent)}, 0.16)`,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 10 }}>{action.emoji}</span>
                  <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: action.accent, letterSpacing: "0.02em" }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── City / tribe ticker — ambient social presence ─────────────── */}
          <div style={{ padding: `12px ${space.screenX}px 0`, display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite", flexShrink: 0 }} />
            <span
              key={tickerIdx}
              style={{
                fontSize: "0.5625rem", color: color.text.muted, fontWeight: 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                animation: "tickerFadeIn 0.32s ease both",
              }}
            >
              {CITY_LINES[tickerIdx % CITY_LINES.length]}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: color.border.faint, margin: `14px 0 0` }} />
        </>
      )}

      {/* ── Conversation List ──────────────────────────────────────────────── */}
      <div style={{ paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `10px ${space.screenX}px 4px` }}>
          <span style={{ ...typo.label, color: color.text.tertiary }}>
            {search ? "Results" : "Recent Activity"}
          </span>
          {!search && (
            <span style={{ fontSize: "0.5625rem", color: color.text.muted, fontWeight: 500 }}>
              {COMMUNITY_ACTIVITIES.length} updates
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((convo, i) => (
            <ConvoRow key={convo.id} convo={convo} index={i} />
          ))}
          {filtered.length === 0 && (
            <p style={{ fontSize: "0.875rem", color: color.text.tertiary, padding: "36px 20px", textAlign: "center" }}>
              No matches found
            </p>
          )}
        </div>
      </div>

      <div style={{ height: 20 }} />

      <style>{`
        .hdr-btn { transition: opacity 0.14s ease; }
        .hdr-btn:active { opacity: 0.55; transform: scale(0.92); }

        .squad-pill { transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275) !important; }
        .squad-pill:active { transform: scale(0.94) !important; }

        .action-chip { transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275), opacity 0.14s ease; }
        .action-chip:active { transform: scale(0.92) !important; opacity: 0.72 !important; }

        .convo-row { transition: background ${motion.fast}; }
        .convo-row:active { background: rgba(255,255,255,0.022) !important; }

        @keyframes liveDot {
          0%,100% { opacity: 1;    transform: scale(1);    }
          50%      { opacity: 0.28; transform: scale(0.72); }
        }
        @keyframes streakRingPulse {
          0%,100% { opacity: 0.9; }
          50%      { opacity: 1.0; filter: brightness(1.14); }
        }
        @keyframes springIn {
          0%   { opacity: 0; transform: translateY(6px) scale(0.97); }
          65%  { opacity: 1; transform: translateY(-1px) scale(1.005); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tickerFadeIn {
          0%   { opacity: 0; transform: translateY(3px); }
          100% { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────
function ConvoRow({ convo, index }: { convo: Conversation; index: number }) {
  const hasUnread = convo.unread > 0;
  const isProving = convo.isOnline && convo.messageType === "proof";
  const ringBg    = streakRing(convo.accentColor, convo.streak);

  return (
    <button
      className="convo-row"
      style={{
        display: "flex", alignItems: "center", gap: 13,
        padding: `11px ${space.screenX}px`,
        background: hasUnread ? "rgba(255,255,255,0.015)" : "none",
        border: "none", cursor: "pointer", textAlign: "left", width: "100%",
        position: "relative",
        animation: `springIn 0.34s cubic-bezier(.175,.885,.32,1.275) ${index * 0.05}s both`,
      }}
    >
      {/* Unread accent bar */}
      {hasUnread && (
        <div style={{
          position: "absolute", left: 0, top: "24%", bottom: "24%",
          width: 3, borderRadius: "0 3px 3px 0",
          background: convo.accentColor,
          boxShadow: `0 0 6px ${convo.accentColor}70`,
        }} />
      )}

      {/* Avatar — 48px, conic streak ring */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: ringBg,
            padding: 2,
            boxShadow: hasUnread ? `0 0 16px ${convo.accentColor}30` : "none",
            animation: convo.streak >= 7 ? "streakRingPulse 3.4s ease-in-out infinite" : "none",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: color.bg.base, padding: 1.5 }}>
            <div
              style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: convo.avatarBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6875rem", fontWeight: 800, color: "#fff", letterSpacing: "0.01em",
              }}
            >
              {convo.initials}
            </div>
          </div>
        </div>

        {/* Online dot */}
        {convo.isOnline && (
          <div style={{
            position: "absolute", bottom: 1, right: 1,
            width: 10, height: 10, borderRadius: "50%",
            background: isProving ? "#4DC87A" : "#4DC87A",
            border: `2px solid ${color.bg.base}`,
            boxShadow: isProving ? "0 0 6px rgba(77,200,122,0.60)" : "none",
            animation: isProving ? "liveDot 1.6s ease-in-out infinite" : "none",
          }} />
        )}

        {/* Streak badge */}
        <div style={{
          position: "absolute", top: -2, left: -2,
          display: "flex", alignItems: "center", gap: 1,
          padding: "1.5px 4px", borderRadius: radius.full,
          background: "rgba(0,0,0,0.92)",
          border: "1px solid rgba(224,120,64,0.40)",
        }}>
          <span style={{ fontSize: 6 }}>🔥</span>
          <span style={{ fontSize: "0.5rem", fontWeight: 800, color: "#E07840" }}>{convo.streak}</span>
        </div>
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{
              fontSize: "0.9375rem",
              fontWeight: hasUnread ? 700 : 600,
              color: color.text.primary,
              letterSpacing: "-0.015em",
              whiteSpace: "nowrap",
            }}>
              {convo.name}
            </span>
            {/* Proving indicator — for active live users */}
            {isProving && (
              <span style={{ fontSize: "0.4375rem", fontWeight: 700, color: "#4DC87A", letterSpacing: "0.06em", animation: "liveDot 2s ease-in-out infinite" }}>
                LIVE
              </span>
            )}
          </div>
          <span style={{
            fontSize: "0.5625rem",
            color: hasUnread ? color.text.secondary : color.text.muted,
            fontWeight: hasUnread ? 600 : 400,
            flexShrink: 0, marginLeft: 8,
          }}>
            {convo.timeAgo}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, flexShrink: 0 }}>{TYPE_ICON[convo.messageType]}</span>
          <span style={{
            fontSize: "0.75rem",
            color: hasUnread ? color.text.secondary : color.text.tertiary,
            fontWeight: hasUnread ? 500 : 400,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {convo.lastMessage}
          </span>
        </div>
      </div>

      {/* Unread badge */}
      {hasUnread ? (
        <div style={{
          minWidth: 20, height: 20, borderRadius: radius.full,
          background: convo.accentColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 5px",
          fontSize: "0.5625rem", fontWeight: 800, color: "#000",
          flexShrink: 0,
        }}>
          {convo.unread}
        </div>
      ) : (
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: color.border.faint, flexShrink: 0 }} />
      )}
    </button>
  );
}
