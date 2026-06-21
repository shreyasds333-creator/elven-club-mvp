"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { color, radius, space, typo } from "@/lib/tokens";
import { CITY_DATA, FEED_STATS, FEED_ITEMS } from "@/lib/feedData";
import { PARTNERS, type PinType } from "@/lib/mapData";
import { useAppStore } from "@/lib/appStore";

function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Map loaded client-side only (needs browser/WebGL) ─────────────────────────
const MapComponent = dynamic(
  () => import("@/app/components/MapComponent"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "absolute", inset: 0,
        background: "#050507",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.10)",
          borderTopColor: "#4DC87A",
          animation: "mapSpin 0.7s linear infinite",
        }} />
      </div>
    ),
  }
);

// ── Filter pill definitions ───────────────────────────────────────────────────
const FILTER_PILLS: { id: PinType | "all"; label: string }[] = [
  { id: "all",   label: "All"    },
  { id: "user",  label: "People" },
  { id: "gym",   label: "Gyms"   },
  { id: "cafe",  label: "Cafes"  },
  { id: "store", label: "Stores" },
];

// ── Signal updates — offsets in ms from page load so timestamps feel live ─────
const _now = Date.now();
const SIGNAL_ITEMS = [
  { id: "s1", emoji: "🔥", text: "Bangalore overtakes Mumbai",  sub: "128 proofs today · 47 active right now",       ts: _now - 4   * 60000 },
  { id: "s2", emoji: "⚡", text: "Arjun reached Day 30",        sub: "Elite Consistency · 75 Hard India",            ts: _now - 11  * 60000 },
  { id: "s3", emoji: "📍", text: "HSR Colony trending up",      sub: "89 proofs this week · gaining on Koramangala", ts: _now - 18  * 60000 },
  { id: "s4", emoji: "🥇", text: "Koramangala leads workouts",  sub: "71 gym proofs · 24 active challengers",        ts: _now - 68  * 60000 },
];

// ── Framer Motion variants ────────────────────────────────────────────────────
const sectionVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.175, 0.885, 0.32, 1] } },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.055 } },
};

const rowVariant = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.24, ease: [0.175, 0.885, 0.32, 1] } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [mapFilter, setMapFilter] = useState<PinType | "all">("all");

  return (
    <div className="main-content no-scrollbar" style={{ background: color.bg.base, overflowY: "auto" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        style={{ padding: `26px ${space.screenX}px 0` }}
      >
        <h1 style={{
          fontSize: "1.875rem", fontWeight: 900,
          letterSpacing: "-0.055em", margin: "0 0 8px",
          color: color.text.primary, lineHeight: 1,
        }}>
          City
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4DC87A",
            animation: "liveDot 1.8s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#4DC87A" }}>
            {FEED_STATS.liveNow} proving now
          </span>
          <span style={{ fontSize: "0.8125rem", color: color.text.muted }}>·</span>
          <span style={{ fontSize: "0.8125rem", color: color.text.muted }}>
            {FEED_STATS.proofsToday} proofs today
          </span>
        </div>
      </motion.div>

      {/* ── City Leaderboard ─────────────────────────────────────────────── */}
      <CityLeaderboard />

      {/* ── Live Map ────────────────────────────────────────────────────── */}
      <LiveMapSection
        mapFilter={mapFilter}
        setMapFilter={setMapFilter}
      />

      {/* ── Partner Discovery ────────────────────────────────────────────── */}
      <PartnerDiscovery />

      {/* ── Live Proofs ─────────────────────────────────────────────────── */}
      <LiveActivityFeed />

      {/* ── Your Activity ───────────────────────────────────────────────── */}
      <UserActivityBanner />

      {/* ── Signal Feed ─────────────────────────────────────────────────── */}
      <SignalFeed />

      <div style={{ height: 32 }} />

      <style>{`
        @keyframes liveDot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.22;transform:scale(0.68);} }
        @keyframes fadeBar  { 0%{width:0;} }
        @keyframes trendUp  { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-2px);} }
        @keyframes mapSpin  { to{transform:rotate(360deg);} }
      `}</style>
    </div>
  );
}

