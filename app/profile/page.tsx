"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Camera, Settings, Share2,
  Shield, ChevronRight, Zap, Check, Plus, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/authStore";
import { color, radius, typo, space, motion } from "@/lib/tokens";
import { fmt, rgb } from "@/lib/challengeData";
import { getReputation } from "@/lib/feedData";
import { useAppStore, todayStr, type ProofEntry } from "@/lib/appStore";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "Overview" | "Shields" | "Badges" | "Stats";
type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

interface BadgeItem {
  id: number; emoji: string; name: string; desc: string;
  rarity: Rarity; unlocked: boolean; rarityClr: string; rarityGlow: string;
  rarityPct: string; category: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const USER = {
  name:            "",
  handle:          "",
  initials:        "",
  streak:          11,
  rupeesEarned:    12000,
  totalCalories:   48240,
  totalChallenges: 7,
  rank:            4,
  discScore:       87,
  weekRank:        "Top 8%",
  archetype:       "Iron Disciple",
  archetypeEmoji:  "⚔️",
  level:           23,
  xp:              2160,
  xpNext:          3000,
};

// 14-day streak calendar (oldest → today)
const CALENDAR: { hit: boolean; shielded?: boolean; isToday?: boolean }[] = [
  { hit: true  },
  { hit: false, shielded: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: true  },
  { hit: false, isToday: true  },
];

const DISC_BREAKDOWN = [
  { label: "Consistency",    value: 94, clr: "#4DC87A" },
  { label: "Proof Rate",     value: 96, clr: "#4DC87A" },
  { label: "Streak Quality", value: 90, clr: "#E2BE74" },
  { label: "Workout Output", value: 88, clr: "#E2BE74" },
  { label: "Recovery",       value: 85, clr: "#8B8BDE" },
  { label: "Accountability", value: 86, clr: "#C9A84C" },
  { label: "Sleep",          value: 72, clr: "#6098D8" },
];

const RECOVERY_ACTIONS = [
  { id: 0, emoji: "🧘", label: "Meditation",     sub: "10 min session"     },
  { id: 1, emoji: "💨", label: "Deep Breathing", sub: "Box breathing · 5m" },
  { id: 2, emoji: "🚶", label: "Recovery Walk",  sub: "Easy 20 min walk"   },
  { id: 3, emoji: "😴", label: "Sleep Logged",   sub: "7+ hours tracked"   },
  { id: 4, emoji: "📓", label: "Reflection",     sub: "Daily journal entry" },
  { id: 5, emoji: "🎙️", label: "Mindset Audio",  sub: "Podcast or session"  },
];

const BADGES: BadgeItem[] = [
  { id: 1, emoji: "🔥", name: "Streak Starter", desc: "7 day streak",           rarity: "Common",    unlocked: true,  rarityClr: "rgba(255,255,255,0.36)", rarityGlow: "transparent",            rarityPct: "68% own",  category: "Streak"      },
  { id: 2, emoji: "🏆", name: "First Win",       desc: "Won a challenge",        rarity: "Rare",      unlocked: true,  rarityClr: "#6098D8",                rarityGlow: "rgba(96,152,216,0.18)",  rarityPct: "22% own",  category: "Performance" },
  { id: 3, emoji: "⚡", name: "Elite Member",    desc: "Joined Elite tier",      rarity: "Epic",      unlocked: true,  rarityClr: "#8B8BDE",                rarityGlow: "rgba(139,139,222,0.20)", rarityPct: "9.4% own", category: "Elite"       },
  { id: 4, emoji: "🛡️", name: "Shield Bearer",  desc: "Used first shield",      rarity: "Rare",      unlocked: true,  rarityClr: "#6098D8",                rarityGlow: "rgba(96,152,216,0.18)",  rarityPct: "18% own",  category: "Discipline"  },
  { id: 5, emoji: "🌟", name: "Top 10%",         desc: "Weekly top 10%",         rarity: "Epic",      unlocked: false, rarityClr: "#8B8BDE",                rarityGlow: "rgba(139,139,222,0.20)", rarityPct: "4.2% own", category: "Social"      },
  { id: 6, emoji: "💎", name: "Platinum",        desc: "Reach 3,680 pts",         rarity: "Legendary", unlocked: false, rarityClr: "#E2BE74",                rarityGlow: "rgba(226,190,116,0.22)", rarityPct: "1.1% own", category: "Elite"       },
  { id: 7, emoji: "👑", name: "Iron Legend",     desc: "30 day streak",          rarity: "Legendary", unlocked: false, rarityClr: "#E2BE74",                rarityGlow: "rgba(226,190,116,0.22)", rarityPct: "0.8% own", category: "Streak"      },
  { id: 8, emoji: "🧠", name: "Mind & Body",     desc: "5 recovery completions", rarity: "Rare",      unlocked: false, rarityClr: "#6098D8",                rarityGlow: "rgba(96,152,216,0.18)",  rarityPct: "12% own",  category: "Discipline"  },
  { id: 9, emoji: "⚔️", name: "Iron Disciple",   desc: "Score 90+ discipline",   rarity: "Legendary", unlocked: false, rarityClr: "#E2BE74",                rarityGlow: "rgba(226,190,116,0.22)", rarityPct: "3.7% own", category: "Discipline"  },
];

const ACTIVE_CHALLENGES = [
  { id: 1, title: "Summer Shred",   emoji: "⚡", day: 11, totalDays: 30, tier: "Elite",  prize: 250000, accentColor: "#E2BE74" },
  { id: 2, title: "10K Daily Walk", emoji: "🚶", day: 2,  totalDays: 7,  tier: "Rookie", prize: 12000,  accentColor: "#C9A84C" },
];

const WORKOUT_HISTORY = [
  { id: 1, activity: "Morning Run",  emoji: "🏃", calories: 820, detail: "8.2 km · 45 min", when: "Today",      accent: "#4DC87A" },
  { id: 2, activity: "Gym Session",  emoji: "🏋️", calories: 640, detail: "1h 20m",           when: "Yesterday",  accent: "#8B8BDE" },
  { id: 3, activity: "HIIT Circuit", emoji: "⚡", calories: 510, detail: "35 min",            when: "2 days ago", accent: "#E07840" },
  { id: 4, activity: "Evening Walk", emoji: "🚶", calories: 290, detail: "5.8 km · 62 min",  when: "2 days ago", accent: "#C9A84C" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function streakRing(streak: number): string {
  const deg = Math.round(Math.min(streak / 30, 1) * 360);
  return `conic-gradient(#C9A84C 0deg ${deg}deg, rgba(255,255,255,0.07) ${deg}deg 360deg)`;
}

const FRAGMENT_GOAL = 4;

function buildCalendar(proofLog: ProofEntry[], provedToday: boolean) {
  const today = todayStr();
  const proofDates = new Set(proofLog.map(p => new Date(p.timestamp).toISOString().slice(0, 10)));
  return Array.from({ length: 14 }, (_, i) => {
    const offset  = 13 - i;
    const date    = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
    const isToday = date === today;
    return { hit: isToday ? provedToday : proofDates.has(date), shielded: false, isToday: isToday || undefined };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { streak, longestStreak, provedToday, createdChallenges, joined, proofLog, claimedChallenges, transactions } = useAppStore();
  const totalEarned = transactions.filter(t => t.category === "Win").reduce((s, t) => s + t.coins, 0);
  const calendar    = buildCalendar(proofLog, provedToday);
  const [activeTab,   setActiveTab]   = useState<Tab>("Overview");
  const [shields,     setShields]     = useState(2);
  const [fragments,   setFragments]   = useState(2);
  const [shieldOn,    setShieldOn]    = useState(false);
  const [discOpen,    setDiscOpen]    = useState(false);
  const [doneActions, setDoneActions] = useState<Set<number>>(new Set([0, 1]));

  const xpPct = USER.xp / USER.xpNext;
  const rep   = getReputation(streak);
  const { user: authUser, logout } = useAuth();

  // Prefer real auth data over mock data where available
  const displayName     = authUser?.name     ?? USER.name;
  const displayHandle   = authUser?.handle   ? `@${authUser.handle}` : (USER.handle || "");
  const displayInitials = authUser?.initials ?? USER.initials;

  function completeRecovery(id: number) {
    if (doneActions.has(id)) return;
    setDoneActions(prev => new Set([...prev, id]));
    const next = fragments + 1;
    if (next >= FRAGMENT_GOAL) {
      setShields(s => s + 1);
      setFragments(0);
    } else {
      setFragments(next);
    }
  }

  function activateShield() {
    if (shields < 1 || shieldOn) return;
    setShields(s => s - 1);
    setShieldOn(true);
  }

  return (
    <div className="main-content no-scrollbar" style={{ background: color.bg.base, overflowY: "auto" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative", overflow: "hidden",
          padding: `22px ${space.screenX}px 20px`,
          background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.14) 0%, transparent 70%), #000",
          borderBottom: `1px solid ${color.border.faint}`,
        }}
      >
        <div style={{ position:"absolute", top:-50, left:"50%", transform:"translateX(-50%)", width:330, height:250, borderRadius:"50%", background:"radial-gradient(circle,rgba(201,168,76,0.12) 0%,transparent 70%)", pointerEvents:"none", animation:"goldAura 7s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"45%", pointerEvents:"none", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.018),transparent)", animation:"lightSweep 14s ease-in-out infinite" }} />

        {/* Top row — action buttons */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:18, position:"relative" }}>
          <button
            className="icon-btn"
            title="Share profile"
            style={{ width:34, height:34, borderRadius:radius.full, background:color.bg.surface, border:`1px solid ${color.border.subtle}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
          >
            <Share2 size={13} style={{ color:color.text.secondary }} />
          </button>
          <button
            className="icon-btn"
            title="Settings"
            style={{ width:34, height:34, borderRadius:radius.full, background:color.bg.surface, border:`1px solid ${color.border.subtle}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
          >
            <Settings size={13} style={{ color:color.text.secondary }} />
          </button>
        </div>

        {/* Avatar + identity */}
        <div style={{ display:"flex", alignItems:"center", gap:16, position:"relative", marginBottom:16 }}>
          {/* Avatar — tappable to change photo */}
          <button
            className="avatar-btn"
            title="Change photo"
            style={{ position:"relative", flexShrink:0, background:"none", border:"none", padding:0, cursor:"pointer" }}
          >
            <div style={{ width:80, height:80, borderRadius:"50%", padding:2.5, background:streakRing(streak), boxShadow:"0 0 26px rgba(201,168,76,0.36)", animation:"streakRingPulse 3.4s ease-in-out infinite" }}>
              <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"#000", padding:2 }}>
                <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"linear-gradient(135deg,#7A4A18,#3A2008)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", fontWeight:800, color:"#fff", letterSpacing:"0.03em" }}>
                  {displayInitials}
                </div>
              </div>
            </div>
            <div style={{ position:"absolute", bottom:0, right:0, width:22, height:22, borderRadius:"50%", background:color.gold.base, display:"flex", alignItems:"center", justifyContent:"center", border:"2.5px solid #000" }}>
              <Camera size={9} color="#000" strokeWidth={2.5} />
            </div>
          </button>

          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:"1.3125rem", fontWeight:900, letterSpacing:"-0.04em", color:color.text.primary, margin:"0 0 2px", lineHeight:1 }}>{displayName}</h1>
            <p style={{ fontSize:"0.6875rem", color:color.text.tertiary, margin:"0 0 10px" }}>{displayHandle}</p>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              <div className="badge-chip" style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:radius.full, background:"rgba(201,168,76,0.09)", border:`1px solid ${color.gold.border}` }}>
                <span style={{ fontSize:8 }}>🥇</span>
                <span style={{ fontSize:"0.5rem", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:color.gold.base }}>Gold</span>
              </div>
              <div className="badge-chip" style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:radius.full, background:"rgba(139,139,222,0.09)", border:"1px solid rgba(139,139,222,0.22)" }}>
                <span style={{ fontSize:8 }}>{USER.archetypeEmoji}</span>
                <span style={{ fontSize:"0.5rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"#8B8BDE" }}>{USER.archetype}</span>
              </div>
              <div className="badge-chip" style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:radius.full, background:"rgba(77,200,122,0.08)", border:"1px solid rgba(77,200,122,0.20)" }}>
                <TrendingUp size={9} style={{ color:"#4DC87A" }} />
                <span style={{ fontSize:"0.5rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"#4DC87A" }}>{USER.weekRank}</span>
              </div>
              <div className="badge-chip" style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:radius.full, background:rep.bg, border:`1px solid ${rep.border}` }}>
                <span style={{ fontSize:"0.5rem", fontWeight:700, letterSpacing:"0.05em", color:rep.color }}>{rep.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level + XP bar — tappable to see Stats */}
        <button
          className="xp-card"
          onClick={() => setActiveTab("Stats")}
          style={{ width:"100%", background:color.bg.surface, borderRadius:radius.md, padding:"11px 14px", border:`1px solid ${color.border.faint}`, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.03)", cursor:"pointer", textAlign:"left" }}
        >
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:22, height:22, borderRadius:radius.xs, background:"rgba(96,152,216,0.14)", border:"1px solid rgba(96,152,216,0.26)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Zap size={11} style={{ color:"#6098D8" }} />
              </div>
              <span style={{ fontSize:"0.875rem", fontWeight:800, color:color.text.primary, letterSpacing:"-0.025em" }}>Level {USER.level}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:"0.5rem", color:color.text.tertiary }}>{(USER.xpNext - USER.xp).toLocaleString()} XP to go</span>
              <ChevronRight size={10} style={{ color:color.text.muted }} />
            </div>
          </div>
          <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${Math.round(xpPct * 100)}%`, borderRadius:2, background:"linear-gradient(90deg,#4D7CC4,#6098D8)", boxShadow:"0 0 10px rgba(96,152,216,0.42)", animation:"barFillH 0.72s cubic-bezier(.175,.885,.32,1.1) 0.1s both", transformOrigin:"left" }} />
          </div>
          <p style={{ fontSize:"0.4375rem", color:"rgba(96,152,216,0.55)", margin:"5px 0 0", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>
            {USER.xp.toLocaleString()} XP · {Math.round(xpPct * 100)}% to next level
          </p>
        </button>
      </div>

      {/* ── Streak Hero ─────────────────────────────────────────────────── */}
      <div style={{ padding:`14px ${space.screenX}px 0` }}>
        <div
          style={{
            borderRadius: radius.xl, overflow: "hidden", position: "relative",
            background: "radial-gradient(ellipse at 18% 24%, rgba(201,168,76,0.15) 0%, transparent 55%), linear-gradient(160deg,#0A0800 0%,#060502 100%)",
            border: shieldOn ? "1px solid rgba(96,152,216,0.28)" : "1px solid rgba(201,168,76,0.20)",
            padding: "16px 18px 14px",
            boxShadow: shieldOn ? "0 0 28px rgba(96,152,216,0.09)" : "0 0 20px rgba(201,168,76,0.05)",
            transition: `border-color ${motion.slow}, box-shadow ${motion.slow}`,
          }}
        >
          <div style={{ position:"absolute", inset:-20, pointerEvents:"none", background:"radial-gradient(ellipse at 22% 28%, rgba(201,168,76,0.11) 0%, transparent 55%)", animation:"atmospherePulse 7.5s ease-in-out infinite" }} />
          <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"40%", pointerEvents:"none", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.016),transparent)", animation:"lightSweep 11s ease-in-out infinite" }} />

          <div style={{ position:"relative" }}>
            {shieldOn && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:radius.full, background:"rgba(96,152,216,0.11)", border:"1px solid rgba(96,152,216,0.26)", marginBottom:10, animation:"shieldPulse 3s ease-in-out infinite" }}>
                <Shield size={9} style={{ color:"#6098D8" }} />
                <span style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"#6098D8" }}>Shield active — streak protected until midnight</span>
              </div>
            )}

            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                  <span style={{ fontSize:"3.5rem", fontWeight:900, letterSpacing:"-0.07em", color:color.gold.bright, lineHeight:0.90, animation:"streakGlow 4.2s ease-in-out infinite" }}>
                    {streak}
                  </span>
                  <div>
                    <p style={{ fontSize:"0.9375rem", fontWeight:700, color:color.text.primary, margin:"0 0 2px", lineHeight:1 }}>Day Streak</p>
                    <p style={{ fontSize:"0.5rem", margin:0, fontStyle:"italic",
                      color: provedToday ? "#4DC87A" : streak === 0 ? "rgba(255,255,255,0.32)" : color.text.muted,
                    }}>
                      {provedToday ? "Proved today ✓" : streak === 0 ? "Start your streak today." : "Don't break the chain."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shield slots — tappable */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                <div style={{ display:"flex", gap:5 }}>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      className="shield-slot"
                      onClick={() => i < shields && setActiveTab("Shields")}
                      title={i < shields ? "Tap to manage shields" : "Empty shield slot"}
                      style={{ width:24, height:24, borderRadius:radius.xs, display:"flex", alignItems:"center", justifyContent:"center", background: i < shields ? "rgba(96,152,216,0.13)" : "rgba(255,255,255,0.03)", border: i < shields ? "1px solid rgba(96,152,216,0.28)" : `1px solid ${color.border.faint}`, fontSize:11, boxShadow: i < shields ? "0 0 8px rgba(96,152,216,0.16)" : "none", transition:`all ${motion.base}`, cursor: i < shields ? "pointer" : "default" }}
                    >
                      {i < shields ? "🛡️" : <span style={{ fontSize:7, color:color.text.muted }}>·</span>}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize:"0.4375rem", color:"rgba(96,152,216,0.50)", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>
                  {shields} shield{shields !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* 14-day calendar — each bar has context */}
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                {calendar.map((d, i) => {
                  // Last bar is always "today" — reflect real provedToday state
                  const isToday  = d.isToday ?? false;
                  const hit      = isToday ? provedToday : (d.hit ?? false);
                  const shielded = d.shielded ?? false;
                  return (
                    <div
                      key={i}
                      title={isToday ? (provedToday ? "Today — proved ✓" : "Today — pending") : shielded ? "Shield saved this day" : hit ? "Proof submitted ✓" : "Missed"}
                      style={{ flex:1, height:isToday ? 7 : 6, borderRadius:3,
                        background: isToday
                          ? hit ? "rgba(77,200,122,0.75)" : "rgba(201,168,76,0.28)"
                          : shielded
                            ? "rgba(96,152,216,0.42)"
                            : hit
                              ? "rgba(201,168,76,0.74)"
                              : "rgba(255,255,255,0.05)",
                        boxShadow: hit && !isToday && !shielded ? "0 0 4px rgba(201,168,76,0.30)"
                          : isToday && hit ? "0 0 8px rgba(77,200,122,0.40)"
                          : isToday ? "0 0 8px rgba(201,168,76,0.28)" : "none",
                        animation: isToday && !hit ? "todayPulse 2.2s ease-in-out infinite" : "none",
                        transition: "background 0.3s ease, height 0.2s ease",
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                <span style={{ fontSize:"0.375rem", color:color.text.muted }}>14 days ago</span>
                <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:"0.375rem", color:"rgba(96,152,216,0.55)", fontWeight:600 }}>🛡️ = shield saved</span>
                  <span style={{ fontSize:"0.375rem", color:color.text.muted, margin:"0 2px" }}>·</span>
                  <span style={{ fontSize:"0.375rem", color:color.gold.base, fontWeight:700 }}>Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ribbon — tappable cells ─────────────────────────────── */}
      <div style={{ display:"flex", margin:`12px ${space.screenX}px 0`, background:color.bg.surface, borderRadius:radius.lg, border:`1px solid ${color.border.faint}`, overflow:"hidden" }}>
        {[
          { label:"Earned",     value:fmt(totalEarned),                accent:"#4DC87A",       tab: "Stats"    as Tab },
          { label:"Challenges", value:String(joined.size),            accent:"#6098D8",       tab: "Stats"    as Tab },
          { label:"Proofs",     value:String(proofLog.length),        accent:color.gold.base, tab: "Stats"    as Tab },
          { label:"Best Streak",value:`${longestStreak}d`,            accent:"#E07840",       tab: "Overview" as Tab },
        ].map((s, i) => (
          <button
            key={i}
            className="stat-cell"
            onClick={() => setActiveTab(s.tab)}
            style={{ flex:1, textAlign:"center", padding:"12px 4px", borderLeft: i > 0 ? `1px solid ${color.border.faint}` : "none", borderTop:"none", borderRight:"none", borderBottom:"none", background:"none", cursor:"pointer" }}
          >
            <p style={{ fontSize:"0.875rem", fontWeight:800, color:s.accent, letterSpacing:"-0.04em", margin:"0 0 3px", lineHeight:1 }}>{s.value}</p>
            <p style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:color.text.muted, margin:0 }}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", padding:`0 ${space.screenX}px`, marginTop:16, position:"relative" }}>
        {(["Overview", "Shields", "Badges", "Stats"] as Tab[]).map(tab => (
          <button
            key={tab}
            className="tab-btn"
            onClick={() => setActiveTab(tab)}
            style={{
              flex:1, padding:"10px 2px",
              background:"none", border:"none",
              borderBottom:`2px solid ${activeTab === tab ? color.gold.base : "rgba(255,255,255,0.06)"}`,
              cursor:"pointer",
              transition:`border-color ${motion.base}`,
            }}
          >
            <span style={{ fontSize:"0.625rem", fontWeight:700, letterSpacing:"0.01em", color: activeTab === tab ? color.gold.base : color.text.muted, transition:`color ${motion.base}`, display:"block" }}>
              {tab === "Shields" ? `🛡️ ${tab}` : tab}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────────────────────────── */}
      {activeTab === "Overview" && (
        <div>
          {/* Active challenges */}
          <div style={{ padding:`20px ${space.screenX}px 0` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ ...typo.label, color:color.text.tertiary }}>Active Challenges</span>
              <button
                className="see-all-btn"
                onClick={() => router.push("/challenges")}
                style={{ display:"flex", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"4px 2px" }}
              >
                <span style={{ fontSize:"0.75rem", color:color.gold.base, fontWeight:600 }}>See all</span>
                <ChevronRight size={11} style={{ color:color.gold.base }} />
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {ACTIVE_CHALLENGES.map((c, i) => (
                <button
                  key={c.id}
                  className="challenge-row"
                  onClick={() => router.push(`/challenges/${c.id}`)}
                  style={{ display:"block", width:"100%", textAlign:"left", padding:"14px 16px", borderRadius:radius.lg, background:`radial-gradient(ellipse at 90% 50%, rgba(${rgb(c.accentColor)},0.08) 0%, transparent 60%), ${color.bg.card}`, border:`1px solid rgba(${rgb(c.accentColor)},0.18)`, boxShadow:`inset 0 1px 0 rgba(255,255,255,0.04)`, cursor:"pointer", animation:`springIn 0.32s ease ${i*0.07}s both` }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ display:"flex", gap:9, alignItems:"center" }}>
                      <span style={{ fontSize:"1.125rem", lineHeight:1 }}>{c.emoji}</span>
                      <div>
                        <p style={{ fontSize:"0.9375rem", fontWeight:700, color:color.text.primary, letterSpacing:"-0.02em", margin:"0 0 3px", lineHeight:1 }}>{c.title}</p>
                        <div style={{ display:"flex", gap:6 }}>
                          <span style={{ fontSize:"0.5625rem", color:color.text.muted }}>Day {c.day} of {c.totalDays}</span>
                          <span style={{ fontSize:"0.5625rem", color:c.accentColor, fontWeight:600 }}>{c.tier}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <p style={{ fontSize:"0.9375rem", fontWeight:800, color:c.accentColor, margin:0, letterSpacing:"-0.03em" }}>{fmt(c.prize)}</p>
                      <ChevronRight size={12} style={{ color:color.text.muted }} />
                    </div>
                  </div>
                  {/* Progress bar with entrance animation */}
                  <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(c.day/c.totalDays)*100}%`, borderRadius:2, background:c.accentColor, boxShadow:`0 0 8px rgba(${rgb(c.accentColor)},0.44)`, animation:`barFillH 0.55s cubic-bezier(.175,.885,.32,1.1) ${0.2 + i*0.1}s both`, transformOrigin:"left" }} />
                  </div>
                  <p style={{ fontSize:"0.5rem", color:color.text.muted, margin:"5px 0 0", textAlign:"right" }}>
                    {Math.round((c.day/c.totalDays)*100)}% complete
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* My Challenges */}
          <div style={{ padding:`24px ${space.screenX}px 0` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ ...typo.label, color:color.text.tertiary }}>My Challenges</span>
              <button
                className="see-all-btn"
                onClick={() => router.push("/create")}
                style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:radius.full, background:"rgba(201,168,76,0.08)", border:`1px solid ${color.gold.border}`, cursor:"pointer" }}
              >
                <Plus size={10} style={{ color:color.gold.base }} />
                <span style={{ fontSize:"0.5625rem", fontWeight:700, color:color.gold.base }}>Create</span>
              </button>
            </div>
            {createdChallenges.length === 0 ? (
              <button
                className="challenge-row"
                onClick={() => router.push("/create/new")}
                style={{ width:"100%", padding:"16px", borderRadius:radius.lg, background:color.bg.surface, border:`1px solid ${color.border.faint}`, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left" }}
              >
                <div style={{ width:36, height:36, borderRadius:radius.sm, background:"rgba(201,168,76,0.07)", border:`1px solid ${color.gold.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Plus size={14} style={{ color:color.gold.base }} />
                </div>
                <div>
                  <p style={{ fontSize:"0.875rem", fontWeight:700, color:color.text.secondary, margin:"0 0 2px" }}>No challenges yet</p>
                  <p style={{ fontSize:"0.6875rem", color:color.text.muted, margin:0 }}>Host your first room and earn as a creator</p>
                </div>
              </button>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {createdChallenges.map((c, i) => (
                  <button
                    key={c.id}
                    className="challenge-row"
                    onClick={() => router.push(`/challenges/${c.id}`)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:radius.lg, background:`radial-gradient(ellipse at 90% 50%, rgba(${rgb(c.accentColor)},0.08) 0%, transparent 60%), ${color.bg.card}`, border:`1px solid rgba(${rgb(c.accentColor)},0.18)`, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)", animation:`springIn 0.32s ease ${i*0.07}s both`, cursor:"pointer", textAlign:"left", width:"100%" }}
                  >
                    <span style={{ fontSize:"1.125rem", lineHeight:1, flexShrink:0 }}>{c.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:"0.875rem", fontWeight:700, color:color.text.primary, margin:"0 0 3px", letterSpacing:"-0.01em" }}>{c.title}</p>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:"0.5625rem", color:color.text.muted }}>{c.participants}/{c.maxParticipants} members</span>
                        <span style={{ fontSize:"0.5625rem", color: c.isPublic ? "#4DC87A" : "#6098D8", fontWeight:600 }}>{c.isPublic ? "Public" : "Private"}</span>
                      </div>
                    </div>
                    <ChevronRight size={13} style={{ color:color.text.muted, flexShrink:0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent workouts */}
          <div style={{ padding:`24px ${space.screenX}px 0` }}>
            <span style={{ ...typo.label, color:color.text.tertiary }}>Recent Workouts</span>
            <div style={{ marginTop:12, display:"flex", flexDirection:"column" }}>
              {WORKOUT_HISTORY.map((w, i) => (
                <button
                  key={w.id}
                  className="workout-row"
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 8px", marginLeft:-8, marginRight:-8, borderRadius:radius.sm, borderBottom: i < WORKOUT_HISTORY.length-1 ? `1px solid ${color.border.faint}` : "none", animation:`springIn 0.28s ease ${i*0.055}s both`, background:"none", border:"none", cursor:"pointer", textAlign:"left", width:"calc(100% + 16px)" }}
                >
                  <div style={{ width:40, height:40, borderRadius:radius.md, background:`rgba(${rgb(w.accent)},0.10)`, border:`1px solid rgba(${rgb(w.accent)},0.16)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.125rem", flexShrink:0 }}>
                    {w.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:"0.875rem", fontWeight:700, color:color.text.primary, margin:"0 0 2px", letterSpacing:"-0.01em" }}>{w.activity}</p>
                    <p style={{ fontSize:"0.6875rem", color:color.text.tertiary, margin:0 }}>{w.detail}</p>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <p style={{ fontSize:"0.9375rem", fontWeight:800, color:w.accent, margin:"0 0 2px", letterSpacing:"-0.03em" }}>{w.calories} kcal</p>
                    <p style={{ fontSize:"0.5rem", color:color.text.muted, margin:0 }}>{w.when}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Shields ─────────────────────────────────────────────────── */}
      {activeTab === "Shields" && (
        <div style={{ padding:`20px ${space.screenX}px 0` }}>
          <div style={{ padding:"13px 16px", borderRadius:radius.lg, background:"rgba(96,152,216,0.06)", border:"1px solid rgba(96,152,216,0.14)", marginBottom:20 }}>
            <p style={{ fontSize:"0.8125rem", fontWeight:700, color:"#6098D8", margin:"0 0 4px", letterSpacing:"-0.01em" }}>Recovery is discipline.</p>
            <p style={{ fontSize:"0.625rem", color:color.text.tertiary, margin:0, lineHeight:1.6 }}>
              Shields are never bought. They are earned through intentional recovery — meditation, sleep, reflection. Protect your streak without losing accountability.
            </p>
          </div>

          <span style={{ ...typo.label, color:color.text.tertiary }}>Your Shields</span>
          <div style={{ display:"flex", gap:10, marginTop:12, marginBottom:20 }}>
            {[0, 1, 2].map(i => {
              const charged = i < shields;
              return (
                <div
                  key={i}
                  style={{ flex:1, borderRadius:radius.lg, padding:"16px 10px", textAlign:"center", background: charged ? "radial-gradient(ellipse at 50% 20%, rgba(96,152,216,0.16) 0%, transparent 60%), rgba(96,152,216,0.05)" : color.bg.surface, border: charged ? "1px solid rgba(96,152,216,0.26)" : `1px solid ${color.border.faint}`, boxShadow: charged ? "0 0 22px rgba(96,152,216,0.10), inset 0 1px 0 rgba(255,255,255,0.04)" : "none", animation: charged ? "shieldPulse 4.5s ease-in-out infinite" : "none", animationDelay: `${i * 0.8}s` }}
                >
                  <div style={{ fontSize:"1.875rem", marginBottom:7, lineHeight:1, filter: charged ? "none" : "grayscale(100%)", opacity: charged ? 1 : 0.16 }}>🛡️</div>
                  <span style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color: charged ? "#6098D8" : color.text.muted }}>
                    {charged ? "Charged" : "Empty"}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ padding:"14px 16px", borderRadius:radius.lg, background:color.bg.surface, border:`1px solid ${color.border.faint}`, marginBottom:20, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.03)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:"0.6875rem", fontWeight:700, color:color.text.primary }}>Next Shield</span>
              <span style={{ fontSize:"0.5625rem", color:color.text.muted }}>{fragments} / {FRAGMENT_GOAL} fragments</span>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:7 }}>
              {Array.from({ length: FRAGMENT_GOAL }).map((_, i) => (
                <div key={i} style={{ flex:1, height:6, borderRadius:3, background: i < fragments ? "rgba(96,152,216,0.68)" : "rgba(255,255,255,0.06)", boxShadow: i < fragments ? "0 0 6px rgba(96,152,216,0.36)" : "none", transition:`all ${motion.base}`, animation: i < fragments ? `barFillH 0.38s ease ${i*0.08}s both` : "none", transformOrigin:"left" }} />
              ))}
            </div>
            <p style={{ fontSize:"0.5rem", color:color.text.muted, margin:0, lineHeight:1.55 }}>
              Complete a recovery action below to earn a fragment. Collect {FRAGMENT_GOAL} to charge a shield.
            </p>
          </div>

          <span style={{ ...typo.label, color:color.text.tertiary }}>Recovery Actions</span>
          <p style={{ fontSize:"0.5625rem", color:color.text.muted, margin:"4px 0 14px" }}>Each earns +1 shield fragment</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {RECOVERY_ACTIONS.map((a, i) => {
              const done = doneActions.has(a.id);
              return (
                <button
                  key={a.id}
                  className="recovery-btn"
                  onClick={() => completeRecovery(a.id)}
                  disabled={done}
                  style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 14px", borderRadius:radius.lg, background: done ? "rgba(77,200,122,0.06)" : color.bg.surface, border: done ? "1px solid rgba(77,200,122,0.20)" : `1px solid ${color.border.faint}`, cursor: done ? "default" : "pointer", animation:`springIn 0.28s ease ${i*0.05}s both`, textAlign:"left", width:"100%" }}
                >
                  <span style={{ fontSize:"1.375rem", lineHeight:1, flexShrink:0 }}>{a.emoji}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:"0.8125rem", fontWeight:600, color: done ? "#4DC87A" : color.text.primary, margin:"0 0 2px", letterSpacing:"-0.01em" }}>{a.label}</p>
                    <p style={{ fontSize:"0.5rem", color: done ? "rgba(77,200,122,0.55)" : color.text.muted, margin:0 }}>
                      {done ? "Fragment earned ✓" : a.sub + " · +1 fragment"}
                    </p>
                  </div>
                  <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, background: done ? "rgba(77,200,122,0.16)" : "rgba(255,255,255,0.04)", border: done ? "1px solid rgba(77,200,122,0.28)" : `1px solid ${color.border.faint}`, display:"flex", alignItems:"center", justifyContent:"center", transition:`all ${motion.base}` }}>
                    {done ? <Check size={11} style={{ color:"#4DC87A" }} /> : <span style={{ fontSize:"0.625rem", color:color.text.muted, lineHeight:1 }}>+</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ padding:"16px", borderRadius:radius.lg, background:"radial-gradient(ellipse at 50% 0%, rgba(96,152,216,0.09) 0%, transparent 60%), rgba(96,152,216,0.03)", border:"1px solid rgba(96,152,216,0.18)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.03)" }}>
            <p style={{ fontSize:"0.8125rem", fontWeight:700, color:color.text.primary, margin:"0 0 3px", letterSpacing:"-0.01em" }}>Protect Your Streak</p>
            <p style={{ fontSize:"0.5625rem", color:color.text.tertiary, margin:"0 0 13px", lineHeight:1.6 }}>
              Activate a shield to protect tomorrow's streak if you miss a day.
            </p>
            {shieldOn ? (
              <div style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 14px", borderRadius:radius.md, background:"rgba(77,200,122,0.08)", border:"1px solid rgba(77,200,122,0.22)" }}>
                <Check size={14} style={{ color:"#4DC87A", flexShrink:0 }} />
                <span style={{ fontSize:"0.75rem", fontWeight:700, color:"#4DC87A" }}>Shield active — protected until midnight</span>
              </div>
            ) : (
              <button
                className="shield-cta"
                onClick={activateShield}
                disabled={shields < 1}
                style={{ width:"100%", padding:"13px", borderRadius:radius.md, background: shields > 0 ? "rgba(96,152,216,0.13)" : "rgba(255,255,255,0.03)", border: shields > 0 ? "1px solid rgba(96,152,216,0.28)" : `1px solid ${color.border.faint}`, display:"flex", alignItems:"center", justifyContent:"center", gap:8, cursor: shields > 0 ? "pointer" : "not-allowed", opacity: shields < 1 ? 0.36 : 1, boxShadow: shields > 0 ? "0 0 18px rgba(96,152,216,0.10)" : "none", transition:`all ${motion.base}` }}
              >
                <Shield size={14} style={{ color: shields > 0 ? "#6098D8" : color.text.muted }} />
                <span style={{ fontSize:"0.8125rem", fontWeight:700, color: shields > 0 ? "#6098D8" : color.text.muted }}>
                  {shields > 0 ? "Protect Tomorrow · 1 Shield" : "No shields available"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Badges ──────────────────────────────────────────────────── */}
      {activeTab === "Badges" && (
        <div style={{ padding:`20px ${space.screenX}px 0` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ ...typo.label, color:color.text.tertiary }}>Achievements</span>
            <span style={{ fontSize:"0.5625rem", color:color.text.muted }}>
              {BADGES.filter(b => b.unlocked).length}/{BADGES.length} unlocked
            </span>
          </div>

          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
            {([
              { label: "Common",    clr: "rgba(255,255,255,0.36)" },
              { label: "Rare",      clr: "#6098D8" },
              { label: "Epic",      clr: "#8B8BDE" },
              { label: "Legendary", clr: "#E2BE74" },
            ]).map(r => (
              <div key={r.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:r.clr, boxShadow:`0 0 4px ${r.clr}` }} />
                <span style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:r.clr }}>{r.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {BADGES.map((b, i) => (
              <div
                key={b.id}
                className={`badge-card${b.unlocked ? " badge-unlocked" : ""}`}
                style={{ borderRadius:radius.lg, position:"relative", background: b.unlocked ? `radial-gradient(ellipse at 50% 0%, ${b.rarityGlow} 0%, transparent 58%), ${color.bg.card}` : color.bg.card, border:`1px solid ${b.unlocked ? b.rarityClr : color.border.faint}`, padding:"13px 9px 11px", textAlign:"center", boxShadow: b.unlocked ? `0 0 22px ${b.rarityGlow}, inset 0 1px 0 rgba(255,255,255,0.04)` : "none", opacity: b.unlocked ? 1 : 0.34, animation:`springIn 0.28s ease ${i*0.055}s both`, cursor: b.unlocked ? "pointer" : "default" }}
              >
                <div style={{ position:"absolute", top:7, right:7, width:5, height:5, borderRadius:"50%", background:b.rarityClr, boxShadow:`0 0 5px ${b.rarityClr}`, opacity: b.unlocked ? 1 : 0.4 }} />
                <div style={{ fontSize:"1.875rem", marginBottom:7, lineHeight:1, filter: b.unlocked ? "none" : "grayscale(100%)" }}>{b.emoji}</div>
                <p style={{ fontSize:"0.5625rem", fontWeight:700, color: b.unlocked ? color.text.primary : color.text.muted, margin:"0 0 2px", letterSpacing:"-0.01em", lineHeight:1.2 }}>{b.name}</p>
                <p style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.38)", margin:"0 0 6px", lineHeight:1.35 }}>{b.desc}</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                  <span style={{ fontSize:"0.4375rem", fontWeight:700, color:b.rarityClr, letterSpacing:"0.05em", textTransform:"uppercase" }}>{b.rarity}</span>
                  {b.unlocked && (
                    <>
                      <span style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.28)" }}>·</span>
                      <span style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.28)" }}>{b.rarityPct}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Stats ───────────────────────────────────────────────────── */}
      {activeTab === "Stats" && (
        <div style={{ padding:`20px ${space.screenX}px 0` }}>
          <button
            className="disc-card"
            onClick={() => setDiscOpen(prev => !prev)}
            style={{ width:"100%", padding:"16px", borderRadius:radius.lg, background:"radial-gradient(ellipse at 90% 18%, rgba(201,168,76,0.09) 0%, transparent 55%), rgba(201,168,76,0.04)", border:`1px solid ${color.gold.border}`, marginBottom:14, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)", textAlign:"left", cursor:"pointer" }}
          >
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: discOpen ? 16 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:radius.md, background:"rgba(201,168,76,0.12)", border:`1px solid ${color.gold.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:"1.125rem", lineHeight:1 }}>{USER.archetypeEmoji}</span>
                </div>
                <div>
                  <p style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", color:"rgba(255,255,255,0.38)", margin:"0 0 3px" }}>Discipline Score</p>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                    <span style={{ fontSize:"1.5rem", fontWeight:900, color:color.gold.bright, letterSpacing:"-0.05em", lineHeight:1 }}>{USER.discScore}</span>
                    <span style={{ fontSize:"0.4375rem", color:color.text.muted }}>/100</span>
                    <TrendingUp size={10} style={{ color:"#4DC87A" }} />
                  </div>
                </div>
              </div>
              <ChevronRight size={13} style={{ color:color.text.muted, transform: discOpen ? "rotate(90deg)" : "rotate(0deg)", transition:`transform ${motion.fast}` }} />
            </div>

            {discOpen && (
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                {DISC_BREAKDOWN.map((d, i) => (
                  <div key={i}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:"0.625rem", fontWeight:600, color:color.text.secondary }}>{d.label}</span>
                      <span style={{ fontSize:"0.625rem", fontWeight:700, color:d.clr }}>{d.value}</span>
                    </div>
                    <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${d.value}%`, borderRadius:2, background:d.clr, boxShadow:`0 0 6px rgba(${rgb(d.clr)},0.30)`, animation:`barFillH 0.44s cubic-bezier(.175,.885,.32,1.1) ${i*0.06}s both`, transformOrigin:"left" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </button>

          <span style={{ ...typo.label, color:color.text.tertiary }}>Lifetime Stats</span>
          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { label:"Total Earned",  value:fmt(totalEarned),                          accent:"#4DC87A",       emoji:"💰", sub:`${claimedChallenges.size} wins` },
              { label:"Challenges",    value:String(joined.size),                        accent:"#E07840",       emoji:"🏆", sub:"joined" },
              { label:"Proofs Sent",   value:String(proofLog.length),                    accent:"#6098D8",       emoji:"📸", sub:"lifetime" },
              { label:"Best Streak",   value:`${longestStreak}d`,                        accent:color.gold.base, emoji:"🔥", sub:"personal best" },
            ].map((s, i) => (
              <div
                key={i}
                className="stat-tile"
                style={{ padding:"16px", borderRadius:radius.lg, background:`radial-gradient(ellipse at 90% 10%, rgba(${rgb(s.accent)},0.10) 0%, transparent 55%), ${color.bg.card}`, border:`1px solid rgba(${rgb(s.accent)},0.14)`, boxShadow:`inset 0 1px 0 rgba(255,255,255,0.03)`, animation:`springIn 0.30s ease ${i*0.065}s both` }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}>
                  <span style={{ fontSize:"0.875rem", lineHeight:1 }}>{s.emoji}</span>
                  <span style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:color.text.muted }}>{s.label}</span>
                </div>
                <p style={{ fontSize:"1.375rem", fontWeight:900, letterSpacing:"-0.05em", color:s.accent, margin:"0 0 3px", lineHeight:1 }}>{s.value}</p>
                <p style={{ fontSize:"0.5625rem", color:color.text.muted, margin:0 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign out */}
      <div style={{ padding:`24px ${space.screenX}px 0` }}>
        <button
          onClick={logout}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "14px",
            borderRadius: radius.lg,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.07)",
            cursor: "pointer",
            transition: "background 0.18s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut size={13} style={{ color: "rgba(255,255,255,0.30)" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.30)", letterSpacing: "0.02em" }}>
            Sign out
          </span>
        </button>
      </div>

      <div style={{ height:32 }} />

      <style>{`
        /* ── Icon buttons ── */
        .icon-btn {
          transition: opacity ${motion.fast}, transform 0.16s cubic-bezier(.175,.885,.32,1.275), background ${motion.fast};
        }
        .icon-btn:hover  { background: rgba(255,255,255,0.08) !important; transform: scale(1.06); }
        .icon-btn:active { opacity: 0.50 !important; transform: scale(0.88) !important; }

        /* ── Avatar ── */
        .avatar-btn {
          transition: transform 0.20s cubic-bezier(.175,.885,.32,1.275), opacity ${motion.fast};
        }
        .avatar-btn:hover  { transform: scale(1.04); }
        .avatar-btn:active { transform: scale(0.93) !important; opacity: 0.85; }

        /* ── Badge identity chips ── */
        .badge-chip {
          transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275), opacity ${motion.fast};
        }
        .badge-chip:hover { transform: scale(1.04); }

        /* ── XP card ── */
        .xp-card {
          transition: background ${motion.fast}, transform 0.18s cubic-bezier(.175,.885,.32,1.275);
        }
        .xp-card:hover  { background: rgba(255,255,255,0.07) !important; }
        .xp-card:active { transform: scale(0.985) !important; }

        /* ── Shield slots ── */
        .shield-slot {
          transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275), box-shadow ${motion.base};
        }
        .shield-slot:hover  { transform: scale(1.12) !important; }
        .shield-slot:active { transform: scale(0.92) !important; }

        /* ── Stat ribbon cells ── */
        .stat-cell {
          transition: background ${motion.fast}, transform 0.16s cubic-bezier(.175,.885,.32,1.275);
          border-radius: 0;
        }
        .stat-cell:hover  { background: rgba(255,255,255,0.030) !important; }
        .stat-cell:active { background: rgba(255,255,255,0.050) !important; transform: scale(0.95); }

        /* ── Tab buttons ── */
        .tab-btn {
          transition: opacity ${motion.fast}, transform 0.16s cubic-bezier(.175,.885,.32,1.275);
        }
        .tab-btn:hover  { opacity: 0.82; }
        .tab-btn:active { opacity: 0.60; transform: scale(0.91); }

        /* ── See all / create buttons ── */
        .see-all-btn {
          transition: opacity ${motion.fast}, transform 0.16s ease;
        }
        .see-all-btn:hover  { opacity: 0.80; }
        .see-all-btn:active { transform: scale(0.92) !important; opacity: 0.60; }

        /* ── Challenge rows ── */
        .challenge-row {
          transition: transform ${motion.spring}, box-shadow 0.20s ease;
        }
        .challenge-row:hover  { transform: translateY(-1px); box-shadow: 0 5px 22px rgba(0,0,0,0.45) !important; }
        .challenge-row:active { transform: scale(0.975) translateY(0px) !important; }

        /* ── Workout rows ── */
        .workout-row {
          transition: background ${motion.fast}, transform 0.16s ease;
          border-bottom: 1px solid transparent;
        }
        .workout-row:hover  { background: rgba(255,255,255,0.026) !important; }
        .workout-row:active { background: rgba(255,255,255,0.040) !important; transform: scale(0.984); }

        /* ── Badge cards ── */
        .badge-card {
          transition: transform ${motion.spring}, box-shadow 0.20s ease;
        }
        .badge-unlocked:hover  { transform: translateY(-2px) scale(1.03); }
        .badge-unlocked:active { transform: scale(0.93) !important; }

        /* ── Recovery buttons ── */
        .recovery-btn {
          transition: background ${motion.base}, border-color ${motion.base}, transform 0.18s cubic-bezier(.175,.885,.32,1.275);
        }
        .recovery-btn:not(:disabled):hover  { background: rgba(255,255,255,0.04) !important; transform: translateX(3px); }
        .recovery-btn:not(:disabled):active { opacity: 0.74; transform: scale(0.972) !important; }

        /* ── Shield CTA ── */
        .shield-cta {
          transition: transform ${motion.spring}, box-shadow ${motion.base}, opacity ${motion.fast};
        }
        .shield-cta:not(:disabled):hover  { transform: translateY(-1px); box-shadow: 0 4px 22px rgba(96,152,216,0.18) !important; }
        .shield-cta:not(:disabled):active { transform: scale(0.97) !important; }

        /* ── Discipline score card ── */
        .disc-card {
          transition: background ${motion.fast}, transform 0.18s cubic-bezier(.175,.885,.32,1.275);
        }
        .disc-card:hover  { background: rgba(201,168,76,0.06) !important; }
        .disc-card:active { background: rgba(201,168,76,0.09) !important; transform: scale(0.99); }

        /* ── Stat tiles ── */
        .stat-tile {
          transition: transform ${motion.spring};
          cursor: default;
        }

        @keyframes goldAura        { 0%,100%{opacity:0.80;transform:translateX(-50%) scale(1);}    50%{opacity:1;transform:translateX(-50%) scale(1.12);}       }
        @keyframes lightSweep      { 0%,40%{transform:translateX(-130%);}                           82%,100%{transform:translateX(340%);}                         }
        @keyframes atmospherePulse { 0%,100%{opacity:0.58;transform:scale(1);}                     50%{opacity:1;transform:scale(1.08);}                         }
        @keyframes streakRingPulse { 0%,100%{box-shadow:0 0 26px rgba(201,168,76,0.36);}           50%{box-shadow:0 0 44px rgba(201,168,76,0.62);}               }
        @keyframes streakGlow      { 0%,100%{text-shadow:0 0 30px rgba(226,190,116,0.40);opacity:0.94;} 50%{text-shadow:0 0 60px rgba(226,190,116,0.70);opacity:1;} }
        @keyframes shieldPulse     { 0%,100%{box-shadow:0 0 16px rgba(96,152,216,0.08);}           50%{box-shadow:0 0 30px rgba(96,152,216,0.20);}               }
        @keyframes todayPulse      { 0%,100%{opacity:0.70;}                                        50%{opacity:1;}                                               }
        @keyframes barFillH        { from{transform:scaleX(0);}                                    to{transform:scaleX(1);}                                      }
        @keyframes springIn        { 0%{opacity:0;transform:translateY(7px) scale(0.97);}          65%{opacity:1;transform:translateY(-1px) scale(1.005);}       100%{opacity:1;transform:translateY(0) scale(1);}  }
      `}</style>
    </div>
  );
}
