"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Zap, X, RotateCcw } from "lucide-react";
import { color, radius, motion } from "@/lib/tokens";
import { ALL_CHALLENGES } from "@/lib/challengeData";
import { useAppStore } from "@/lib/appStore";
import { supabase } from "@/lib/supabaseClient";

// ─── Data (module-level — never re-created) ───────────────────────────────────
const MODES = [
  { id: "workout",  label: "Workout",  emoji: "🏋️", accent: "#E2BE74" },
  { id: "run",      label: "Run",      emoji: "🏃", accent: "#4DC87A" },
  { id: "meal",     label: "Meal",     emoji: "🥗", accent: "#4E88D4" },
  { id: "progress", label: "Progress", emoji: "📈", accent: "#D46A30" },
  { id: "recovery", label: "Recovery", emoji: "😴", accent: "#8B8BDE" },
] as const;

const FRIENDS = [
  { id: 1, name: "Arjun",  initials: "AR", avatarBg: "linear-gradient(135deg,#7A4A18,#3A2008)", accent: "#E2BE74" },
  { id: 2, name: "Priya",  initials: "PK", avatarBg: "linear-gradient(135deg,#145C38,#062010)", accent: "#4DC87A" },
  { id: 3, name: "Neha",   initials: "NE", avatarBg: "linear-gradient(135deg,#6A2A10,#2A0E06)", accent: "#E07840" },
  { id: 4, name: "Vikram", initials: "VI", avatarBg: "linear-gradient(135deg,#2C2870,#0E0C28)", accent: "#8B8BDE" },
] as const;

const SOCIAL_BLIPS = [
  "3 proving right now",
  "Priya posted 2m ago",
  "HSR active tonight",
  "47 proofs today",
  "Arjun is live",
  "2 friends already posted",
] as const;

const GHOST: Record<string, string> = {
  workout:  "🏋️",
  run:      "🏃",
  meal:     "🥗",
  progress: "📊",
  recovery: "🧘",
};

type Stage = "viewfinder" | "preview" | "posted";

