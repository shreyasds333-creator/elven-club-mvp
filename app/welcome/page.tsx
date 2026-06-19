"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useAuth } from "@/lib/authStore";
import { color, shadow, space } from "@/lib/tokens";

const E  = [0.22, 1, 0.36, 1] as const;
const EX = [0.4, 0, 0.8, 1]   as const;

// ─── Feature slides ───────────────────────────────────────────────────────────

const SLIDES = [
  {
    emoji:   "⚡",
    title:   "Stake Real Coins",
    body:    "Join a challenge, put coins on the line, and prove you showed up every single day.",
    accent:  "#E2BE74",
    glow:    "rgba(201,168,76,0.18)",
    tag:     "COMMIT",
  },
  {
    emoji:   "📸",
    title:   "Device-Verified Proof",
    body:    "No shortcuts. Post your workout daily. Steps tracked. Camera doesn't lie.",
    accent:  "#4DC87A",
    glow:    "rgba(77,200,122,0.16)",
    tag:     "PROVE",
  },
  {
    emoji:   "🏆",
    title:   "Win the Prize Pool",
    body:    "Top performers split 80% of the pot. Discipline pays. Miss a day, lose your stake.",
    accent:  "#8B8BDE",
    glow:    "rgba(139,139,222,0.16)",
    tag:     "WIN",
  },
];

// ─── Handle helpers ───────────────────────────────────────────────────────────

function genHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 13);
}

function genSuggestions(name: string): string[] {
  const n    = name.toLowerCase().replace(/[^a-z]/g, "");
  if (!n) return [];
  const base = n.slice(0, Math.min(n.length, 11));
  const seed = n.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [base, `${base}${(seed % 89) + 11}`, `the.${base}`];
}

function mockAvailable(h: string): boolean {
  const s = h.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (s * 31) % 11 !== 0;
}

type AvailStatus = "idle" | "checking" | "available" | "taken" | "short";
type Phase       = "hero" | "features" | "form" | "otp";

const INPUT: React.CSSProperties = {
  width: "100%", background: "none", border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  paddingBottom: 14,
  fontSize: "1.0625rem", fontWeight: 500, letterSpacing: "-0.01em",
  color: "#fff", outline: "none",
};