// ─── City Leaderboard ─────────────────────────────────────────────────────────
function CityLeaderboard() {
  const TREND_ICON = { up: "↑", down: "↓", flat: "—" } as const;
  const TREND_CLR  = {
    up:   "#4DC87A",
    down: "rgba(255,255,255,0.22)",
    flat: "rgba(255,255,255,0.16)",
  } as const;
  const maxProofs = CITY_DATA[0].proofs;
  const top  = CITY_DATA[0];
  const rest = CITY_DATA.slice(1, 5);

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: `32px ${space.screenX}px 0` }}
    >
      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ ...typo.label, color: color.text.tertiary }}>City Rankings</span>
          <span style={{ fontSize: "0.375rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(226,190,116,0.55)", background: "rgba(226,190,116,0.06)", border: "1px solid rgba(226,190,116,0.16)", padding: "2px 6px", borderRadius: 3 }}>Preview</span>
        </div>
        <span style={{ fontSize: "0.5rem", color: color.text.muted }}>This week</span>
      </div>

      {/* Hero — #1 city */}
      <motion.div
        whileTap={{ scale: 0.985 }}
        style={{
          padding: "18px 18px 16px",
          borderRadius: radius.lg,
          background: "rgba(201,168,76,0.045)",
          border: "1px solid rgba(201,168,76,0.13)",
          marginBottom: 12,
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: "0.5rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.12em" }}>RANK</span>
              <span style={{ fontSize: "1rem", fontWeight: 900, color: "#C9A84C", lineHeight: 1 }}>1</span>
            </div>
            <span style={{ fontSize: "1.375rem", fontWeight: 900, color: color.text.primary, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {top.name}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.6s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.625rem", fontWeight: 700, color: TREND_CLR[top.trend], animation: "trendUp 2.4s ease-in-out infinite" }}>
              {TREND_ICON[top.trend]}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 22, marginBottom: 14 }}>
          {([
            { val: top.proofs,  label: "proofs"  },
            { val: top.active,  label: "active"  },
            { val: top.streaks, label: "streaks" },
          ] as const).map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#E2BE74", letterSpacing: "-0.05em", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "0.4375rem", color: color.text.muted, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Full-width bar */}
        <div style={{ height: 3, borderRadius: 2, background: "rgba(201,168,76,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "100%", borderRadius: 2, background: "linear-gradient(90deg,#C9A84C,#E2BE74)", animation: "fadeBar 0.9s ease both" }} />
        </div>
      </motion.div>

      {/* Ranks 2–5 */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {rest.map((row, i) => {
          const barPct = Math.round((row.proofs / maxProofs) * 100);
          return (
            <motion.div
              key={row.name}
              variants={rowVariant}
              whileTap={{ scale: 0.975 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0",
                borderBottom: i < rest.length - 1 ? `1px solid ${color.border.faint}` : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 16, textAlign: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: color.text.muted }}>
                  {row.rank}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 400, color: color.text.secondary }}>
                      {row.name}
                    </span>
                    {row.isArea && (
                      <span style={{ fontSize: "0.375rem", color: color.text.muted, opacity: 0.5 }}>area</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: color.text.secondary, letterSpacing: "-0.025em" }}>
                      {row.proofs}
                    </span>
                    <span style={{
                      fontSize: "0.5625rem", fontWeight: 600,
                      color: TREND_CLR[row.trend], width: 8, textAlign: "center",
                      animation: row.trend === "up" ? "trendUp 2.4s ease-in-out infinite" : "none",
                    }}>
                      {TREND_ICON[row.trend]}
                    </span>
                  </div>
                </div>
                <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${barPct}%`, borderRadius: 1,
                    background: "rgba(255,255,255,0.13)",
                    animation: `fadeBar 0.8s ease ${(i + 1) * 0.08}s both`,
                  }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

// ─── Live Map Section ─────────────────────────────────────────────────────────
// Floating card logic is fully inside MapComponent — this section is clean.
interface MapSectionProps {
  mapFilter: PinType | "all";
  setMapFilter: (f: PinType | "all") => void;
}

function LiveMapSection({ mapFilter, setMapFilter }: MapSectionProps) {
  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      style={{ paddingTop: 32 }}
    >
      {/* Label */}
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 14, padding: `0 ${space.screenX}px`,
      }}>
        <span style={{ ...typo.label, color: color.text.tertiary }}>Live Nearby</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.5rem", color: color.text.muted }}>Koramangala, Bangalore</span>
        </div>
      </div>

      {/* Map — overflow:visible so floating card can appear above the top edge */}
      <div style={{ position: "relative", height: 300, overflow: "visible" }}>
        <MapComponent filter={mapFilter} />
      </div>

      {/* Filter pills */}
      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 8, padding: `12px ${space.screenX}px 0`, overflowX: "auto" }}
      >
        {FILTER_PILLS.map((f) => {
          const active = mapFilter === f.id;
          return (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.88 }}
              onClick={() => setMapFilter(f.id)}
              style={{
                padding: "6px 15px",
                borderRadius: radius.full,
                background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                border: active ? "1px solid rgba(255,255,255,0.22)" : `1px solid ${color.border.faint}`,
                color: active ? color.text.primary : color.text.muted,
                fontSize: "0.75rem", fontWeight: active ? 600 : 400,
                cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                transition: "background 0.16s ease, border-color 0.16s ease, color 0.16s ease",
              }}
            >
              {f.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Partner Discovery ────────────────────────────────────────────────────────
function PartnerDiscovery() {
  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      style={{ paddingTop: 32 }}
    >
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 14, padding: `0 ${space.screenX}px`,
      }}>
        <span style={{ ...typo.label, color: color.text.tertiary }}>Healthy Partners</span>
        <span style={{ fontSize: "0.5rem", color: color.text.muted }}>Redeem ELVN coins</span>
      </div>

      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 10, paddingLeft: space.screenX, paddingRight: space.screenX, overflowX: "auto" }}
      >
        {PARTNERS.map((p, i) => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.92 }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05, duration: 0.24, ease: [0.175, 0.885, 0.32, 1] } }}
            style={{
              flexShrink: 0, width: 154,
              padding: "15px 14px",
              borderRadius: radius.lg,
              background: p.bg,
              border: `1px solid ${p.accent}20`,
              cursor: "pointer", textAlign: "left",
            }}
          >
            {/* Emoji + badge */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 11 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{p.emoji}</span>
              {(p.isNew || p.isHot) && (
                <span style={{
                  fontSize: "0.375rem", fontWeight: 700, letterSpacing: "0.08em",
                  color: p.isHot ? "#E2BE74" : "#4DC87A",
                  background: p.isHot ? "rgba(226,190,116,0.09)" : "rgba(77,200,122,0.09)",
                  border: `1px solid ${p.isHot ? "rgba(226,190,116,0.24)" : "rgba(77,200,122,0.24)"}`,
                  borderRadius: radius.full, padding: "2px 7px",
                }}>
                  {p.isHot ? "HOT" : "NEW"}
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: color.text.primary, letterSpacing: "-0.02em", marginBottom: 2, lineHeight: 1.2 }}>
              {p.name}
            </div>
            <div style={{ fontSize: "0.5rem", color: color.text.muted, marginBottom: 10 }}>
              {p.category} · {p.area}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.5rem", color: color.text.muted }}>{p.distance}</span>
              {p.coinsRequired != null ? (
                <span style={{
                  fontSize: "0.4375rem", fontWeight: 600, color: p.accent,
                  background: `${p.accent}10`, borderRadius: radius.full, padding: "2px 6px",
                }}>
                  {(p.coinsRequired / 1000).toFixed(0)}K pts
                </span>
              ) : (
                <span style={{ fontSize: "0.4375rem", color: color.text.muted }}>Visit</span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Live Activity Feed ───────────────────────────────────────────────────────
// Shows recent proof and streak activity from the community.
// Proof and streak items only — city items belong in SignalFeed.
function LiveActivityFeed() {
  const items = FEED_ITEMS.filter(
    f => f.type === "proof" || f.type === "streak" || f.type === "live"
  ).slice(0, 8);

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: `32px ${space.screenX}px 0` }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...typo.label, color: color.text.tertiary }}>Live Proofs</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: radius.full, background: "rgba(77,200,122,0.09)", border: "1px solid rgba(77,200,122,0.20)" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.375rem", fontWeight: 700, color: "#4DC87A", letterSpacing: "0.07em", textTransform: "uppercase" }}>Live</span>
          </div>
        </div>
        <span style={{ fontSize: "0.5rem", color: color.text.muted }}>{FEED_STATS.proofsToday} today</span>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {items.map((item, i) => {
          const isLiveItem = item.type === "live";
          const isStreak   = item.type === "streak";

          return (
            <motion.div
              key={item.id}
              variants={rowVariant}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0",
                borderBottom: i < items.length - 1 ? `1px solid ${color.border.faint}` : "none",
              }}
            >
              {/* Avatar or live cluster */}
              {isLiveItem ? (
                <div style={{ display: "flex", flexShrink: 0 }}>
                  {(item.liveAvatars ?? []).slice(0, 3).map((av, j) => (
                    <div
                      key={j}
                      style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: av.bg,
                        border: "2px solid rgba(0,0,0,0.80)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.4375rem", fontWeight: 800, color: "#fff",
                        marginLeft: j > 0 ? -8 : 0,
                        position: "relative", zIndex: 3 - j,
                      }}
                    >
                      {av.initials}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: item.user?.bg ?? "#222",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.5rem", fontWeight: 800, color: "#fff",
                  border: item.isLive ? "1.5px solid rgba(77,200,122,0.50)" : "1.5px solid rgba(255,255,255,0.06)",
                  boxShadow: item.isLive ? "0 0 10px rgba(77,200,122,0.20)" : "none",
                }}>
                  {item.user?.initials}
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {isLiveItem ? (
                  <>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#4DC87A", letterSpacing: "-0.01em", marginBottom: 2 }}>
                      {item.liveCount} proving live right now
                    </div>
                    <div style={{ fontSize: "0.5625rem", color: color.text.muted }}>{item.subline}</div>
                  </>
                ) : isStreak ? (
                  <>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: color.text.primary, letterSpacing: "-0.01em", marginBottom: 2 }}>
                      <span style={{ color: item.challengeAccent ?? color.gold.base }}>{item.user?.name}</span>
                      {" · "}{item.streakDays}-day streak
                    </div>
                    <div style={{ fontSize: "0.5625rem", color: color.text.muted }}>
                      {item.streakLabel} · {item.challenge}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: color.text.primary, letterSpacing: "-0.01em", marginBottom: 2 }}>
                      <span style={{ color: item.isLive ? "#4DC87A" : color.text.secondary }}>{item.user?.name}</span>
                      {" · "}{item.action}
                    </div>
                    <div style={{ fontSize: "0.5625rem", color: color.text.muted }}>
                      {item.proofEmoji} {item.challenge}
                      {item.user?.city ? ` · ${item.user.city}` : ""}
                    </div>
                  </>
                )}
              </div>

              {/* Timestamp */}
              <span style={{ fontSize: "0.5rem", color: color.text.muted, flexShrink: 0 }}>
                {item.timeAgo}
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

// ─── User Activity Banner ─────────────────────────────────────────────────────
// Shows the user's own recent proofs at the top of the signal feed.
// Renders nothing if the user hasn't submitted any proofs yet.
function UserActivityBanner() {
  const { proofLog, streak } = useAppStore();
  if (proofLog.length === 0) return null;

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: `32px ${space.screenX}px 0` }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ ...typo.label, color: color.text.tertiary }}>Your Activity</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.5rem", fontWeight: 700, color: "#4DC87A" }}>LIVE</span>
        </div>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {proofLog.slice(0, 3).map((entry, i) => (
          <motion.div
            key={`${entry.challengeId}-${entry.timestamp}`}
            variants={rowVariant}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "11px 12px",
              borderRadius: radius.md,
              background: i === 0 ? "rgba(77,200,122,0.04)" : "transparent",
              border: i === 0 ? "1px solid rgba(77,200,122,0.12)" : "1px solid transparent",
              marginBottom: i < Math.min(proofLog.length, 3) - 1 ? 8 : 0,
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#7A4A18,#3A2008)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.5rem", fontWeight: 800, color: "#fff",
              border: "1.5px solid rgba(201,168,76,0.30)",
            }}>
              YOU
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: color.text.primary, letterSpacing: "-0.01em" }}>
                  {entry.challengeTitle}
                </span>
                {i === 0 && (
                  <span style={{ fontSize: "0.375rem", fontWeight: 700, color: "#4DC87A", background: "rgba(77,200,122,0.12)", padding: "1.5px 5px", borderRadius: radius.full, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    SENT
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.5625rem", color: color.text.muted }}>
                📸 Proof verified · {entry.streak}d streak · {ago(entry.timestamp)}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: "0.5rem" }}>🔥</span>
              <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#E07840" }}>{streak}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Signal Feed ──────────────────────────────────────────────────────────────
function SignalFeed() {
  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: `32px ${space.screenX}px 0` }}
    >
      <div style={{ marginBottom: 16 }}>
        <span style={{ ...typo.label, color: color.text.tertiary }}>City Updates</span>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {SIGNAL_ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            variants={rowVariant}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 8px",
              borderBottom: i < SIGNAL_ITEMS.length - 1 ? `1px solid ${color.border.faint}` : "none",
              cursor: "pointer", borderRadius: 8,
              transition: "background 0.13s ease",
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{item.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: color.text.primary, letterSpacing: "-0.01em", marginBottom: 2 }}>
                {item.text}
              </div>
              <div style={{ fontSize: "0.5625rem", color: color.text.muted }}>
                {item.sub}
              </div>
            </div>
            <span style={{ fontSize: "0.5rem", color: color.text.muted, flexShrink: 0 }}>{ago(item.ts)}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