// ─── Pure helper — compute time-to-midnight outside the component ─────────────
function computeTimeLeft() {
  const now      = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff     = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { timeLeft: `${h}h ${m}m`, isUrgent: diff < 2 * 3600000 };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CameraPage() {
  const searchParams = useSearchParams();
  const paramId      = Number(searchParams.get("id") ?? 1) || 1;

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage,       setStage]       = useState<Stage>("viewfinder");
  const [mode,        setMode]        = useState("workout");
  const [challengeId, setChallengeId] = useState(paramId);
  const [sending,     setSending]     = useState(false);
  const [flashOn,     setFlashOn]     = useState(false);
  const [flash,       setFlash]       = useState(false);
  const [facingMode,  setFacingMode]  = useState<"environment" | "user">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [snapUrl,     setSnapUrl]     = useState<string | null>(null);
  const [sentIds,     setSentIds]     = useState<Set<number>>(new Set());
  const [blipIdx,     setBlipIdx]     = useState(0);

  // time-to-midnight — initialized once, updated every minute via interval
  const [timeState, setTimeState] = useState(computeTimeLeft);
  const { timeLeft, isUrgent } = timeState;

  const { streak, coins, provedToday, joined: joinedSet, proofSent, claimedChallenges, sendProof: storeProof } = useAppStore();

  // ── All hooks must be called before any early return ────────────────────────

  // Update clock every minute instead of recomputing on every render
  useEffect(() => {
    const id = setInterval(() => setTimeState(computeTimeLeft()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Camera stream lifecycle
  useEffect(() => {
    if (stage !== "viewfinder") return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    setCameraReady(false);
    setCameraError(false);

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false })
        .then(s => {
          if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
            setCameraReady(true);
          }
        })
        .catch(() => { if (!cancelled) setCameraError(true); });
    } else {
      setCameraError(true);
    }

    return () => {
      cancelled = true;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stage, facingMode]);

  // Auto-return from posted screen
  useEffect(() => {
    if (stage !== "posted") return;
    const t = setTimeout(() => {
      setStage("viewfinder");
      setSnapUrl(null);
      setSentIds(prev => (prev.size === 0 ? prev : new Set()));
    }, 3400);
    return () => clearTimeout(t);
  }, [stage]);

  // Rotate social blips
  useEffect(() => {
    const id = setInterval(() => setBlipIdx(n => n + 1), 3800);
    return () => clearInterval(id);
  }, []);

  // Cleanup snap timers on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, []);

  // ── Derived data — memoized so references are stable across renders ─────────

  // Only recomputes when the joined-challenges Set changes, not on every render
  const CAM_CHALLENGES = useMemo(() => {
    const list = ALL_CHALLENGES
      .filter(c => joinedSet.has(c.id))
      .map(c => ({ id: c.id, label: c.title, emoji: c.emoji, accent: c.accentColor }));
    return list.length > 0
      ? list
      : ALL_CHALLENGES.slice(0, 3).map(c => ({ id: c.id, label: c.title, emoji: c.emoji, accent: c.accentColor }));
  }, [joinedSet]);

  const activeMode = useMemo(
    () => MODES.find(m => m.id === mode) ?? MODES[0],
    [mode]
  );

  const activeChallenge = useMemo(
    () => CAM_CHALLENGES.find(c => c.id === challengeId) ?? CAM_CHALLENGES[0],
    [CAM_CHALLENGES, challengeId]
  );

  // ── Stable event handlers ────────────────────────────────────────────────────

  const handleSnap = useCallback(() => {
    setFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(false), 220);

    if (videoRef.current && canvasRef.current && cameraReady) {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width  = v.videoWidth  || 640;
      c.height = v.videoHeight || 480;
      c.getContext("2d")?.drawImage(v, 0, 0);
      setSnapUrl(c.toDataURL("image/jpeg", 0.92));
    }

    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    stageTimerRef.current = setTimeout(() => {
      setStage("preview");
      setSentIds(new Set());
    }, 260);
  }, [cameraReady]);

  const handleFlip = useCallback(() => {
    setFacingMode(f => f === "environment" ? "user" : "environment");
  }, []);

  const handleFlashToggle = useCallback(() => setFlashOn(f => !f), []);

  const handleSentToggle = useCallback((fId: number) => {
    setSentIds(prev => {
      const next = new Set(prev);
      next.has(fId) ? next.delete(fId) : next.add(fId);
      return next;
    });
  }, []);

  const handleRetake = useCallback(() => {
    setStage("viewfinder");
    setSnapUrl(null);
  }, []);

  const handleSendProof = useCallback(async () => {
    if (sending) return;
    setSending(true);

    let imageUrl: string | undefined;

    // Upload photo to Supabase Storage if we have a snap
    if (snapUrl && canvasRef.current) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          // Convert data URL to Blob
          const res  = await fetch(snapUrl);
          const blob = await res.blob();
          const path = `${uid}/${Date.now()}.jpg`;
          const { error } = await supabase.storage
            .from("proof-images")
            .upload(path, blob, { contentType: "image/jpeg", upsert: false });
          if (!error) {
            const { data } = supabase.storage.from("proof-images").getPublicUrl(path);
            imageUrl = data.publicUrl;
          }
        }
      } catch {
        // Upload failed — still submit proof without image
      }
    }

    storeProof(activeChallenge?.id ?? challengeId, imageUrl);
    setSending(false);
    setTimeout(() => setStage("posted"), 280);
  }, [sending, snapUrl, storeProof, activeChallenge, challengeId]);

  // ── Early returns (all hooks are above this line) ────────────────────────────

  // ── POSTED ──────────────────────────────────────────────────────────────────
  if (stage === "posted") {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse 65% 55% at 50% 44%, rgba(61,191,110,0.08) 0%, transparent 70%), #000",
        padding: "0 32px",
      }}>
        <div style={{
          width: 92, height: 92, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(61,191,110,0.20) 0%, transparent 70%)",
          border: "2px solid rgba(61,191,110,0.38)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 0 60px rgba(61,191,110,0.16)",
          animation: "postedBounce 0.48s cubic-bezier(.175,.885,.32,1.275) both",
        }}>
          <Check size={40} style={{ color: "#4DC87A" }} />
        </div>

        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.045em", color: "#fff", margin: "0 0 8px", textAlign: "center", lineHeight: 1 }}>
          Proof Sent 🔥
        </h2>
        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.44)", margin: "0 0 28px", textAlign: "center", lineHeight: 1.6 }}>
          Streak extended · Squad notified<br />{activeChallenge.label} updated
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 22px", borderRadius: radius.full, background: "rgba(201,168,76,0.10)", border: `1px solid ${color.gold.border}` }}>
          <Zap size={14} style={{ color: color.gold.base }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: color.gold.base }}>+50 pts · ⟡ {coins.toLocaleString("en-IN")} total</span>
        </div>

        {/* Claim prize shortcut — shown if proof is now eligible */}
        {proofSent.has(activeChallenge?.id ?? challengeId) && !claimedChallenges.has(activeChallenge?.id ?? challengeId) ? (
          <Link
            href={`/challenges/${activeChallenge?.id ?? challengeId}`}
            style={{
              marginTop: 20,
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: radius.full,
              background: "linear-gradient(135deg,rgba(226,190,116,0.18),rgba(201,168,76,0.10))",
              border: `1px solid ${color.gold.border}`,
              textDecoration: "none",
              fontSize: "0.875rem", fontWeight: 800, color: color.gold.bright,
              letterSpacing: "0.02em",
              boxShadow: "0 0 24px rgba(201,168,76,0.16)",
            }}
          >
            <span>🏆</span> Claim Prize →
          </Link>
        ) : (
          <Link
            href={`/challenges/${activeChallenge?.id ?? challengeId}`}
            style={{
              marginTop: 20,
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: radius.full,
              background: "rgba(201,168,76,0.10)", border: `1px solid ${color.gold.border}`,
              textDecoration: "none",
              fontSize: "0.8125rem", fontWeight: 700, color: color.gold.base,
              letterSpacing: "0.02em",
            }}
          >
            View Room →
          </Link>
        )}

        <p style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 24 }}>
          Returning to camera…
        </p>

        <style>{`
          @keyframes postedBounce {
            0%   { opacity:0; transform:scale(.55); }
            65%  { opacity:1; transform:scale(1.06); }
            100% { opacity:1; transform:scale(1);    }
          }
        `}</style>
      </div>
    );
  }

  // ── PREVIEW / SHARE ─────────────────────────────────────────────────────────
  if (stage === "preview") {
    return (
      <div style={{ height: "100%", position: "relative", overflow: "hidden", background: "#000" }}>

        {snapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={snapUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 75% 65% at 50% 36%, rgba(22,30,22,1) 0%, rgba(8,10,8,1) 52%, #050508 100%)",
          }} />
        )}

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 38%, rgba(0,0,0,0.75) 100%)" }} />

        {/* Top: mode chip + retake */}
        <div style={{ position: "absolute", top: 14, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: radius.full, background: "rgba(0,0,0,0.58)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${activeMode.accent}30` }}>
            <span style={{ fontSize: 13 }}>{activeMode.emoji}</span>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: activeMode.accent, letterSpacing: "0.04em" }}>{activeMode.label}</span>
          </div>
          <button
            onClick={handleRetake}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.58)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={16} color="rgba(255,255,255,0.84)" />
          </button>
        </div>

        {/* Share panel */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          background: "rgba(4,5,8,0.96)",
          backdropFilter: "blur(52px)", WebkitBackdropFilter: "blur(52px)",
          borderRadius: "24px 24px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "14px 20px 26px",
          animation: "shareSlideUp 0.34s cubic-bezier(.175,.885,.32,1.275) both",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.11)" }} />
          </div>

          <p style={{ fontSize: "0.4875rem", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.24)", textTransform: "uppercase", margin: "0 0 8px" }}>
            Tag Challenge
          </p>
          <div className="no-scrollbar" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 16 }}>
            {CAM_CHALLENGES.map(ch => {
              const active  = challengeId === ch.id;
              const claimed = claimedChallenges.has(ch.id);
              const proved  = proofSent.has(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => setChallengeId(ch.id)}
                  style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: radius.full,
                    background: active ? `${ch.accent}18` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${active ? ch.accent + "3A" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer", transition: `all ${motion.fast}`,
                    boxShadow: active ? `0 0 14px ${ch.accent}18` : "none",
                    opacity: claimed ? 0.45 : 1,
                  }}
                >
                  <span style={{ fontSize: 11 }}>{claimed ? "🏆" : ch.emoji}</span>
                  <span style={{ fontSize: "0.625rem", fontWeight: active ? 700 : 500, color: active ? ch.accent : "rgba(255,255,255,0.48)" }}>
                    {claimed ? "Won" : proved ? `${ch.label} ✓` : ch.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Streak impact */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 15,
            background: provedToday ? "rgba(77,200,122,0.05)" : "rgba(255,255,255,0.04)",
            border: provedToday ? "1px solid rgba(77,200,122,0.18)" : "1px solid rgba(255,255,255,0.07)",
            marginBottom: 16,
            transition: "background 0.28s ease, border-color 0.28s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ fontSize: 22 }}>{provedToday ? "✅" : "🔥"}</span>
              <div>
                <p style={{ fontSize: "0.4875rem", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", margin: "0 0 3px" }}>
                  {provedToday ? "Streak Active" : "Streak Impact"}
                </p>
                {provedToday ? (
                  <p style={{ fontSize: "1rem", fontWeight: 800, color: "#4DC87A", margin: 0, letterSpacing: "-0.03em" }}>
                    {streak} days · proved today ✓
                  </p>
                ) : (
                  <p style={{ fontSize: "1rem", fontWeight: 800, color: "#E2BE74", margin: 0, letterSpacing: "-0.03em" }}>
                    {streak} → <span style={{ color: "#4DC87A" }}>{streak + 1} days</span>
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: radius.full, background: "rgba(201,168,76,0.10)", border: `1px solid ${color.gold.border}` }}>
              <Zap size={11} style={{ color: color.gold.base }} />
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: color.gold.base }}>+50 pts</span>
            </div>
          </div>

          <p style={{ fontSize: "0.4875rem", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.24)", textTransform: "uppercase", margin: "0 0 10px" }}>
            Send to Squad
          </p>
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            {FRIENDS.map(f => {
              const isSent = sentIds.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => handleSentToggle(f.id)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
                >
                  <div style={{
                    position: "relative",
                    width: 48, height: 48, borderRadius: "50%",
                    background: f.avatarBg,
                    border: `2px solid ${isSent ? f.accent : "rgba(255,255,255,0.12)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: isSent ? `0 0 20px ${f.accent}38` : "none",
                    transition: `border-color ${motion.base}, box-shadow ${motion.base}`,
                  }}>
                    {isSent
                      ? <Check size={16} style={{ color: f.accent }} />
                      : <span style={{ fontSize: "0.625rem", fontWeight: 800, color: "#fff" }}>{f.initials}</span>
                    }
                    {isSent && (
                      <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: f.accent, border: "2px solid #040508", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={7} color="#000" />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "0.5rem", fontWeight: 600, color: isSent ? f.accent : "rgba(255,255,255,0.32)", transition: `color ${motion.fast}` }}>
                    {f.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStage("preview")}
              style={{ flex: 1, padding: "13px 0", borderRadius: radius.full, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.72)", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em" }}
            >
              📖 Story
            </button>
            <button
              onClick={handleSendProof}
              disabled={sending}
              style={{ flex: 2, padding: "13px 0", borderRadius: radius.full, background: sending ? "rgba(255,255,255,0.06)" : color.gold.gradient, border: "none", color: sending ? "rgba(255,255,255,0.38)" : "#000", fontSize: "0.875rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", cursor: sending ? "not-allowed" : "pointer", boxShadow: sending ? "none" : "0 4px 24px rgba(201,168,76,0.40)", transition: "background 0.2s ease, color 0.2s ease" }}
            >
              {sending ? "Uploading…" : "Send Proof 🔥"}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes shareSlideUp {
            0%   { opacity:0; transform:translateY(100%); }
            100% { opacity:1; transform:translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── VIEWFINDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", background: "#000" }}>

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ── Camera / ambient background ─────────────────────────────────── */}
      {cameraReady ? (
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 85% 75% at 50% 40%, rgba(18,24,18,1) 0%, rgba(8,10,8,1) 50%, #030305 100%)",
        }}>
          {/* Mode-tinted ambient layers */}
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse 65% 55% at 28% 62%, ${activeMode.accent}0D 0%, transparent 65%)`,
            animation: "ambientDrift 7.5s ease-in-out infinite",
            transition: "background 0.6s ease",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse 50% 42% at 72% 32%, ${activeMode.accent}08 0%, transparent 55%)`,
            animation: "ambientDrift 9.5s ease-in-out infinite reverse",
            transition: "background 0.6s ease",
          }} />
          {/* Slow cinematic light sweep */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(108deg, transparent 28%, rgba(255,255,255,0.009) 50%, transparent 72%)",
            animation: "camLightSweep 7s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          {/* Ghost proof silhouette */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span
              key={mode}
              style={{
                fontSize: 210, lineHeight: 1,
                opacity: 0.030,
                filter: "blur(4px) saturate(0)",
                animation: "ghostDrift 9s ease-in-out infinite",
                userSelect: "none",
                display: "block",
                transition: "opacity 0.5s ease",
              }}
            >
              {GHOST[mode] ?? activeMode.emoji}
            </span>
          </div>
          {/* Depth gradient */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.36) 100%)" }} />
          {cameraError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 80 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 26, opacity: 0.18 }}>📷</span>
              </div>
              <p style={{ fontSize: "0.5625rem", letterSpacing: "0.11em", color: "rgba(255,255,255,0.16)", textTransform: "uppercase" }}>Camera unavailable</p>
            </div>
          )}
        </div>
      )}

      {/* Cinematic edge vignette */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "radial-gradient(ellipse 72% 66% at 50% 42%, transparent 26%, rgba(0,0,0,0.52) 66%, rgba(0,0,0,0.82) 100%)" }} />

      {/* Camera flash */}
      {flash && (
        <div style={{ position: "absolute", inset: 0, zIndex: 30, background: "#fff", pointerEvents: "none", animation: "cameraFlash 0.22s ease-out both" }} />
      )}

      {/* ── Top ambient social presence ────────────────────────────────── */}
      <div style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left: active challenge tag */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: radius.full, background: "rgba(0,0,0,0.60)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 2px 14px rgba(0,0,0,0.42)" }}>
            <span style={{ fontSize: 10 }}>{activeChallenge.emoji}</span>
            <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: "rgba(255,255,255,0.50)", letterSpacing: "0.01em", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeChallenge.label}
            </span>
          </div>
          {/* Right: rotating live social blip */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: radius.full, background: "rgba(0,0,0,0.60)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(77,200,122,0.22)", boxShadow: "0 2px 14px rgba(0,0,0,0.42)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4DC87A", animation: "nearbyPulse 1.6s ease-in-out infinite", flexShrink: 0 }} />
            <span
              key={blipIdx}
              style={{ fontSize: "0.5625rem", fontWeight: 600, color: "#4DC87A", letterSpacing: "0.01em", animation: "blipFade 0.36s ease both" }}
            >
              {SOCIAL_BLIPS[blipIdx % SOCIAL_BLIPS.length]}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom controls ─────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
        background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.66) 58%, transparent 100%)",
        padding: "0 20px 28px",
      }}>

        {/* Streak + accountability cue */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11, animation: "flamePulse 2.4s ease-in-out infinite" }}>🔥</span>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#E2BE74", letterSpacing: "0.01em" }}>{streak} day streak</span>
          </div>
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.18)", flexShrink: 0 }} />
          <span style={{
            fontSize: "0.5625rem",
            fontWeight: 500,
            color: isUrgent ? "#E07840" : "rgba(255,255,255,0.34)",
            animation: isUrgent ? "urgencyPulse 1.8s ease-in-out infinite" : "none",
            letterSpacing: "0.01em",
          }}>
            {isUrgent ? "⚠️ " : ""}{timeLeft} to protect it
          </span>
        </div>

        {/* Mode pills */}
        <div className="no-scrollbar" style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 22, overflowX: "auto", padding: "2px 4px" }}>
          {MODES.map(m => {
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 5,
                  padding: active ? "8px 16px" : "7px 13px",
                  borderRadius: radius.full,
                  background: active ? `${m.accent}24` : "rgba(0,0,0,0.54)",
                  backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                  border: `1px solid ${active ? m.accent + "55" : "rgba(255,255,255,0.10)"}`,
                  cursor: "pointer",
                  transition: "all 0.22s cubic-bezier(.175,.885,.32,1.275)",
                  boxShadow: active ? `0 0 22px ${m.accent}2A, 0 3px 18px rgba(0,0,0,0.55)` : "0 2px 10px rgba(0,0,0,0.38)",
                  transform: active ? "scale(1.04)" : "scale(1)",
                }}
              >
                <span style={{ fontSize: active ? 13 : 11, transition: "font-size 0.2s ease" }}>{m.emoji}</span>
                <span style={{ fontSize: active ? "0.75rem" : "0.6875rem", fontWeight: active ? 700 : 500, color: active ? m.accent : "rgba(255,255,255,0.46)", letterSpacing: "0.02em", transition: "all 0.2s ease" }}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shutter row: flip — ceremonial shutter — flash */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 16 }}>

          {/* Flip camera */}
          <button
            onClick={handleFlip}
            style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.09)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.18s cubic-bezier(.175,.885,.32,1.275)", boxShadow: "0 2px 14px rgba(0,0,0,0.50)" }}
            onPointerDown={e => (e.currentTarget.style.transform = "scale(0.90) rotate(-18deg)")}
            onPointerUp={e => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
          >
            <RotateCcw size={18} color="rgba(255,255,255,0.76)" />
          </button>

          {/* ── Ceremonial shutter ── */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Outermost ambient aura */}
            <div style={{
              position: "absolute",
              width: 150, height: 150, borderRadius: "50%",
              background: `radial-gradient(circle, ${activeMode.accent}16 0%, transparent 68%)`,
              animation: isUrgent ? "shutterAuraUrgent 1.5s ease-in-out infinite" : "shutterAura 2.8s ease-in-out infinite",
              pointerEvents: "none",
              transition: "background 0.45s ease",
            }} />
            {/* Cinematic expanding ring */}
            <div style={{
              position: "absolute",
              width: 106, height: 106, borderRadius: "50%",
              border: `1px solid ${activeMode.accent}22`,
              animation: isUrgent ? "ringExpandUrgent 1.5s ease-in-out infinite" : "ringExpand 2.8s ease-in-out infinite",
              pointerEvents: "none",
              transition: "border-color 0.45s ease",
            }} />
            {/* Main shutter button */}
            <button
              onClick={handleSnap}
              style={{
                width: 84, height: 84, borderRadius: "50%",
                background: "transparent",
                border: `3px solid ${activeMode.accent}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative", zIndex: 2,
                boxShadow: [
                  `0 0 0 5px ${activeMode.accent}12`,
                  `0 0 0 10px ${activeMode.accent}07`,
                  `0 10px 44px rgba(0,0,0,0.90)`,
                  `0 0 36px ${activeMode.accent}3A`,
                ].join(", "),
                transition: "transform 0.12s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease, border-color 0.35s ease",
              }}
              onPointerDown={e => {
                e.currentTarget.style.transform = "scale(0.91)";
                e.currentTarget.style.boxShadow = [
                  `0 0 0 5px ${activeMode.accent}1C`,
                  `0 0 0 10px ${activeMode.accent}0C`,
                  `0 6px 28px rgba(0,0,0,0.96)`,
                  `0 0 52px ${activeMode.accent}58`,
                ].join(", ");
              }}
              onPointerUp={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = [
                  `0 0 0 5px ${activeMode.accent}12`,
                  `0 0 0 10px ${activeMode.accent}07`,
                  `0 10px 44px rgba(0,0,0,0.90)`,
                  `0 0 36px ${activeMode.accent}3A`,
                ].join(", ");
              }}
              onPointerLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = [
                  `0 0 0 5px ${activeMode.accent}12`,
                  `0 0 0 10px ${activeMode.accent}07`,
                  `0 10px 44px rgba(0,0,0,0.90)`,
                  `0 0 36px ${activeMode.accent}3A`,
                ].join(", ");
              }}
            >
              {/* Inner fill */}
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: `radial-gradient(circle at 38% 36%, ${activeMode.accent} 0%, ${activeMode.accent}CC 55%, ${activeMode.accent}99 100%)`,
                boxShadow: `0 0 30px ${activeMode.accent}80, inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.16)`,
                animation: isUrgent ? "innerGlowUrgent 1.5s ease-in-out infinite" : "innerGlow 2.8s ease-in-out infinite",
                transition: "background 0.35s ease, box-shadow 0.35s ease",
              }} />
            </button>
          </div>

          {/* Flash toggle */}
          <button
            onClick={handleFlashToggle}
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: flashOn ? "rgba(255,220,60,0.16)" : "rgba(255,255,255,0.09)",
              backdropFilter: "blur(14px)",
              border: flashOn ? "1px solid rgba(255,220,60,0.40)" : "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: `all ${motion.fast}`,
              boxShadow: flashOn ? "0 0 18px rgba(255,220,60,0.28)" : "0 2px 14px rgba(0,0,0,0.50)",
            }}
          >
            <Zap size={18} style={{ color: flashOn ? "#FFD840" : "rgba(255,255,255,0.76)", fill: flashOn ? "#FFD840" : "none" }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cameraFlash {
          0%   { opacity:0.88; }
          100% { opacity:0;    }
        }
        @keyframes shutterAura {
          0%,100% { opacity:0.48; transform:scale(1.00); }
          50%     { opacity:1.00; transform:scale(1.18); }
        }
        @keyframes shutterAuraUrgent {
          0%,100% { opacity:0.58; transform:scale(1.00); }
          50%     { opacity:1.00; transform:scale(1.26); }
        }
        @keyframes ringExpand {
          0%,100% { opacity:0.28; transform:scale(1.00); }
          50%     { opacity:0.58; transform:scale(1.09); }
        }
        @keyframes ringExpandUrgent {
          0%,100% { opacity:0.38; transform:scale(1.00); }
          50%     { opacity:0.82; transform:scale(1.13); }
        }
        @keyframes innerGlow {
          0%,100% { opacity:0.90; transform:scale(1.00); }
          50%     { opacity:1.00; transform:scale(1.04); }
        }
        @keyframes innerGlowUrgent {
          0%,100% { opacity:0.84; transform:scale(1.00); }
          50%     { opacity:1.00; transform:scale(1.07); filter:brightness(1.13); }
        }
        @keyframes nearbyPulse {
          0%,100% { opacity:1;    transform:scale(1);    }
          50%     { opacity:0.36; transform:scale(0.80); }
        }
        @keyframes ambientDrift {
          0%,100% { opacity:0.62; transform:scale(1)    translateY(0px);  }
          50%     { opacity:1.00; transform:scale(1.14) translateY(-9px); }
        }
        @keyframes camLightSweep {
          0%,28%  { transform:translateX(-180%); }
          72%,100%{ transform:translateX(380%);  }
        }
        @keyframes ghostDrift {
          0%,100% { transform:translateY(0px)  scale(1.00); }
          50%     { transform:translateY(-14px) scale(1.03); }
        }
        @keyframes blipFade {
          0%   { opacity:0; transform:translateY(4px); }
          100% { opacity:1; transform:translateY(0);   }
        }
        @keyframes flamePulse {
          0%,100% { opacity:1;    transform:scale(1);    }
          50%     { opacity:0.65; transform:scale(0.88); }
        }
        @keyframes urgencyPulse {
          0%,100% { opacity:1;    }
          50%     { opacity:0.40; }
        }
      `}</style>
    </div>
  );
}