const LABEL: React.CSSProperties = {
  fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.34)",
  display: "block", marginBottom: 10,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router               = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const nameRef              = useRef<HTMLInputElement>(null);

  const [phase,         setPhase]         = useState<Phase>("hero");
  const [slideIdx,      setSlideIdx]      = useState(0);
  const [name,          setName]          = useState("");
  const [handle,        setHandle]        = useState("");
  const [handleEdited,  setHandleEdited]  = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);
  const [email,         setEmail]         = useState("");
  const [otpCode,       setOtpCode]       = useState("");
  const [avail,         setAvail]         = useState<AvailStatus>("idle");
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [entering,      setEntering]      = useState(false);

  // Drag to swipe between feature slides
  const dragX = useMotionValue(0);

  // Handle auto-fill
  useEffect(() => {
    if (!handleEdited) setHandle(genHandle(name));
  }, [name, handleEdited]);

  // Handle availability debounce
  useEffect(() => {
    if (!handle)           { setAvail("idle");  return; }
    if (handle.length < 3) { setAvail("short"); return; }
    setAvail("checking");
    const t = setTimeout(() => setAvail(mockAvailable(handle) ? "available" : "taken"), 380);
    return () => clearTimeout(t);
  }, [handle]);

  const suggestions = genSuggestions(name);

  function goToSlide(idx: number) {
    setSlideIdx(Math.max(0, Math.min(SLIDES.length - 1, idx)));
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < -50) goToSlide(slideIdx + 1);
    else if (info.offset.x > 50) goToSlide(slideIdx - 1);
    dragX.set(0);
  }

  const canSubmit = (
    name.trim().length >= 1
    && handle.length >= 3
    && avail !== "taken"
    && email.includes("@") && email.includes(".")
    && !loading
  );

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try { localStorage.setItem("elvn_onboarding", "1"); } catch {}

    const { error: err } = await sendOtp(email.trim().toLowerCase(), name.trim(), handle);
    if (err) { setError(err); setLoading(false); return; }
    setLoading(false);
    setPhase("otp");
  }

  async function verifyCode() {
    if (otpCode.length < 6 || loading) return;
    setLoading(true);
    setError("");
    const { error: err } = await verifyOtp(email.trim().toLowerCase(), otpCode);
    if (err) { setError(err); setLoading(false); return; }
    setEntering(true);
    setTimeout(() => router.replace("/challenges"), 840);
  }

  const slide = SLIDES[slideIdx];

  // ── Availability colours ──────────────────────────────────────────────────
  const availColor =
    avail === "available" ? "#4DC87A" :
    avail === "taken"     ? "#E07840" : "rgba(255,255,255,0.28)";

  const handleBorder = handleFocused
    ? avail === "taken"     ? "rgba(224,120,64,0.55)"
    : avail === "available" ? "rgba(77,200,122,0.50)"
    :                         "rgba(201,168,76,0.55)"
    : "rgba(255,255,255,0.10)";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#000", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* Ambient glow — shifts per slide accent */}
      <motion.div
        animate={{ background: `radial-gradient(circle, ${slide?.glow ?? "rgba(201,168,76,0.14)"} 0%, transparent 70%)` }}
        transition={{ duration: 0.8 }}
        style={{
          position: "absolute", top: "-20%", left: "50%",
          transform: "translateX(-50%)",
          width: "80vw", height: "80vw", borderRadius: "50%",
          filter: "blur(80px)", pointerEvents: "none",
        }}
      />
      <div className="grain" />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "hero" && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            style={{
              position: "absolute", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column",
              justifyContent: "space-between",
              padding: `calc(env(safe-area-inset-top,0px) + 52px) ${space.screenX}px calc(env(safe-area-inset-bottom,0px) + 48px)`,
            }}
          >
            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: E, delay: 0.1 }}
            >
              <span style={{
                fontSize: "0.625rem", fontWeight: 800,
                letterSpacing: "0.38em", paddingLeft: "0.38em",
                textTransform: "uppercase", color: "rgba(226,190,116,0.72)",
              }}>ELVN CLUB</span>
            </motion.div>

            {/* Core copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 32, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, ease: E, delay: 0.22 }}
              >
                <h1 style={{
                  fontSize: "clamp(2.8rem, 13vw, 4.5rem)",
                  fontWeight: 900, letterSpacing: "-0.05em",
                  lineHeight: 0.96, color: "#fff",
                  margin: "0 0 20px",
                }}>
                  Earn by<br />
                  <span style={{ color: "#E2BE74" }}>showing up.</span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: E, delay: 0.44 }}
                style={{
                  fontSize: "1rem", color: "rgba(255,255,255,0.50)",
                  lineHeight: 1.55, margin: "0 0 36px",
                  fontWeight: 400, maxWidth: 280,
                }}
              >
                Stake coins on your fitness goals. Post proof daily. Winners split the pool.
              </motion.p>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.65 }}
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#4DC87A",
                  boxShadow: "0 0 6px #4DC87A",
                  animation: "heroPulse 2s ease-in-out infinite",
                }} />
                <span style={{
                  fontSize: "0.75rem", color: "rgba(255,255,255,0.42)",
                  fontWeight: 500,
                }}>
                  2,438 members · 14 proving right now
                </span>
              </motion.div>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: E, delay: 0.78 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPhase("features")}
                style={{
                  width: "100%", padding: "20px 24px",
                  borderRadius: 14, border: "none",
                  background: color.gold.gradient,
                  fontSize: "1rem", fontWeight: 800,
                  letterSpacing: "0.01em", color: "#000",
                  cursor: "pointer", boxShadow: shadow.goldCTA,
                  marginBottom: 16,
                }}
              >
                Get Started →
              </motion.button>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                style={{ textAlign: "center" }}
              >
                <Link href="/auth" style={{
                  fontSize: "0.8125rem", color: "rgba(255,255,255,0.30)",
                  textDecoration: "none", fontWeight: 400,
                }}>
                  Already a member? Sign in
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "features" && (
          <motion.div
            key="features"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.45, ease: E } }}
            exit={{ opacity: 0, x: -40, transition: { duration: 0.28, ease: EX } }}
            style={{
              position: "absolute", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Slide area */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              style={{ x: dragX, flex: 1 }}
              onDragEnd={handleDragEnd}
              key={slideIdx}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideIdx}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.38, ease: E } }}
                  exit={{ opacity: 0, x: -30, transition: { duration: 0.22 } }}
                  style={{
                    height: "100%",
                    display: "flex", flexDirection: "column",
                    justifyContent: "center", alignItems: "center",
                    padding: `calc(env(safe-area-inset-top,0px) + 60px) ${space.screenX}px 0`,
                    textAlign: "center",
                  }}
                >
                  {/* Tag */}
                  <div style={{
                    fontSize: "0.5rem", fontWeight: 800,
                    letterSpacing: "0.28em", paddingLeft: "0.28em",
                    color: slide.accent, marginBottom: 28,
                    border: `1px solid ${slide.accent}30`,
                    padding: "5px 12px", borderRadius: 99,
                    background: `${slide.accent}10`,
                  }}>
                    {slide.tag}
                  </div>

                  {/* Emoji */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: E, delay: 0.1 }}
                    style={{
                      fontSize: "5rem", marginBottom: 32,
                      filter: `drop-shadow(0 0 32px ${slide.accent}60)`,
                    }}
                  >
                    {slide.emoji}
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: E, delay: 0.18 }}
                    style={{
                      fontSize: "clamp(2rem, 9vw, 2.8rem)",
                      fontWeight: 900, letterSpacing: "-0.04em",
                      lineHeight: 1.05, color: "#fff",
                      margin: "0 0 16px",
                    }}
                  >
                    {slide.title}
                  </motion.h2>

                  {/* Body */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: E, delay: 0.28 }}
                    style={{
                      fontSize: "1rem", color: "rgba(255,255,255,0.48)",
                      lineHeight: 1.6, maxWidth: 300,
                      margin: 0, fontWeight: 400,
                    }}
                  >
                    {slide.body}
                  </motion.p>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Bottom nav */}
            <div style={{
              padding: `0 ${space.screenX}px calc(env(safe-area-inset-bottom,0px) + 40px)`,
              display: "flex", flexDirection: "column", gap: 20,
            }}>
              {/* Dot indicators */}
              <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
                {SLIDES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    style={{
                      width: i === slideIdx ? 24 : 7, height: 7,
                      borderRadius: 4, border: "none",
                      background: i === slideIdx ? slide.accent : "rgba(255,255,255,0.18)",
                      cursor: "pointer",
                      transition: "width 0.28s cubic-bezier(.175,.885,.32,1.275), background 0.28s ease",
                    }}
                  />
                ))}
              </div>

              {/* Next / Join */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (slideIdx < SLIDES.length - 1) {
                    goToSlide(slideIdx + 1);
                  } else {
                    setPhase("form");
                    setTimeout(() => nameRef.current?.focus(), 360);
                  }
                }}
                style={{
                  width: "100%", padding: "20px 24px",
                  borderRadius: 14, border: "none",
                  background: slideIdx === SLIDES.length - 1
                    ? color.gold.gradient
                    : "rgba(255,255,255,0.08)",
                  fontSize: "1rem", fontWeight: 800,
                  letterSpacing: "0.01em",
                  color: slideIdx === SLIDES.length - 1 ? "#000" : "#fff",
                  cursor: "pointer",
                  boxShadow: slideIdx === SLIDES.length - 1 ? shadow.goldCTA : "none",
                  transition: "background 0.4s ease, color 0.3s ease, box-shadow 0.3s ease",
                }}
              >
                {slideIdx === SLIDES.length - 1 ? "Create Account →" : "Next →"}
              </motion.button>

              <button
                onClick={() => setPhase(slideIdx === 0 ? "hero" : "features")}
                style={{
                  background: "none", border: "none",
                  fontSize: "0.8125rem", color: "rgba(255,255,255,0.26)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {slideIdx === 0 ? "← Back" : "← Previous"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIGNUP FORM ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: E } }}
            exit={{ opacity: 0, transition: { duration: 0.22 } }}
            style={{
              position: "absolute", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column",
              overflowY: "auto", overflowX: "hidden",
              padding: `calc(env(safe-area-inset-top,0px) + 24px) ${space.screenX}px calc(env(safe-area-inset-bottom,0px) + 24px)`,
            }}
            className="no-scrollbar"
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 36,
            }}>
              <button
                onClick={() => setPhase("features")}
                style={{
                  background: "none", border: "none",
                  fontSize: "0.8125rem", color: "rgba(255,255,255,0.30)",
                  cursor: "pointer", padding: 0,
                }}
              >← Back</button>
              <span style={{
                fontSize: "0.5625rem", fontWeight: 700,
                letterSpacing: "0.32em", paddingLeft: "0.32em",
                textTransform: "uppercase", color: "rgba(226,190,116,0.68)",
              }}>ELVN</span>
              <Link href="/auth" style={{
                fontSize: "0.75rem", color: "rgba(255,255,255,0.30)",
                textDecoration: "none",
              }}>Sign in</Link>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontSize: "clamp(2rem, 9vw, 3rem)",
                fontWeight: 900, letterSpacing: "-0.046em",
                lineHeight: 1.02, color: "#fff", margin: "0 0 10px",
              }}>Create your<br />account.</h1>
              <p style={{
                fontSize: "0.875rem", color: "rgba(255,255,255,0.40)",
                margin: 0, lineHeight: 1.5,
              }}>No shortcuts. Real stakes. Real wins.</p>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 26 }}>
              <label style={LABEL}>Your name</label>
              <input
                ref={nameRef}
                type="text"
                placeholder="First name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoCapitalize="words"
                style={INPUT}
              />
            </div>

            {/* Handle */}
            <div style={{ marginBottom: 10 }}>
              <label style={LABEL}>Handle</label>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                borderBottom: `1px solid ${handleBorder}`,
                paddingBottom: 14,
                transition: "border-color 0.22s ease",
              }}>
                <span style={{
                  fontSize: "1.0625rem", fontWeight: 600, flexShrink: 0,
                  color: handleFocused ? "rgba(201,168,76,0.88)" : "rgba(201,168,76,0.52)",
                  transition: "color 0.22s ease",
                }}>@</span>
                <input
                  type="text"
                  value={handle}
                  placeholder="yourhandle"
                  onChange={e => {
                    setHandleEdited(true);
                    setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 20));
                  }}
                  onFocus={() => setHandleFocused(true)}
                  onBlur={() => setHandleFocused(false)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontSize: "1.0625rem", fontWeight: 500, color: "#fff",
                  }}
                />
                <AnimatePresence mode="wait">
                  {avail !== "idle" && (
                    <motion.span
                      key={avail}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      style={{ fontSize: "0.5rem", fontWeight: 700, color: availColor, flexShrink: 0 }}
                    >
                      {avail === "available" ? "✓ Free" : avail === "taken" ? "Taken" : avail === "short" ? "Min 3" : "…"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Handle suggestions */}
            <AnimatePresence>
              {suggestions.length > 0 && name.trim() && (
                <motion.div
                  key="sugg"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 26 }}
                >
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setHandle(s); setHandleEdited(true); }}
                      style={{
                        padding: "4px 11px", borderRadius: 99,
                        background: handle === s ? "rgba(201,168,76,0.10)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${handle === s ? "rgba(201,168,76,0.30)" : "rgba(255,255,255,0.07)"}`,
                        fontSize: "0.625rem", fontWeight: handle === s ? 700 : 400,
                        color: handle === s ? "rgba(226,190,116,0.88)" : "rgba(255,255,255,0.32)",
                        cursor: "pointer",
                      }}
                    >@{s}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div style={{ marginBottom: 28 }}>
              <label style={LABEL}>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                autoCapitalize="none"
                autoComplete="email"
                style={INPUT}
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: "0.75rem", color: "rgba(255,80,80,0.80)", margin: "0 0 16px", lineHeight: 1.5 }}
                >{error}</motion.p>
              )}
            </AnimatePresence>

            {/* CTA */}
            <motion.button
              onClick={submit}
              disabled={!canSubmit}
              whileTap={canSubmit ? { scale: 0.97, y: 1 } : {}}
              style={{
                width: "100%", padding: "20px 24px", borderRadius: 14, border: "none",
                background: canSubmit ? color.gold.gradient : "rgba(255,255,255,0.04)",
                fontSize: "0.9375rem", fontWeight: 800,
                color: canSubmit ? "#000" : "rgba(255,255,255,0.22)",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? shadow.goldCTA : "none",
                transition: "background 0.3s ease, color 0.24s ease",
                marginBottom: 20, position: "relative", overflow: "hidden",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={loading ? "l" : "i"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: "block" }}
                >
                  {loading ? "Sending code…" : "Get Code →"}
                </motion.span>
              </AnimatePresence>

              {canSubmit && (
                <motion.div
                  initial={{ x: "-115%", opacity: 1 }}
                  animate={{ x: "115%", opacity: 0.55 }}
                  transition={{ duration: 0.78, ease: [0.4, 0, 0.6, 1], delay: 0.14 }}
                  style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </motion.button>

            <p style={{
              textAlign: "center", fontSize: "0.5625rem",
              color: "rgba(255,255,255,0.18)", letterSpacing: "0.07em",
              textTransform: "uppercase", lineHeight: 1.8, margin: 0,
            }}>
              Private network · 2,438 members
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Entry overlay ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {entering && (
          <motion.div
            key="entering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.40 } }}
            style={{
              position: "absolute", inset: 0, zIndex: 30, background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div className="grain" />
            <motion.div
              initial={{ opacity: 0, scale: 0.25 }}
              animate={{ opacity: 0.12, scale: 1.65 }}
              transition={{ duration: 0.82, ease: E }}
              style={{
                position: "absolute", width: "80vw", height: "80vw", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 68%)",
                filter: "blur(80px)",
              }}
            />
            <motion.span
              initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.44, ease: E, delay: 0.22 }}
              style={{
                fontSize: "0.625rem", fontWeight: 700,
                letterSpacing: "0.40em", paddingLeft: "0.40em",
                textTransform: "uppercase", color: "rgba(226,190,116,0.80)",
              }}
            >ELVN</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OTP verification screen ────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: E } }}
            exit={{ opacity: 0, transition: { duration: 0.22 } }}
            style={{
              position: "absolute", inset: 0, zIndex: 20, background: "#000",
              display: "flex", flexDirection: "column",
              padding: `calc(env(safe-area-inset-top,0px) + 24px) ${space.screenX}px calc(env(safe-area-inset-bottom,0px) + 32px)`,
            }}
          >
            <div className="grain" />
            <motion.div
              initial={{ opacity: 0, scale: 0.25 }}
              animate={{ opacity: 0.10, scale: 1.6 }}
              transition={{ duration: 0.82, ease: E }}
              style={{
                position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
                width: "80vw", height: "80vw", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 68%)",
                filter: "blur(80px)", pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
              <button
                onClick={() => { setPhase("form"); setOtpCode(""); setError(""); }}
                style={{ background: "none", border: "none", fontSize: "0.8125rem", color: "rgba(255,255,255,0.30)", cursor: "pointer", padding: 0, alignSelf: "flex-start", marginBottom: 40 }}
              >← Back</button>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 20 }}>📬</div>
                <h2 style={{ fontSize: "clamp(1.75rem,8vw,2.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 10px", lineHeight: 1.05 }}>
                  Check your<br />email.
                </h2>
                <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.6, margin: "0 0 6px" }}>
                  We sent a 6-digit code to
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "rgba(226,190,116,0.88)", margin: "0 0 36px" }}>
                  {email}
                </p>

                <label style={LABEL}>Enter code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && verifyCode()}
                  autoFocus
                  style={{
                    ...INPUT,
                    fontSize: "2rem", fontWeight: 700, letterSpacing: "0.22em",
                    textAlign: "center", paddingBottom: 16, marginBottom: 8,
                  }}
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="err"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: "0.75rem", color: "rgba(255,80,80,0.80)", margin: "0 0 16px", lineHeight: 1.5 }}
                    >{error}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={verifyCode}
                  disabled={otpCode.length < 6 || loading}
                  whileTap={otpCode.length === 6 && !loading ? { scale: 0.97 } : {}}
                  style={{
                    width: "100%", padding: "20px 24px", borderRadius: 14, border: "none", marginTop: 8,
                    background: otpCode.length === 6 && !loading ? color.gold.gradient : "rgba(255,255,255,0.04)",
                    fontSize: "0.9375rem", fontWeight: 800,
                    color: otpCode.length === 6 && !loading ? "#000" : "rgba(255,255,255,0.22)",
                    cursor: otpCode.length === 6 && !loading ? "pointer" : "not-allowed",
                    boxShadow: otpCode.length === 6 && !loading ? shadow.goldCTA : "none",
                    transition: "background 0.3s ease, color 0.24s ease",
                  }}
                >
                  {loading ? "Verifying…" : "Confirm & Join →"}
                </motion.button>

                <button
                  onClick={async () => { setError(""); await sendOtp(email, name.trim(), handle); }}
                  style={{ background: "none", border: "none", marginTop: 22, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", cursor: "pointer" }}
                >
                  Resend code
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes heroPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.4; transform:scale(0.7); }
        }
      `}</style>
    </div>
  );
}
