"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Search } from "lucide-react";
import { color, radius } from "@/lib/tokens";
import { useAppStore } from "@/lib/appStore";
import { useAuth } from "@/lib/authStore";

// ─── Contextual pill config per route ─────────────────────────────────────────
type PillConfig = {
  accent: string;
  bg: string;
  border: string;
  items: string[];
};

const PILL: Record<string, PillConfig> = {
  "/feed": {
    accent: "#4DC87A",
    bg: "rgba(77,200,122,0.09)",
    border: "rgba(77,200,122,0.22)",
    items: [
      "HSR leads tonight 🔥",
      "14 proving live nearby",
      "Bangalore ahead by 44 proofs",
      "4 partner gyms nearby ⚡",
    ],
  },
  "/camera": {
    accent: "#E2BE74",
    bg: "rgba(226,190,116,0.09)",
    border: "rgba(226,190,116,0.24)",
    items: [
      "Summer Shred · 14h left ⚡",
      "Day 11 streak · keep going 🔥",
      "Proof verified instantly ⚡",
      "3 crew members proved today 📸",
    ],
  },
  "/chat": {
    accent: "#6098D8",
    bg: "rgba(96,152,216,0.09)",
    border: "rgba(96,152,216,0.24)",
    items: [
      "3 unread · 5 crew online 💬",
      "HSR Run Club: 12 proofs today 💪",
      "Priya just proved 📸",
      "Squad momentum: 89 proofs ↗",
    ],
  },
  "/challenges": {
    accent: "#E2BE74",
    bg: "rgba(226,190,116,0.09)",
    border: "rgba(226,190,116,0.24)",
    items: [
      "🔥 Bangalore overtakes Mumbai",
      "Day 11 · streak still active 🔥",
      "⚡ 47 competing right now",
      "🥇 Koramangala leads this week",
      "💪 128 proofs today",
    ],
  },
  // Wallet: discipline + coin vault language — NO cash/payout language
  "/wallet": {
    accent: "#E2BE74",
    bg: "rgba(226,190,116,0.09)",
    border: "rgba(226,190,116,0.24)",
    items: [
      "2,840 ELVN coins in vault",
      "Gold tier active · 160 coins today ✨",
      "Rank #4 discipline this month 🏆",
      "3 rewards unlocked this week 🎁",
      "Top 8% discipline score ↗",
    ],
  },
  "/profile": {
    accent: "#E2BE74",
    bg: "rgba(226,190,116,0.09)",
    border: "rgba(226,190,116,0.24)",
    items: [
      "Day 11 streak active 🔥",
      "Top 8% discipline this week ⚡",
      "Verified Grinder status 💪",
      "Elite badge unlocked ✨",
    ],
  },
};

