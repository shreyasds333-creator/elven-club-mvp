"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { color, radius, typo, space, motion, tierStyle } from "@/lib/tokens";
import {
  ALL_CHALLENGES, CHALLENGES, FEATURED, FILTER_CATS, FILTER_EMOJI, PROOF_ICON,
  fmt, fmtCoins, rgb, timeToMidnight,
  type Challenge, type FilterCat,
} from "@/lib/challengeData";
import { useAppStore } from "@/lib/appStore";
import ProofCamera from "@/app/components/ProofCamera";

// ─── Friend proof rings — mock social activity data ──────────────────────────
type ProofStatus = "proved" | "live" | "shield" | "pending";
const PROOF_RINGS: { initials: string; bg: string; name: string; status: ProofStatus; timeAgo: string; challenge: string }[] = [
  { initials: "PK", bg: "linear-gradient(135deg,#145C38,#062010)", name: "Priya",  status: "proved",  timeAgo: "4m",  challenge: "Summer Shred"     },
  { initials: "AS", bg: "linear-gradient(135deg,#7A4A18,#3A2008)", name: "Arjun",  status: "live",    timeAgo: "now", challenge: "75 Hard India"     },
  { initials: "RD", bg: "linear-gradient(135deg,#1A3A6A,#081528)", name: "Rahul",  status: "proved",  timeAgo: "8m",  challenge: "10K Daily Walk"    },
  { initials: "NR", bg: "linear-gradient(135deg,#6A2A10,#2A0E06)", name: "Nisha",  status: "shield",  timeAgo: "22m", challenge: "Discipline Mode"   },
  { initials: "VM", bg: "linear-gradient(135deg,#3A3080,#141228)", name: "Vikram", status: "proved",  timeAgo: "45m", challenge: "Mumbai Moves"      },
  { initials: "ME", bg: "linear-gradient(135deg,#4A306A,#1C0E28)", name: "You",    status: "pending", timeAgo: "",    challenge: "Summer Shred"      },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChallengesPage() {
  const [cat,            setCat]            = useState<FilterCat>("All");
  const [joining,        setJoining]        = useState<Set<number>>(new Set());
  const [insufficientId, setInsufficientId] = useState<number | null>(null);
  const [proofCameraFor, setProofCameraFor] = useState<{ id: number; title: string } | null>(null);

  const store  = useAppStore();
  const router = useRouter();

  // Merge user-created challenges at the top of the discover list
  const allDiscoverChallenges = [...store.createdChallenges, ...CHALLENGES];
  const allLookup             = [...store.createdChallenges, ...ALL_CHALLENGES];

  const activeChallenge = CHALLENGES.find(c => store.joined.has(c.id));
  const filtered     = allDiscoverChallenges.filter(c => cat === "All" || c.category.toLowerCase() === cat.toLowerCase());
  const liveCards    = filtered.filter(c => c.isLive);
  const regularCards = filtered.filter(c => !c.isLive);

  function handleJoin(id: number) {
    const ch = allLookup.find(c => c.id === id);
    if (!ch) return;
    if (store.coins < ch.entry) {
      setInsufficientId(id);
      setTimeout(() => setInsufficientId(null), 2200);
      return;
    }
    setJoining(p => new Set([...p, id]));
    setTimeout(() => {
      setJoining(p => { const n = new Set(p); n.delete(id); return n; });
      store.joinChallenge(id, ch.entry);
    }, 1400);
  }

  function activateShield(id: number) {
    const ch = allLookup.find(c => c.id === id);
    if (!ch || ch.duration < 14) return;
    if (!store.recovering.has(id)) return;
    store.activateShield(id);
  }

  const totalPrize = ALL_CHALLENGES.reduce((s, c) => s + c.prize, 0);

  return (
    <div className="main-content no-scrollbar" style={{ background: color.bg.base, overflowY: "auto" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: `24px ${space.screenX}px 0`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.05em", margin: 0, color: color.text.primary, lineHeight: 1 }}>
            Challenges
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.75rem", color: color.text.secondary }}>
              {CHALLENGES.filter(c => c.isLive).length} live now
            </span>
            {store.createdChallenges.length > 0 && (
              <>
                <span style={{ fontSize: "0.75rem", color: color.text.muted }}>·</span>
                <span style={{ fontSize: "0.75rem", color: color.text.tertiary }}>{store.createdChallenges.length} hosted by you</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Coins → wallet */}
        <button
          onClick={() => router.push("/wallet")}
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "8px 13px", borderRadius: radius.md, background: "rgba(226,190,116,0.07)", border: "1px solid rgba(226,190,116,0.18)", cursor: "pointer", gap: 3 }}
        >
          <span style={{ fontSize: "0.4375rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.62)", lineHeight: 1 }}>coins</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.625rem", color: "rgba(201,168,76,0.60)", lineHeight: 1 }}>⟡</span>
            <span style={{ fontSize: "1rem", fontWeight: 800, color: color.gold.bright, letterSpacing: "-0.04em", lineHeight: 1 }}>{fmtCoins(store.coins)}</span>
          </div>
        </button>
      </div>

      {/* ── Create Challenge CTA ────────────────────────────────────────────── */}
      <div style={{ padding: `20px ${space.screenX}px 0` }}>
        <button
          onClick={() => router.push("/create")}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "17px 20px", borderRadius: radius.lg, cursor: "pointer",
            background: "linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(160,120,40,0.07) 100%)",
            border: "1.5px solid rgba(201,168,76,0.26)",
            boxShadow: "0 4px 32px rgba(201,168,76,0.11), inset 0 1px 0 rgba(255,255,255,0.04)",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "40%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.036),transparent)", animation: "shimmer 4s ease-in-out infinite", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: radius.md, background: "linear-gradient(135deg, rgba(201,168,76,0.20) 0%, rgba(160,120,40,0.11) 100%)", border: "1px solid rgba(201,168,76,0.30)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0, boxShadow: "0 2px 14px rgba(201,168,76,0.14)" }}>⚡</div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 5 }}>Create a Challenge</div>
              <div style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.01em" }}>Host a room · earn 10% of the pool</div>
            </div>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.24)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "0.9375rem", color: color.gold.bright, lineHeight: 1, marginTop: 1 }}>→</span>
          </div>
        </button>
      </div>

      {/* ── Friend Proof Strip ──────────────────────────────────────────────── */}
      <FriendProofStrip />

      {/* ── City Rankings ────────────────────────────────────────────────────── */}
      <CityRankings />

      {/* ── Active Challenge Strip ───────────────────────────────────────────── */}
      {!activeChallenge && (
        <div style={{ padding: `16px ${space.screenX}px 0` }}>
          <div style={{ padding: "13px 16px", borderRadius: radius.lg, background: "rgba(255,255,255,0.025)", border: `1px solid ${color.border.subtle}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: radius.sm, background: "rgba(226,190,116,0.07)", border: `1px solid ${color.gold.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏆</div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: color.text.secondary, margin: "0 0 2px", letterSpacing: "-0.01em" }}>No active rooms</p>
              <p style={{ fontSize: "0.6875rem", color: color.text.muted, margin: 0, lineHeight: 1.4 }}>Pick a challenge below to start competing</p>
            </div>
          </div>
        </div>
      )}
      {activeChallenge && (
        <ActiveStrip
          challenge={activeChallenge}
          proofSent={store.proofSent.has(activeChallenge.id)}
          recoveryActive={store.recovering.has(activeChallenge.id)}
          shieldActive={store.shielded.has(activeChallenge.id)}
          shieldsAvailable={store.shields}
          onProof={() => setProofCameraFor({ id: activeChallenge.id, title: activeChallenge.title })}
          onShield={() => activateShield(activeChallenge.id)}
        />
      )}

      {/* ── Featured Hero Card ──────────────────────────────────────────────── */}
      {cat === "All" && (
        <HeroCard
          challenge={FEATURED}
          joined={store.joined.has(FEATURED.id)}
          joining={joining.has(FEATURED.id)}
          proofSent={store.proofSent.has(FEATURED.id)}
          recoveryActive={store.recovering.has(FEATURED.id)}
          shieldActive={store.shielded.has(FEATURED.id)}
          shieldsAvailable={store.shields}
          walletBalance={store.coins}
          insufficient={insufficientId === FEATURED.id}
          onJoin={() => handleJoin(FEATURED.id)}
          onProof={() => setProofCameraFor({ id: FEATURED.id, title: FEATURED.title })}
          onShield={() => activateShield(FEATURED.id)}
        />
      )}


      {/* ── Category Filter ─────────────────────────────────────────────────── */}
      <div className="no-scrollbar" style={{ display: "flex", gap: 8, padding: `16px ${space.screenX}px 0`, overflowX: "auto" }}>
        {FILTER_CATS.map(fc => {
          const active = cat === fc;
          return (
            <button key={fc} className="cat-pill" onClick={() => setCat(fc)}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: radius.full, background: active ? "rgba(226,190,116,0.13)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(226,190,116,0.36)" : color.border.subtle}`, boxShadow: active ? "0 0 14px rgba(226,190,116,0.10)" : "none", cursor: "pointer", transition: `background ${motion.base}, border-color ${motion.base}` }}>
              <span style={{ fontSize: 11 }}>{FILTER_EMOJI[fc]}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: active ? 700 : 500, color: active ? color.gold.bright : color.text.secondary }}>{fc}</span>
            </button>
          );
        })}
      </div>

      {/* ── Live Now ────────────────────────────────────────────────────────── */}
      {liveCards.length > 0 && (
        <>
          <SectionHeader left={<>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite" }} />
            <span style={{ ...typo.label, color: color.text.tertiary }}>Live Rooms</span>
            <span style={{ padding: "2px 7px", borderRadius: radius.full, background: "rgba(77,200,122,0.10)", border: "1px solid rgba(77,200,122,0.22)", fontSize: "0.5625rem", fontWeight: 700, color: "#4DC87A" }}>{liveCards.length}</span>
          </>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: `0 ${space.screenX}px` }}>
            {liveCards.map((c, i) => (
              <ChallengeCard key={c.id} challenge={c} index={i}
                joined={store.joined.has(c.id)} joining={joining.has(c.id)} proofSent={store.proofSent.has(c.id)}
                recoveryActive={store.recovering.has(c.id)} shieldActive={store.shielded.has(c.id)}
                shieldsAvailable={store.shields} walletBalance={store.coins}
                insufficient={insufficientId === c.id}
                onJoin={() => handleJoin(c.id)} onProof={() => setProofCameraFor({ id: c.id, title: c.title })} onShield={() => activateShield(c.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── More Challenges ─────────────────────────────────────────────────── */}
      {regularCards.length > 0 && (
        <>
          <SectionHeader left={<span style={{ ...typo.label, color: color.text.tertiary }}>
            {liveCards.length > 0 ? "More Rooms" : cat === "All" ? "All Rooms" : cat}
          </span>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: `0 ${space.screenX}px` }}>
            {regularCards.map((c, i) => (
              <ChallengeCard key={c.id} challenge={c} index={liveCards.length + i}
                joined={store.joined.has(c.id)} joining={joining.has(c.id)} proofSent={store.proofSent.has(c.id)}
                recoveryActive={store.recovering.has(c.id)} shieldActive={store.shielded.has(c.id)}
                shieldsAvailable={store.shields} walletBalance={store.coins}
                insufficient={insufficientId === c.id}
                onJoin={() => handleJoin(c.id)} onProof={() => setProofCameraFor({ id: c.id, title: c.title })} onShield={() => activateShield(c.id)}
              />
            ))}
          </div>
        </>
      )}

      <div style={{ height: 28 }} />

      {proofCameraFor && (
        <ProofCamera
          challengeId={proofCameraFor.id}
          challengeTitle={proofCameraFor.title}
          onSuccess={() => { store.sendProof(proofCameraFor.id); setProofCameraFor(null); }}
          onClose={() => setProofCameraFor(null)}
        />
      )}

      <style>{`
        .cat-pill { transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275) !important; }
        .cat-pill:active { transform: scale(0.94) !important; }
        .ch-card { transition: transform 0.22s cubic-bezier(.175,.885,.32,1.275); }
        .ch-card:active { transform: scale(0.978) !important; }
        .cta-join { transition: transform 0.18s cubic-bezier(.175,.885,.32,1.275), box-shadow 0.18s ease; }
        .cta-join:active { transform: scale(0.96) !important; }
        .cta-proof:active { transform: scale(0.97) !important; }
        .cta-shield { transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275), opacity 0.16s ease; }
        .cta-shield:active { transform: scale(0.95) !important; }

        @keyframes liveDot         { 0%,100%{opacity:1;transform:scale(1);}    50%{opacity:0.28;transform:scale(0.74);}  }
        @keyframes atmospherePulse { 0%,100%{opacity:0.65;transform:scale(1);} 50%{opacity:1;transform:scale(1.09);}    }
        @keyframes lightSweep      { 0%,40%{transform:translateX(-130%);}       80%,100%{transform:translateX(340%);}    }
        @keyframes silhouetteDrift { 0%,100%{transform:rotate(-10deg) translateY(0);} 50%{transform:rotate(-10deg) translateY(-8px);} }
        @keyframes borderPulse     { 0%,100%{opacity:0.55;} 50%{opacity:0.07;} }
        @keyframes prizeGlow       { 0%,100%{opacity:0.88;} 50%{opacity:1;filter:brightness(1.15);} }
        @keyframes urgencyPulse    { 0%,100%{opacity:1;}    50%{opacity:0.38;} }
        @keyframes shimmer         { 0%,28%{transform:translateX(-200%);} 68%,100%{transform:translateX(460%);} }
        @keyframes springIn        { 0%{opacity:0;transform:translateY(9px) scale(0.97);} 65%{opacity:1;transform:translateY(-1px) scale(1.005);} 100%{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes stripIn         { 0%{opacity:0;transform:translateY(-6px);} 100%{opacity:1;transform:translateY(0);} }
        @keyframes shieldProtected { 0%,100%{box-shadow:0 0 16px rgba(96,152,216,0.10);} 50%{box-shadow:0 0 30px rgba(96,152,216,0.26);} }
        @keyframes shieldEntry     { 0%{opacity:0;transform:scale(0.82);} 60%{opacity:1;transform:scale(1.06);} 100%{opacity:1;transform:scale(1);} }
        @keyframes youreIn         { 0%{opacity:0;transform:scale(0.92) translateY(4px);} 22%{opacity:1;transform:scale(1.02) translateY(-1px);} 78%{opacity:1;transform:scale(1) translateY(0);} 100%{opacity:0;transform:scale(0.98) translateY(-2px);} }
        @keyframes commitFlash     { 0%{box-shadow:0 0 0 0 rgba(226,190,116,0);} 40%{box-shadow:0 0 0 5px rgba(226,190,116,0.32);} 100%{box-shadow:0 0 0 0 rgba(226,190,116,0);} }
        @keyframes ringGlow        { 0%,100%{opacity:0.50;transform:scale(1.00);} 50%{opacity:1;transform:scale(1.14);} }
        @keyframes insufficientShake { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-4px);} 40%,80%{transform:translateX(4px);} }
        @keyframes liveActivity    { 0%{opacity:0;transform:translateY(5px);} 100%{opacity:1;transform:translateY(0);} }
      `}</style>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────
function SectionHeader({ left }: { left: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: `24px ${space.screenX}px 12px` }}>
      {left}
    </div>
  );
}

// ─── Active Strip ─────────────────────────────────────────────────────────────
function ActiveStrip({ challenge: c, proofSent, recoveryActive, shieldActive, shieldsAvailable, onProof, onShield }: {
  challenge: Challenge; proofSent: boolean;
  recoveryActive: boolean; shieldActive: boolean; shieldsAvailable: number;
  onProof: () => void; onShield: () => void;
}) {
  const { streak } = useAppStore();
  const router = useRouter();
  const dayNum           = c.duration - c.daysLeft;
  const pct              = Math.round((dayNum / c.duration) * 100);
  const isShieldEligible = c.duration >= 14;
  const tier             = tierStyle[c.tier];
  const accentClr = shieldActive ? "#6098D8" : recoveryActive ? "#E07840" : c.accentColor;
  const borderClr = shieldActive ? "rgba(96,152,216,0.42)" : recoveryActive ? "rgba(224,120,64,0.40)" : `rgba(${rgb(c.accentColor)},0.26)`;
  const bgClr     = shieldActive ? "rgba(96,152,216,0.07)" : recoveryActive ? "rgba(224,120,64,0.06)" : `rgba(${rgb(c.accentColor)},0.07)`;
  const labelText = shieldActive ? "Shield Protected" : recoveryActive ? "Recovery Window" : "Active Room";

  return (
    <div style={{ padding: `16px ${space.screenX}px 0`, animation: "stripIn 0.32s ease both" }}>
      <div onClick={() => router.push(`/challenges/${c.id}`)} style={{ padding: "14px 16px", borderRadius: radius.lg, background: bgClr, border: `1px solid ${borderClr}`, boxShadow: shieldActive ? "0 0 28px rgba(96,152,216,0.14)" : recoveryActive ? "0 0 28px rgba(224,120,64,0.10)" : `0 0 28px rgba(${rgb(c.accentColor)},0.08)`, position: "relative", overflow: "hidden", cursor: "pointer", animation: shieldActive ? "shieldProtected 2.8s ease-in-out infinite" : "none", transition: "border-color 0.4s ease, background 0.4s ease" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accentClr, borderRadius: "3px 0 0 3px", transition: "background 0.4s ease" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 16 }}>{c.emoji}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: accentClr, letterSpacing: "0.08em", textTransform: "uppercase", transition: "color 0.4s ease" }}>{labelText}</span>
                <span style={{ padding: "1px 6px", borderRadius: radius.full, background: tier.bg, border: `1px solid ${tier.border}`, fontSize: "0.4375rem", fontWeight: 700, color: tier.text, letterSpacing: "0.07em", textTransform: "uppercase" }}>{c.tier}</span>
              </div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: color.text.primary, margin: 0, letterSpacing: "-0.015em" }}>{c.title}</p>
            </div>
          </div>
          {shieldActive ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: radius.sm, background: "rgba(96,152,216,0.12)", border: "1px solid rgba(96,152,216,0.30)", animation: "shieldEntry 0.45s cubic-bezier(.175,.885,.32,1.275) both" }}>
              <span style={{ fontSize: 11 }}>🛡️</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6098D8" }}>Protected</span>
            </div>
          ) : proofSent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: radius.sm, background: "rgba(77,200,122,0.10)", border: "1px solid rgba(77,200,122,0.24)" }}>
              <span style={{ fontSize: 10 }}>✓</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#4DC87A" }}>Sent</span>
            </div>
          ) : !recoveryActive ? (
            <button className="cta-proof" onClick={(e) => { e.stopPropagation(); onProof(); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: radius.sm, background: "rgba(77,200,122,0.12)", border: "1px solid rgba(77,200,122,0.30)", cursor: "pointer" }}>
              <span style={{ fontSize: 11 }}>📸</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#4DC87A" }}>Post Proof</span>
            </button>
          ) : (
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#E07840", animation: "urgencyPulse 1.6s ease-in-out infinite" }}>{timeToMidnight()}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>Day {dayNum}/{c.duration}</span>
          <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>·</span>
          <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>{PROOF_ICON[c.proofType] ?? "📸"} {c.proofType}</span>
        </div>

        {recoveryActive && !shieldActive && (
          <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: radius.sm, background: "rgba(224,120,64,0.08)", border: "1px solid rgba(224,120,64,0.22)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, animation: "urgencyPulse 1.6s ease-in-out infinite" }}>⚠️</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#E07840" }}>Post proof or use a shield</span>
            </div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#E07840", animation: "urgencyPulse 1.6s ease-in-out infinite", flexShrink: 0 }}>{timeToMidnight()}</span>
          </div>
        )}

        {recoveryActive && !shieldActive && !proofSent && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {isShieldEligible && (
              <button className="cta-shield" onClick={(e) => { e.stopPropagation(); onShield(); }} disabled={shieldsAvailable < 1}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: radius.md, cursor: shieldsAvailable < 1 ? "not-allowed" : "pointer", background: shieldsAvailable > 0 ? "rgba(96,152,216,0.13)" : "rgba(255,255,255,0.04)", border: `1px solid ${shieldsAvailable > 0 ? "rgba(96,152,216,0.36)" : "rgba(255,255,255,0.08)"}`, opacity: shieldsAvailable < 1 ? 0.48 : 1 }}>
                <span style={{ fontSize: 12 }}>🛡️</span>
                <div style={{ textAlign: "left" }}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: shieldsAvailable > 0 ? "#6098D8" : color.text.muted, display: "block", lineHeight: 1.1 }}>Activate Shield</span>
                  <span style={{ fontSize: "0.5rem", color: "rgba(96,152,216,0.55)" }}>{shieldsAvailable} available</span>
                </div>
              </button>
            )}
            <button className="cta-proof" onClick={(e) => { e.stopPropagation(); onProof(); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: radius.md, background: "rgba(77,200,122,0.09)", border: "1px solid rgba(77,200,122,0.26)", cursor: "pointer" }}>
              <span style={{ fontSize: 12 }}>📸</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#4DC87A" }}>Post Proof</span>
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: accentClr, boxShadow: `0 0 6px ${accentClr}80`, transition: "width 0.6s ease, background 0.4s ease" }} />
          </div>
          <span style={{ fontSize: "0.625rem", color: color.text.tertiary, flexShrink: 0 }}>Day {dayNum}/{c.duration}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 8 }}>🔥</span>
            <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#E07840" }}>{streak}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({ challenge: c, joined, joining, proofSent, recoveryActive, shieldActive, shieldsAvailable, walletBalance, insufficient, onJoin, onProof, onShield }: {
  challenge: Challenge; joined: boolean; joining: boolean; proofSent: boolean;
  recoveryActive: boolean; shieldActive: boolean; shieldsAvailable: number;
  walletBalance: number; insufficient: boolean;
  onJoin: () => void; onProof: () => void; onShield: () => void;
}) {
  const router = useRouter();
  const dayNum           = c.duration - c.daysLeft;
  const spotsLeft        = c.maxParticipants - c.participants;
  const spotsFilled      = Math.round((c.participants / c.maxParticipants) * 100);
  const isCritical       = spotsLeft <= 5;
  const isUrgent         = spotsLeft <= 10 && !isCritical;
  const isShieldEligible = c.duration >= 14;
  const canAfford        = walletBalance >= c.entry;
  const tier             = tierStyle[c.tier];
  const perWinner        = Math.round(c.prize * 0.80 / c.winnersCount);

  const cardBorder = joined && shieldActive ? "rgba(96,152,216,0.40)"
    : joined && recoveryActive ? "rgba(224,120,64,0.34)"
    : joining ? "rgba(226,190,116,0.50)"
    : `rgba(${rgb(c.accentColor)},0.22)`;

  return (
    <div style={{ padding: `20px ${space.screenX}px 0` }}>
      <div className="ch-card" onClick={() => router.push(`/challenges/${c.id}`)} style={{ position: "relative", borderRadius: radius.xl, background: c.cardBg, border: `1px solid ${cardBorder}`, padding: "20px 20px 18px", overflow: "hidden", cursor: "pointer", boxShadow: joining ? "0 0 0 1px rgba(255,255,255,0.04), 0 12px 56px rgba(0,0,0,0.75), 0 0 60px rgba(226,190,116,0.12)" : joined && shieldActive ? "0 0 0 1px rgba(255,255,255,0.04), 0 12px 56px rgba(0,0,0,0.75), 0 0 48px rgba(96,152,216,0.14)" : `0 0 0 1px rgba(255,255,255,0.04), 0 12px 56px rgba(0,0,0,0.75), 0 0 60px rgba(${rgb(c.accentColor)},0.08)`, animation: joining ? "commitFlash 1.4s ease both" : joined && shieldActive ? "shieldProtected 2.8s ease-in-out infinite" : "none", transition: "border-color 0.4s ease, box-shadow 0.4s ease" }}>

        {/* Atmosphere layers */}
        <div style={{ position:"absolute", inset:-20, pointerEvents:"none", zIndex:1, background:`radial-gradient(ellipse 80% 70% at 20% 28%, rgba(${rgb(c.accentColor)},0.20) 0%, transparent 60%)`, animation:"atmospherePulse 5.4s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"42%", pointerEvents:"none", zIndex:2, background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.038) 46%,rgba(255,255,255,0.012) 68%,transparent 100%)", animation:"lightSweep 8s ease-in-out infinite" }} />
        <div style={{ position:"absolute", right:-16, bottom:-8, fontSize:168, opacity:0.046, zIndex:3, pointerEvents:"none", animation:"silhouetteDrift 8.5s ease-in-out infinite", filter:"blur(2px)" }}>{c.emoji}</div>
        {c.isLive && <div style={{ position:"absolute", inset:0, borderRadius:radius.xl, zIndex:4, pointerEvents:"none", border:`1.5px solid rgba(${rgb(c.accentColor)},0.36)`, animation:"borderPulse 3.2s ease-out infinite" }} />}

        <div style={{ position: "relative", zIndex: 10 }}>
          {/* Tier + duration + live + shield row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ padding:"3px 9px", borderRadius:radius.full, background:tier.bg, border:`1px solid ${tier.border}`, fontSize:"0.5625rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:tier.text }}>
                {c.tier}
              </span>
              <span style={{ padding:"3px 9px", borderRadius:radius.full, background:`rgba(${rgb(c.accentColor)},0.12)`, border:`1px solid rgba(${rgb(c.accentColor)},0.28)`, fontSize:"0.5625rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:c.accentColor }}>
                {c.duration}-Day
              </span>
              {c.isLive && (
                <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:radius.full, background:"rgba(77,200,122,0.10)", border:"1px solid rgba(77,200,122,0.26)" }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#4DC87A", animation:"liveDot 1.8s ease-in-out infinite" }} />
                  <span style={{ fontSize:"0.5rem", fontWeight:700, color:"#4DC87A", letterSpacing:"0.08em", textTransform:"uppercase" }}>Live</span>
                </div>
              )}
              {c.community && (
                <span style={{ padding:"3px 8px", borderRadius:radius.full, background:"rgba(255,255,255,0.04)", border:`1px solid ${color.border.subtle}`, fontSize:"0.4375rem", fontWeight:600, color:color.text.tertiary, letterSpacing:"0.04em" }}>📍 {c.community}</span>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 style={{ fontSize:"1.875rem", fontWeight:900, letterSpacing:"-0.048em", color:color.text.primary, margin:"0 0 5px", lineHeight:1.0, maxWidth:"80%" }}>{c.title}</h2>
          <p style={{ fontSize:"0.8125rem", color:color.text.secondary, margin:"0 0 10px", lineHeight:1.55, maxWidth:"76%" }}>{c.tagline}</p>
          {c.socialBlip && (
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:c.accentColor, flexShrink:0, opacity:0.75 }} />
              <span style={{ fontSize:"0.6875rem", color:color.text.secondary, fontStyle:"italic" }}>{c.socialBlip}</span>
            </div>
          )}

          {/* Creator byline */}
          {c.creator && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:c.creator.bg, border:`1.5px solid rgba(255,255,255,0.16)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.3125rem", fontWeight:800, color:"#fff", flexShrink:0 }}>{c.creator.initials}</div>
              <span style={{ fontSize:"0.6875rem", color:"rgba(255,255,255,0.72)", fontWeight:700 }}>{c.creator.name}</span>
              {c.creator.cred && (
                <>
                  <span style={{ fontSize:"0.5625rem", color:color.text.muted }}>·</span>
                  <span style={{ fontSize:"0.5625rem", color:color.text.secondary }}>{c.creator.cred}</span>
                </>
              )}
            </div>
          )}

          {/* Financial grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderRadius:radius.md, background:"rgba(255,255,255,0.04)", border:`1px solid ${color.border.faint}`, overflow:"hidden", marginBottom:14 }}>
            <div style={{ padding:"10px 0 9px", textAlign:"center", borderRight:`1px solid ${color.border.faint}` }}>
              <div style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:color.text.muted, marginBottom:4 }}>Entry</div>
              <div style={{ fontSize:"0.9375rem", fontWeight:800, color:color.gold.bright, letterSpacing:"-0.04em", lineHeight:1 }}>⟡ {fmtCoins(c.entry)}</div>
            </div>
            <div style={{ padding:"10px 0 9px", textAlign:"center", borderRight:`1px solid ${color.border.faint}` }}>
              <div style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:color.text.muted, marginBottom:4 }}>Prize Pool</div>
              <div style={{ fontSize:"0.9375rem", fontWeight:800, color:c.accentColor, letterSpacing:"-0.04em", lineHeight:1, animation:"prizeGlow 3.8s ease-in-out infinite" }}>⟡ {fmtCoins(c.prize)}</div>
            </div>
            <div style={{ padding:"10px 0 9px", textAlign:"center" }}>
              <div style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:color.text.muted, marginBottom:4 }}>Top Win</div>
              <div style={{ fontSize:"0.9375rem", fontWeight:800, color:color.text.secondary, letterSpacing:"-0.04em", lineHeight:1 }}>⟡ {fmtCoins(perWinner)}</div>
            </div>
          </div>

          {/* Room capacity */}
          <RoomCapacity c={c} />

          {/* Friends joined */}
          {c.friendsJoined.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ display:"flex" }}>
                {c.friendsJoined.map((f, i) => (
                  <div key={i} style={{ width:20, height:20, borderRadius:"50%", background:f.bg, border:"2px solid rgba(0,0,0,0.80)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.375rem", fontWeight:800, color:"#fff", marginLeft:i>0?-6:0, position:"relative", zIndex:3-i }}>
                    {f.initials}
                  </div>
                ))}
              </div>
              <span style={{ fontSize:"0.6875rem", color:color.text.tertiary }}>
                {c.friendsJoined.length} friend{c.friendsJoined.length > 1 ? "s" : ""} in · {c.joinedToday} joined today
              </span>
            </div>
          )}

          {/* Live activity feed */}
          {c.recentProofs.length > 0 && !joined && (
            <div style={{ marginBottom:14, padding:"10px 12px", borderRadius:radius.md, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:c.accentColor, animation:"liveDot 1.8s ease-in-out infinite" }} />
                <span style={{ fontSize:"0.5rem", fontWeight:700, color:color.text.muted, letterSpacing:"0.09em", textTransform:"uppercase" }}>Room Activity</span>
              </div>
              {c.recentProofs.slice(0,3).map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom: i < 2 ? 6 : 0, animation:`liveActivity 0.3s ease ${i * 0.08}s both` }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:p.bg, border:"1.5px solid rgba(255,255,255,0.10)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.375rem", fontWeight:800, color:"#fff", flexShrink:0 }}>{p.initials}</div>
                  <span style={{ fontSize:"0.6875rem", color:color.text.secondary, flex:1 }}>{p.action}</span>
                  <span style={{ fontSize:"0.5625rem", color:color.text.muted, flexShrink:0 }}>{p.timeAgo}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <HeroCTA
            challenge={c} joined={joined} joining={joining} proofSent={proofSent}
            recoveryActive={recoveryActive} shieldActive={shieldActive}
            shieldsAvailable={shieldsAvailable} canAfford={canAfford} insufficient={insufficient}
            dayNum={dayNum} isShieldEligible={isShieldEligible}
            onJoin={onJoin} onProof={onProof} onShield={onShield}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Hero CTA ─────────────────────────────────────────────────────────────────
function HeroCTA({ challenge: c, joined, joining, proofSent, recoveryActive, shieldActive, shieldsAvailable, canAfford, insufficient, dayNum, isShieldEligible, onJoin, onProof, onShield }: {
  challenge: Challenge; joined: boolean; joining: boolean; proofSent: boolean;
  recoveryActive: boolean; shieldActive: boolean; shieldsAvailable: number;
  canAfford: boolean; insufficient: boolean;
  dayNum: number; isShieldEligible: boolean;
  onJoin: () => void; onProof: () => void; onShield: () => void;
}) {
  const router = useRouter();
  if (joining) {
    return (
      <div style={{ padding:"13px", borderRadius:radius.lg, background:"rgba(226,190,116,0.08)", border:"1px solid rgba(226,190,116,0.28)", display:"flex", alignItems:"center", justifyContent:"center", gap:10, animation:"youreIn 1.4s ease both" }}>
        <span style={{ fontSize:18 }}>✓</span>
        <div>
          <div style={{ fontSize:"0.875rem", fontWeight:800, color:color.gold.bright, letterSpacing:"-0.02em", lineHeight:1.1 }}>You're in.</div>
          <div style={{ fontSize:"0.6875rem", color:"rgba(226,190,116,0.65)", marginTop:2 }}>⟡ {c.entry.toLocaleString("en-IN")} coins committed</div>
        </div>
      </div>
    );
  }
  if (!joined && c.maxParticipants - c.participants <= 0) return (
    <div style={{ padding:"13px", borderRadius:radius.lg, background:"rgba(255,255,255,0.04)", border:`1px solid ${color.border.subtle}`, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
      <span style={{ fontSize:14 }}>🔒</span>
      <span style={{ fontSize:"0.875rem", fontWeight:700, color:color.text.muted }}>Room Full</span>
      <span style={{ fontSize:"0.75rem", color:color.text.muted }}>· {c.maxParticipants} members max</span>
    </div>
  );
  if (joined) {
    if (shieldActive) return (
      <div style={{ padding:"13px", borderRadius:radius.lg, background:"rgba(96,152,216,0.10)", border:"1px solid rgba(96,152,216,0.28)", display:"flex", alignItems:"center", justifyContent:"center", gap:8, animation:"shieldEntry 0.45s cubic-bezier(.175,.885,.32,1.275) both" }}>
        <span style={{ fontSize:16 }}>🛡️</span>
        <span style={{ fontSize:"0.8125rem", fontWeight:700, color:"#6098D8" }}>ELVN Shield Protected Your Streak</span>
      </div>
    );
    if (recoveryActive) return (
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ padding:"10px 14px", borderRadius:radius.md, background:"rgba(224,120,64,0.08)", border:"1px solid rgba(224,120,64,0.24)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:12, animation:"urgencyPulse 1.6s ease-in-out infinite" }}>⚠️</span>
            <span style={{ fontSize:"0.6875rem", fontWeight:700, color:"#E07840" }}>Recovery Window Open</span>
          </div>
          <span style={{ fontSize:"0.75rem", fontWeight:800, color:"#E07840", animation:"urgencyPulse 1.6s ease-in-out infinite" }}>{timeToMidnight()}</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {isShieldEligible && (
            <button className="cta-shield" onClick={(e) => { e.stopPropagation(); onShield(); }} disabled={shieldsAvailable < 1}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"12px 14px", borderRadius:radius.lg, cursor:shieldsAvailable<1?"not-allowed":"pointer", background:shieldsAvailable>0?"rgba(96,152,216,0.13)":"rgba(255,255,255,0.04)", border:`1px solid ${shieldsAvailable>0?"rgba(96,152,216,0.34)":"rgba(255,255,255,0.08)"}`, opacity:shieldsAvailable<1?0.48:1 }}>
              <span style={{ fontSize:14 }}>🛡️</span>
              <div>
                <span style={{ fontSize:"0.75rem", fontWeight:700, color:shieldsAvailable>0?"#6098D8":color.text.muted, display:"block", lineHeight:1.1 }}>Use Shield</span>
                <span style={{ fontSize:"0.5rem", color:"rgba(96,152,216,0.55)" }}>{shieldsAvailable} left this month</span>
              </div>
            </button>
          )}
          <button className="cta-proof" onClick={(e) => { e.stopPropagation(); onProof(); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"12px 14px", borderRadius:radius.lg, background:"rgba(77,200,122,0.09)", border:"1px solid rgba(77,200,122,0.26)", cursor:"pointer" }}>
            <span style={{ fontSize:14 }}>📸</span>
            <span style={{ fontSize:"0.75rem", fontWeight:800, color:"#4DC87A" }}>Post Proof</span>
          </button>
        </div>
      </div>
    );
    if (proofSent) return (
      <button onClick={(e) => { e.stopPropagation(); router.push(`/challenges/${c.id}`); }} style={{ width:"100%", padding:"13px", borderRadius:radius.lg, background:`rgba(${rgb(c.accentColor)},0.08)`, border:`1px solid rgba(${rgb(c.accentColor)},0.24)`, display:"flex", alignItems:"center", justifyContent:"center", gap:7, cursor:"pointer" }}>
        <span style={{ fontSize:13 }}>✓</span>
        <span style={{ fontSize:"0.8125rem", fontWeight:700, color:c.accentColor }}>Proof Sent · View Room →</span>
      </button>
    );
    return (
      <button className="cta-proof" onClick={(e) => { e.stopPropagation(); onProof(); }} style={{ width:"100%", padding:"14px", borderRadius:radius.lg, background:"rgba(77,200,122,0.11)", border:"1px solid rgba(77,200,122,0.30)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
        <span style={{ fontSize:15 }}>📸</span>
        <span style={{ fontSize:"0.8125rem", fontWeight:800, color:"#4DC87A", letterSpacing:"0.04em" }}>Post Proof</span>
      </button>
    );
  }
  if (!canAfford) return (
    <button disabled style={{ width:"100%", padding:"14px", borderRadius:radius.lg, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.10)", cursor:"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:8, animation: insufficient ? "insufficientShake 0.4s ease" : "none" }}>
      <span style={{ fontSize:"0.8125rem", fontWeight:700, color:color.text.muted, letterSpacing:"0.04em" }}>⟡ Insufficient Coins</span>
      <span style={{ fontSize:"0.75rem", color:color.text.muted }}>· Need {fmt(c.entry)}</span>
    </button>
  );
  return (
    <button className="cta-join" onClick={(e) => { e.stopPropagation(); onJoin(); }} style={{ width:"100%", padding:"14px", borderRadius:radius.lg, background:"linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 28px rgba(201,168,76,0.42), inset 0 1px 0 rgba(255,255,255,0.16)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"32%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)", animation:"shimmer 3s ease-in-out infinite" }} />
      <span style={{ fontSize:"0.8125rem", fontWeight:800, color:"#000", letterSpacing:"0.08em", textTransform:"uppercase", position:"relative" }}>Join Room</span>
      <span style={{ fontSize:"0.8125rem", fontWeight:600, color:"rgba(0,0,0,0.60)", position:"relative" }}>· ⟡ {fmtCoins(c.entry)}</span>
    </button>
  );
}

// ─── Challenge Card (redesigned) ──────────────────────────────────────────────
function ChallengeCard({ challenge: c, index, joined, joining, proofSent, recoveryActive, shieldActive, shieldsAvailable, walletBalance, insufficient, onJoin, onProof, onShield }: {
  challenge: Challenge; index: number;
  joined: boolean; joining: boolean; proofSent: boolean;
  recoveryActive: boolean; shieldActive: boolean; shieldsAvailable: number;
  walletBalance: number; insufficient: boolean;
  onJoin: () => void; onProof: () => void; onShield: () => void;
}) {
  const { streak } = useAppStore();
  const router = useRouter();
  const dayNum           = c.duration - c.daysLeft;
  const isShieldEligible = c.duration >= 14;
  const canAfford        = walletBalance >= c.entry;
  const tier             = tierStyle[c.tier];
  const perWinner        = Math.round(c.prize * 0.80 / c.winnersCount);

  const cardBorder = joined && shieldActive ? "rgba(96,152,216,0.36)"
    : joined && recoveryActive ? "rgba(224,120,64,0.30)"
    : joining ? "rgba(226,190,116,0.44)"
    : joined ? `rgba(${rgb(c.accentColor)},0.38)`
    : color.border.subtle;

  const cardShadow = joined && shieldActive ? "0 0 28px rgba(96,152,216,0.12)"
    : joining ? "0 0 28px rgba(226,190,116,0.12)"
    : joined ? `0 0 28px rgba(${rgb(c.accentColor)},0.10)`
    : "0 2px 16px rgba(0,0,0,0.45)";

  return (
    <div className="ch-card" onClick={() => router.push(`/challenges/${c.id}`)} style={{ position:"relative", overflow:"hidden", borderRadius:radius.lg, background:c.cardBg, border:`1px solid ${cardBorder}`, padding:"17px 16px 16px", boxShadow: cardShadow, cursor:"pointer", animation: joining ? "commitFlash 1.4s ease both" : `springIn 0.36s cubic-bezier(.175,.885,.32,1.275) ${index*0.07}s both`, transition:"border-color 0.4s ease, box-shadow 0.4s ease" }}>

      {/* Atmosphere layers */}
      <div style={{ position:"absolute", inset:-10, pointerEvents:"none", zIndex:1, background:`radial-gradient(ellipse 70% 65% at 20% 28%, rgba(${rgb(c.accentColor)},0.16) 0%, transparent 60%)`, animation:`atmospherePulse ${5.2+index*0.45}s ease-in-out infinite`, animationDelay:`${-(index*1.3)}s` }} />
      <div style={{ position:"absolute", right:-10, bottom:-4, fontSize:100, opacity:0.038, zIndex:2, pointerEvents:"none", animation:`silhouetteDrift ${7.2+index*0.38}s ease-in-out infinite`, filter:"blur(1.5px)" }}>{c.emoji}</div>
      {c.isLive && <div style={{ position:"absolute", inset:0, borderRadius:radius.lg, zIndex:3, pointerEvents:"none", border:`1px solid rgba(${rgb(c.accentColor)},0.28)`, animation:"borderPulse 3.2s ease-out infinite" }} />}

      <div style={{ position:"relative", zIndex:10 }}>

        {/* Tier + live status only — joined/shield/recovery shown in CTA row */}
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:9 }}>
          <span style={{ padding:"2px 8px", borderRadius:radius.full, background:tier.bg, border:`1px solid ${tier.border}`, fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:tier.text }}>{c.tier}</span>
          {c.isLive && (
            <div style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:radius.full, background:"rgba(77,200,122,0.10)", border:"1px solid rgba(77,200,122,0.22)" }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"#4DC87A", animation:"liveDot 1.8s ease-in-out infinite" }} />
              <span style={{ fontSize:"0.375rem", fontWeight:700, color:"#4DC87A", letterSpacing:"0.07em", textTransform:"uppercase" }}>Live</span>
            </div>
          )}
          {c.community && (
            <span style={{ padding:"2px 7px", borderRadius:radius.full, background:"rgba(255,255,255,0.035)", border:`1px solid ${color.border.faint}`, fontSize:"0.375rem", fontWeight:600, color:color.text.muted, letterSpacing:"0.04em" }}>📍 {c.community}</span>
          )}
        </div>

        {/* Title */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:7, gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <h3 style={{ fontSize:"1.125rem", fontWeight:800, color:color.text.primary, letterSpacing:"-0.03em", margin:"0 0 4px", lineHeight:1.1 }}>{c.title}</h3>
            <p style={{ fontSize:"0.6875rem", color:color.text.muted, margin:0, lineHeight:1 }}>
              {joined ? `Day ${dayNum}/${c.duration} · 🔥 ${streak}d` : `${c.duration}d · ${c.participants} joined`}
            </p>
          </div>
        </div>

        {/* Creator byline — all challenges */}
        {c.creator && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}>
            <div style={{ width:20, height:20, borderRadius:"50%", background:c.creator.bg, border:`1.5px solid rgba(255,255,255,0.14)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.3125rem", fontWeight:800, color:"#fff", flexShrink:0 }}>{c.creator.initials}</div>
            <span style={{ fontSize:"0.5625rem", color:"rgba(255,255,255,0.72)", fontWeight:700 }}>{c.creator.name}</span>
            {c.creator.cred && (
              <>
                <span style={{ fontSize:"0.5625rem", color:color.text.muted }}>·</span>
                <span style={{ fontSize:"0.5625rem", color:color.text.secondary }}>{c.creator.cred}</span>
              </>
            )}
          </div>
        )}

        {/* Financial: prize pool prominent, entry secondary */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"11px 14px", borderRadius:radius.sm, background:"rgba(255,255,255,0.03)", border:`1px solid ${color.border.faint}` }}>
          <div>
            <div style={{ fontSize:"0.375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:color.text.muted, marginBottom:3 }}>Prize Pool</div>
            <div style={{ fontSize:"1rem", fontWeight:900, color:c.accentColor, letterSpacing:"-0.04em", lineHeight:1 }}>⟡ {fmtCoins(c.prize)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"0.375rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:color.text.muted, marginBottom:3 }}>Entry</div>
            <div style={{ fontSize:"0.875rem", fontWeight:800, color:color.gold.bright, letterSpacing:"-0.04em", lineHeight:1 }}>⟡ {fmtCoins(c.entry)}</div>
          </div>
        </div>

        {/* Row 4: Room capacity */}
        <RoomCapacity c={c} />

        {/* CTA */}
        {joining ? (
          <div style={{ padding:"10px 16px", borderRadius:radius.md, background:"rgba(226,190,116,0.08)", border:"1px solid rgba(226,190,116,0.26)", display:"flex", alignItems:"center", justifyContent:"center", gap:8, animation:"youreIn 1.4s ease both" }}>
            <span style={{ fontSize:16 }}>✓</span>
            <div>
              <div style={{ fontSize:"0.75rem", fontWeight:800, color:color.gold.bright, lineHeight:1.1 }}>You're in.</div>
              <div style={{ fontSize:"0.5625rem", color:"rgba(226,190,116,0.60)", marginTop:2 }}>⟡ {c.entry.toLocaleString("en-IN")} coins committed</div>
            </div>
          </div>
        ) : joined ? (
          shieldActive ? (
            <div style={{ padding:"10px 16px", borderRadius:radius.md, background:"rgba(96,152,216,0.09)", border:"1px solid rgba(96,152,216,0.24)", display:"flex", alignItems:"center", justifyContent:"center", gap:6, animation:"shieldEntry 0.45s cubic-bezier(.175,.885,.32,1.275) both" }}>
              <span style={{ fontSize:14 }}>🛡️</span>
              <span style={{ fontSize:"0.75rem", fontWeight:700, color:"#6098D8" }}>ELVN Shield Protected Your Streak</span>
            </div>
          ) : recoveryActive ? (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <div style={{ padding:"8px 12px", borderRadius:radius.sm, background:"rgba(224,120,64,0.08)", border:"1px solid rgba(224,120,64,0.22)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:10, animation:"urgencyPulse 1.6s ease-in-out infinite" }}>⚠️</span>
                  <span style={{ fontSize:"0.625rem", fontWeight:700, color:"#E07840" }}>Recovery Window</span>
                </div>
                <span style={{ fontSize:"0.625rem", fontWeight:800, color:"#E07840", animation:"urgencyPulse 1.6s ease-in-out infinite" }}>{timeToMidnight()}</span>
              </div>
              <div style={{ display:"flex", gap:7 }}>
                {isShieldEligible && (
                  <button className="cta-shield" onClick={(e) => { e.stopPropagation(); onShield(); }} disabled={shieldsAvailable<1}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px", borderRadius:radius.md, cursor:shieldsAvailable<1?"not-allowed":"pointer", background:shieldsAvailable>0?"rgba(96,152,216,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${shieldsAvailable>0?"rgba(96,152,216,0.30)":"rgba(255,255,255,0.08)"}`, opacity:shieldsAvailable<1?0.48:1 }}>
                    <span style={{ fontSize:12 }}>🛡️</span>
                    <span style={{ fontSize:"0.6875rem", fontWeight:700, color:shieldsAvailable>0?"#6098D8":color.text.muted }}>Use Shield</span>
                  </button>
                )}
                <button className="cta-proof" onClick={(e) => { e.stopPropagation(); onProof(); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px", borderRadius:radius.md, background:"rgba(77,200,122,0.09)", border:"1px solid rgba(77,200,122,0.24)", cursor:"pointer" }}>
                  <span style={{ fontSize:12 }}>📸</span>
                  <span style={{ fontSize:"0.6875rem", fontWeight:700, color:"#4DC87A" }}>Post Proof</span>
                </button>
              </div>
            </div>
          ) : proofSent ? (
            <button onClick={(e) => { e.stopPropagation(); router.push(`/challenges/${c.id}`); }} style={{ width:"100%", padding:"10px 16px", borderRadius:radius.md, background:`rgba(${rgb(c.accentColor)},0.08)`, border:`1px solid rgba(${rgb(c.accentColor)},0.22)`, display:"flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer" }}>
              <span style={{ fontSize:11 }}>✓</span>
              <span style={{ fontSize:"0.75rem", fontWeight:700, color:c.accentColor }}>Proof Sent · View Room →</span>
            </button>
          ) : (
            <button className="cta-proof" onClick={(e) => { e.stopPropagation(); onProof(); }} style={{ width:"100%", padding:"11px", borderRadius:radius.md, background:"rgba(77,200,122,0.09)", border:"1px solid rgba(77,200,122,0.26)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span style={{ fontSize:13 }}>📸</span>
              <span style={{ fontSize:"0.75rem", fontWeight:800, color:"#4DC87A", letterSpacing:"0.04em" }}>Post Proof</span>
            </button>
          )
        ) : c.maxParticipants - c.participants <= 0 ? (
          <div style={{ padding:"10px 16px", borderRadius:radius.md, background:"rgba(255,255,255,0.03)", border:`1px solid ${color.border.subtle}`, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
            <span style={{ fontSize:11 }}>🔒</span>
            <span style={{ fontSize:"0.75rem", fontWeight:700, color:color.text.muted }}>Room Full · {c.maxParticipants} members</span>
          </div>
        ) : canAfford ? (
          <button className="cta-join" onClick={(e) => { e.stopPropagation(); onJoin(); }} style={{ width:"100%", padding:"11px", borderRadius:radius.md, background:"linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7, boxShadow:"0 3px 18px rgba(201,168,76,0.36)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"30%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)", animation:"shimmer 3.2s ease-in-out infinite" }} />
            <span style={{ fontSize:"0.75rem", fontWeight:800, color:"#000", letterSpacing:"0.07em", textTransform:"uppercase", position:"relative" }}>Join Room</span>
            <span style={{ fontSize:"0.75rem", fontWeight:600, color:"rgba(0,0,0,0.58)", position:"relative" }}>· ⟡ {fmtCoins(c.entry)}</span>
          </button>
        ) : (
          <button disabled style={{ width:"100%", padding:"11px", borderRadius:radius.md, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", cursor:"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:5, animation: insufficient ? "insufficientShake 0.4s ease" : "none" }}>
            <span style={{ fontSize:"0.75rem", color:color.text.muted }}>⟡ Insufficient coins · Need {fmtCoins(c.entry)}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function RoomCapacity({ c }: { c: Challenge }) {
  const spotsLeft   = c.maxParticipants - c.participants;
  const spotsFilled = Math.round((c.participants / c.maxParticipants) * 100);
  const isCritical  = spotsLeft <= 5;
  const isUrgent    = spotsLeft <= 10 && !isCritical;
  const barColor    = isCritical ? "#E07840" : isUrgent ? "#E2BE74" : c.accentColor;

  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:"0.5625rem", color:color.text.muted }}>{c.participants}/{c.maxParticipants} members</span>
        <span style={{ fontSize:"0.5625rem", fontWeight:700, color: isCritical ? "#E07840" : isUrgent ? "#E2BE74" : color.text.muted, animation: isCritical ? "urgencyPulse 1.6s ease-in-out infinite" : "none" }}>
          {isCritical ? `🔥 ${spotsLeft} left` : isUrgent ? `⚡ ${spotsLeft} left` : `${spotsLeft} open`}
        </span>
      </div>
      <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${spotsFilled}%`, borderRadius:2, background:barColor, transition:"width 0.5s ease" }} />
      </div>
    </div>
  );
}


// ─── City Rankings ────────────────────────────────────────────────────────────
const CITY_ROWS = [
  { rank: 1, city: "Bangalore", score: "12.4K", hot: true  },
  { rank: 2, city: "Mumbai",    score: "11.8K", hot: false },
  { rank: 3, city: "Delhi",     score: "9.1K",  hot: false },
] as const;

function CityRankings() {
  return (
    <div style={{ padding: `14px ${space.screenX}px 0` }}>
      <div style={{ borderRadius: radius.lg, background: "rgba(255,255,255,0.022)", border: `1px solid ${color.border.faint}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${color.border.faint}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.625rem" }}>🏙</span>
            <span style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: color.text.muted }}>City Rankings</span>
          </div>
          <span style={{ fontSize: "0.5625rem", color: color.text.muted, fontWeight: 500 }}>This week</span>
        </div>
        {CITY_ROWS.map((row, i) => (
          <div key={row.city} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: i < 2 ? `1px solid ${color.border.faint}` : "none" }}>
            <span style={{ fontSize: "0.5625rem", fontWeight: 800, color: row.hot ? color.gold.base : color.text.muted, width: 12, textAlign: "center" as const, flexShrink: 0 }}>{row.rank}</span>
            <span style={{ flex: 1, fontSize: "0.8125rem", fontWeight: row.hot ? 700 : 500, color: row.hot ? color.text.primary : color.text.secondary }}>{row.city}</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: row.hot ? color.gold.bright : color.text.secondary, letterSpacing: "-0.03em" }}>{row.score}</span>
            {row.hot && <span style={{ fontSize: 8, marginLeft: 2 }}>🔥</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Friend Proof Strip ───────────────────────────────────────────────────────
function FriendProofStrip() {
  const liveCount = PROOF_RINGS.filter(r => r.status === "live").length;
  return (
    <div style={{ paddingTop: 22 }}>
      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: `0 ${space.screenX}px`, marginBottom: 13 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4DC87A", animation: "liveDot 1.8s ease-in-out infinite", flexShrink: 0 }} />
        <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: color.text.muted, letterSpacing: "0.10em", textTransform: "uppercase" }}>Friends · active today</span>
        {liveCount > 0 && (
          <span style={{ fontSize: "0.5rem", padding: "2px 7px", borderRadius: radius.full, background: "rgba(77,200,122,0.09)", border: "1px solid rgba(77,200,122,0.20)", color: "#4DC87A", fontWeight: 700, letterSpacing: "0.05em" }}>{liveCount} live</span>
        )}
      </div>

      <div className="no-scrollbar" style={{ display: "flex", gap: 18, paddingLeft: space.screenX, paddingRight: space.screenX, overflowX: "auto" }}>
        {PROOF_RINGS.map((r, i) => {
          const isPending = r.status === "pending";
          const isYou     = r.initials === "ME";
          const isLive    = r.status === "live";
          const ringBg    = isPending
            ? "rgba(255,255,255,0.07)"
            : isLive
              ? "linear-gradient(135deg,#5ED68A,rgba(77,200,122,0.58))"
              : r.status === "shield"
                ? "linear-gradient(135deg,rgba(96,152,216,0.55),rgba(96,152,216,0.22))"
                : "linear-gradient(135deg,rgba(77,200,122,0.42),rgba(77,200,122,0.14))";
          const ringGlow  = isPending ? "none"
            : isLive ? "0 0 18px rgba(77,200,122,0.36)"
            : r.status === "shield" ? "0 0 10px rgba(96,152,216,0.16)"
            : "0 0 8px rgba(77,200,122,0.10)";
          const rowOpacity = isPending ? 0.36 : isLive ? 1.0 : 0.84;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, opacity: rowOpacity, transition: "opacity 0.3s ease" }}>
              <div style={{ position: "relative" }}>
                {isLive && (
                  <div style={{ position: "absolute", inset: -5, borderRadius: "50%", background: "radial-gradient(circle, rgba(77,200,122,0.26) 0%, transparent 68%)", animation: "ringGlow 2s ease-in-out infinite", pointerEvents: "none" }} />
                )}
                <div style={{ width: 44, height: 44, borderRadius: "50%", padding: 2, background: ringBg, boxShadow: ringGlow }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#090909", padding: 2 }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", fontWeight: 800, color: "#fff" }}>
                      {r.initials}
                    </div>
                  </div>
                </div>
                {isPending && isYou && (
                  <div style={{ position: "absolute", bottom: 1, right: 1, width: 13, height: 13, borderRadius: "50%", background: "rgba(226,190,116,0.92)", border: "1.5px solid #090909", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 800, color: "#000", animation: "urgencyPulse 1.8s ease-in-out infinite" }}>!</div>
                )}
              </div>
              <span style={{ fontSize: "0.4375rem", fontWeight: 600, color: isPending ? color.text.muted : color.text.tertiary, lineHeight: 1 }}>
                {r.name}
              </span>
              <span style={{ fontSize: "0.375rem", color: isLive ? "#4DC87A" : isPending && isYou ? color.gold.base : color.text.muted, fontWeight: isLive ? 700 : 500, letterSpacing: isLive ? "0.09em" : "0", marginTop: -2 }}>
                {isLive ? "LIVE" : isPending && isYou ? "POST" : r.timeAgo || "—"}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ margin: `16px ${space.screenX}px 0`, height: 1, background: color.border.faint }} />
    </div>
  );
}