const DEFAULT_PILL: PillConfig = {
  accent: "#4DC87A",
  bg: "rgba(77,200,122,0.09)",
  border: "rgba(77,200,122,0.22)",
  items: ["5 active nearby", "12 proofs today", "3 challenges live"],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function TopBar() {
  const pathname = usePathname();
  const [tickIdx,     setTickIdx]     = useState(0);
  const [pillBright,  setPillBright]  = useState(false);
  const [streakGlow,  setStreakGlow]  = useState(false);
  const { streak } = useAppStore();
  const { user }   = useAuth();
  const cfg: PillConfig = PILL[pathname ?? ""] ?? DEFAULT_PILL;
  const prevStreakRef = useRef(streak);
  const textRef      = useRef<HTMLSpanElement>(null);
  const maskRef      = useRef<HTMLDivElement>(null);

  // Streak glow when it increments
  useEffect(() => {
    if (streak > prevStreakRef.current) {
      setStreakGlow(true);
      const t = setTimeout(() => setStreakGlow(false), 700);
      prevStreakRef.current = streak;
      return () => clearTimeout(t);
    }
    prevStreakRef.current = streak;
  }, [streak]);

  // Reset ticker on route change, auto-rotate every 3.2 s
  useEffect(() => {
    setTickIdx(0);
    if (cfg.items.length <= 1) return;
    const id = setInterval(() => setTickIdx(n => n + 1), 3200);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Measure text overflow → inject scroll animation only when text is too wide
  useLayoutEffect(() => {
    const text = textRef.current;
    const mask = maskRef.current;
    if (!text || !mask) return;
    const overflow = text.scrollWidth - mask.clientWidth;
    if (overflow > 4) {
      text.style.setProperty("--tb-scroll", `-${overflow + 10}px`);
      text.style.animation =
        "tickerIn 0.30s cubic-bezier(.175,.885,.32,1.1) both, tickerScroll 2.8s 0.50s ease-in-out forwards";
    } else {
      text.style.removeProperty("--tb-scroll");
      text.style.animation = "tickerIn 0.30s cubic-bezier(.175,.885,.32,1.1) both";
    }
  }, [tickIdx, pathname]);

  if (pathname === "/welcome" || pathname === "/auth") return null;

  const activeText = cfg.items[tickIdx % cfg.items.length];

  // Pill tap: advance message + haptic + brief glow flash
  const handlePillTap = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(6);
    setTickIdx(n => n + 1);
    setPillBright(true);
    setTimeout(() => setPillBright(false), 300);
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.90)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${color.border.faint}`,
        paddingTop: "env(safe-area-inset-top, 0px)",
        boxShadow: `0 1px 0 rgba(255,255,255,0.03), 0 4px 32px rgba(0,0,0,0.70), 0 14px 52px ${cfg.accent}08`,
        transition: "box-shadow 0.55s ease",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        gap: 8, padding: "11px 14px",
      }}>

        {/* ── Left: profile avatar ─────────────────────────────────────── */}
        <Link
          href="/profile"
          className="tb-avatar"
          style={{
            flexShrink: 0,
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,#7A4A18,#3A2008)",
            border: "2.5px solid #C9A84C",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6875rem", fontWeight: 800, color: "#fff", letterSpacing: "0.03em",
            textDecoration: "none",
            boxShadow: "0 0 0 1.5px rgba(201,168,76,0.22), 0 4px 20px rgba(0,0,0,0.65)",
          }}
        >
          {user?.initials ?? "?"}
        </Link>

        {/* ── Center: contextual live pill (tappable) ──────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
          <button
            className="tb-pill"
            onClick={handlePillTap}
            aria-label="Next update"
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 7,
              padding: "6px 11px",
              borderRadius: radius.full,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              // Glow intensifies briefly when tapped
              boxShadow: pillBright
                ? `0 0 28px ${cfg.accent}32, 0 0 8px ${cfg.accent}20, inset 0 1px 0 rgba(255,255,255,0.07)`
                : `0 0 20px ${cfg.accent}14, inset 0 1px 0 rgba(255,255,255,0.04)`,
              overflow: "hidden",
              cursor: "pointer",
              transition: "background 0.45s ease, border-color 0.45s ease, box-shadow 0.22s ease",
            }}
          >
            {/* Live pulse dot */}
            <div style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: -3, borderRadius: "50%",
                background: cfg.accent,
                animation: "dotRing 2.6s ease-out infinite",
                transition: "background 0.45s ease",
              }} />
              <div style={{
                position: "relative", width: "100%", height: "100%",
                borderRadius: "50%",
                background: cfg.accent,
                boxShadow: `0 0 5px ${cfg.accent}`,
                transition: "background 0.45s ease, box-shadow 0.45s ease",
              }} />
            </div>

            {/* Text — fade mask on right edge for overflow */}
            <div
              ref={maskRef}
              style={{
                flex: 1, overflow: "hidden",
                WebkitMaskImage: "linear-gradient(to right, black 76%, transparent 100%)",
                maskImage:        "linear-gradient(to right, black 76%, transparent 100%)",
              }}
            >
              <span
                key={`${pathname}-${tickIdx}`}
                ref={textRef}
                style={{
                  fontSize: "0.75rem", fontWeight: 700,
                  color: cfg.accent,
                  letterSpacing: "0.005em",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  animation: "tickerIn 0.30s cubic-bezier(.175,.885,.32,1.1) both",
                  transition: "color 0.45s ease",
                }}
              >
                {activeText}
              </span>
            </div>

            {/* Dot count indicator — shows position in rotation */}
            {cfg.items.length > 1 && (
              <div style={{ display: "flex", gap: 3, flexShrink: 0, opacity: 0.40 }}>
                {cfg.items.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === tickIdx % cfg.items.length ? 10 : 4,
                      height: 4,
                      borderRadius: 2,
                      background: cfg.accent,
                      transition: "width 0.28s cubic-bezier(.175,.885,.32,1.275)",
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        </div>

        {/* ── Right: streak + search ───────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          {/* Streak pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 11px",
            borderRadius: radius.full,
            background: streakGlow ? "rgba(255,140,60,0.14)" : "rgba(201,168,76,0.08)",
            border: streakGlow ? "1px solid rgba(255,140,60,0.55)" : `1px solid ${color.gold.border}`,
            boxShadow: streakGlow ? "0 0 18px rgba(255,140,60,0.40)" : "0 0 14px rgba(201,168,76,0.09)",
            animation: streakGlow ? "streakPop 0.40s cubic-bezier(.175,.885,.32,1.275) both" : undefined,
            transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
          }}>
            <Flame
              size={12}
              style={{
                color: streakGlow ? "#FF8C3C" : color.status.streak,
                animation: "flamePulse 2.4s ease-in-out infinite",
                transition: "color 0.25s ease",
              }}
            />
            <span style={{
              fontSize: "0.8125rem", fontWeight: 700,
              color: streakGlow ? "#FF8C3C" : color.gold.base,
              lineHeight: 1, transition: "color 0.25s ease",
            }}>
              {streak}
            </span>
          </div>

          {/* Search */}
          <button
            className="tb-search"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: color.bg.surface,
              border: `1px solid ${color.border.subtle}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, cursor: "pointer",
            }}
          >
            <Search size={15} style={{ color: color.text.secondary }} />
          </button>
        </div>
      </div>

      <style>{`
        .tb-avatar {
          transition: transform 0.18s cubic-bezier(.175,.885,.32,1.275), opacity 0.14s ease !important;
        }
        .tb-avatar:active {
          transform: scale(0.88) !important;
          opacity: 0.76 !important;
        }
        .tb-pill {
          transition: transform 0.14s cubic-bezier(.175,.885,.32,1.275),
                      box-shadow 0.22s ease,
                      background 0.45s ease,
                      border-color 0.45s ease;
        }
        .tb-pill:active {
          transform: scale(0.97) !important;
          opacity: 0.88 !important;
        }
        .tb-search {
          transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275), opacity 0.14s ease;
        }
        .tb-search:active {
          transform: scale(0.86) !important;
          opacity: 0.68 !important;
        }

        @keyframes tickerIn {
          0%   { opacity: 0; transform: translateY(6px) scale(0.96); }
          65%  { opacity: 1; transform: translateY(-1px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tickerScroll {
          0%,  18% { transform: translateX(0); }
          80%, 100% { transform: translateX(var(--tb-scroll, 0px)); }
        }
        @keyframes dotRing {
          0%   { opacity: 0.50; transform: scale(1);   }
          75%  { opacity: 0;    transform: scale(2.8); }
          100% { opacity: 0;    transform: scale(2.8); }
        }
        @keyframes flamePulse {
          0%,100% { opacity: 1;    transform: scale(1);    }
          50%     { opacity: 0.65; transform: scale(0.86); }
        }
        @keyframes streakPop {
          0%   { transform: scale(1);    }
          40%  { transform: scale(1.18); }
          70%  { transform: scale(0.96); }
          100% { transform: scale(1);    }
        }
      `}</style>
    </header>
  );
}
