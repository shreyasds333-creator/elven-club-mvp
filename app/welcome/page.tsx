"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/authStore";
import { color, shadow, space } from "@/lib/tokens";

const E = [0.22, 1, 0.36, 1] as const;

// ─── Shared styles ────────────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize: "0.5rem", fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase",
  color: "rgba(255,255,255,0.34)",
  display: "block", marginBottom: 10,
};

const INPUT: React.CSSProperties = {
  width: "100%", background: "none", border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  paddingBottom: 14,
  fontSize: "1.0625rem", fontWeight: 500, letterSpacing: "-0.01em",
  color: "#fff", outline: "none",
};

// ─── Handle helpers ───────────────────────────────────────────────────────────

function genHandle(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return n.slice(0, Math.min(n.length, 13));
}

function genSuggestions(name: string): string[] {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  if (!n) return [];
  const base = n.slice(0, Math.min(n.length, 11));
  const seed = n.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const num  = (seed % 89) + 11;
  return [base, `${base}${num}`, `the.${base}`];
}

function mockAvailable(h: string): boolean {
  const s = h.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (s * 31) % 11 !== 0;
}

type AvailStatus = "idle" | "checking" | "available" | "taken" | "short";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router       = useRouter();
  const { signup }   = useAuth();
  const nameRef      = useRef<HTMLInputElement>(null);

  const [phase,         setPhase]         = useState<"splash" | "form">("splash");
  const [name,          setName]          = useState("");
  const [handle,        setHandle]        = useState("");
  const [handleEdited,  setHandleEdited]  = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [avail,         setAvail]         = useState<AvailStatus>("idle");
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [entering,      setEntering]      = useState(false);

  // ── Auto-advance splash ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("form");
      setTimeout(() => nameRef.current?.focus(), 360);
    }, 1750);
    return () => clearTimeout(t);
  }, []);

  // ── Handle auto-fill ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!handleEdited) setHandle(genHandle(name));
  }, [name, handleEdited]);

  // ── Handle availability debounce ─────────────────────────────────────────
  useEffect(() => {
    if (!handle)             { setAvail("idle");  return; }
    if (handle.length < 3)   { setAvail("short"); return; }
    setAvail("checking");
    const t = setTimeout(() => setAvail(mockAvailable(handle) ? "available" : "taken"), 380);
    return () => clearTimeout(t);
  }, [handle]);

  const suggestions = genSuggestions(name);

  const canSubmit = (
    name.trim().length >= 1
    && handle.length >= 3
    && avail !== "taken"
    && email.includes("@") && email.includes(".")
    && password.length >= 6
    && !loading
  );

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try { localStorage.setItem("elvn_onboarding", "1"); } catch {}

    const { error: err } = await signup(email.trim().toLowerCase(), password, name.trim(), handle);
    if (err) { setError(err); setLoading(false); return; }

    setEntering(true);
    setTimeout(() => router.replace("/challenges"), 840);
  }

  // ── Availability colours ──────────────────────────────────────────────────
  const availColor =
    avail === "available" ? "#4DC87A" :
    avail === "taken"     ? "#E07840" :
                            "rgba(255,255,255,0.28)";

  const handleBorder = handleFocused
    ? avail === "taken"     ? "rgba(224,120,64,0.55)"
    : avail === "available" ? "rgba(77,200,122,0.50)"
    :                         "rgba(201,168,76,0.55)"
    : "rgba(255,255,255,0.10)";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#000",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── Ambient glow ───────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: "-22%", left: "50%",
        transform: "translateX(-50%)",
        width: "72vw", height: "72vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 68%)",
        filter: "blur(96px)", opacity: 0.068, pointerEvents: "none",
      }} />
      <div className="grain" />

      {/* ── Splash ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "splash" && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.72, ease: "easeInOut" } }}
            onClick={() => { setPhase("form"); setTimeout(() => nameRef.current?.focus(), 360); }}
            style={{
              position: "absolute", inset: 0, zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <motion.span
                initial={{ opacity: 0, y: 8, filter: "blur(14px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.0, ease: E, delay: 0.22 }}
                style={{
                  fontSize: "2rem", fontWeight: 700,
                  letterSpacing: "0.40em", paddingLeft: "0.40em",
                  textTransform: "uppercase",
                  color: "rgba(226,190,116,1.0)", display: "block",
                }}
              >ELVN</motion.span>

              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.60, ease: E, delay: 0.85 }}
                style={{
                  width: 48, height: 1, margin: "16px auto 18px",
                  background: "linear-gradient(to right, rgba(201,168,76,0.18), rgba(201,168,76,0.62), rgba(201,168,76,0.18))",
                  transformOrigin: "center",
                }}
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.65, ease: E, delay: 1.10 }}
                style={{
                  fontSize: "0.5625rem", fontWeight: 500,
                  color: "rgba(255,255,255,0.42)",
                  letterSpacing: "0.20em", textTransform: "uppercase",
                  margin: "0 0 24px",
                }}
              >Discipline becomes identity</motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.32 }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              >
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#4DC87A",
                  animation: "splash-dot 1.9s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.34)", fontWeight: 400 }}>
                  14 members proving right now
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.50, ease: E } }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: `0 ${space.screenX}px`,
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
              overflowY: "auto", overflowX: "hidden",
              position: "relative", zIndex: 10,
            }}
            className="no-scrollbar"
          >

            {/* Wordmark row + sign-in link */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 32,
            }}>
              <span style={{
                fontSize: "0.5625rem", fontWeight: 700,
                letterSpacing: "0.32em", paddingLeft: "0.32em",
                textTransform: "uppercase",
                color: "rgba(226,190,116,0.68)",
              }}>ELVN</span>
              <Link
                href="/auth"
                style={{
                  fontSize: "0.75rem", fontWeight: 400,
                  color: "rgba(255,255,255,0.32)",
                  textDecoration: "none",
                }}
              >Sign in</Link>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 36 }}>
              <h1 style={{
                fontSize: "clamp(2.375rem, 10vw, 3.375rem)",
                fontWeight: 900, letterSpacing: "-0.046em",
                lineHeight: 1.00, color: "#fff",
                margin: "0 0 10px",
              }}>
                Join ELVN.
              </h1>
              <p style={{
                fontSize: "0.875rem", fontWeight: 400,
                color: "rgba(255,255,255,0.42)", margin: 0,
                lineHeight: 1.52, letterSpacing: "0.005em",
              }}>
                Real stakes. Device-verified proof. No shortcuts.
              </p>
            </div>

            {/* ── Name ── */}
            <div style={{ marginBottom: 26 }}>
              <label style={LABEL}>First name</label>
              <input
                ref={nameRef}
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoCapitalize="words"
                style={INPUT}
              />
            </div>

            {/* ── Handle ── */}
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
                  transition: "color 0.22s ease", lineHeight: 1,
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
                    fontSize: "1.0625rem", fontWeight: 500,
                    letterSpacing: "-0.01em", color: "#fff",
                  }}
                />

                <AnimatePresence mode="wait">
                  {avail !== "idle" && (
                    <motion.span
                      key={avail}
                      initial={{ opacity: 0, scale: 0.80 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.80 }}
                      transition={{ duration: 0.16 }}
                      style={{
                        fontSize: "0.5rem", fontWeight: 700,
                        flexShrink: 0, color: availColor,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {avail === "available" ? "✓ Free"
                     : avail === "taken"     ? "Taken"
                     : avail === "short"     ? "Min 3"
                     :                         "…"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Suggestions ── */}
            <AnimatePresence>
              {suggestions.length > 0 && name.trim() && (
                <motion.div
                  key="sugg"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.26, ease: E } }}
                  exit={{ opacity: 0, transition: { duration: 0.14 } }}
                  style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 26 }}
                >
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setHandle(s); setHandleEdited(true); }}
                      style={{
                        padding: "4px 11px", borderRadius: "9999px",
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

            {/* ── Email ── */}
            <div style={{ marginBottom: 26 }}>
              <label style={LABEL}>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoCapitalize="none"
                autoComplete="email"
                style={INPUT}
              />
            </div>

            {/* ── Password ── */}
            <div style={{ marginBottom: 28 }}>
              <label style={LABEL}>Password</label>
              <input
                type="password"
                placeholder="6+ characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                autoComplete="new-password"
                style={INPUT}
              />
            </div>

            {/* ── Error ── */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontSize: "0.75rem", color: "rgba(255,80,80,0.80)",
                    margin: "0 0 18px", lineHeight: 1.5,
                  }}
                >{error}</motion.p>
              )}
            </AnimatePresence>

            {/* ── CTA ── */}
            <motion.button
              onClick={submit}
              disabled={!canSubmit}
              whileTap={canSubmit ? { scale: 0.970, y: 1 } : {}}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              style={{
                width: "100%", padding: "20px 24px",
                borderRadius: "14px", border: "none",
                background: canSubmit ? color.gold.gradient : "rgba(255,255,255,0.04)",
                fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "0.015em",
                color: canSubmit ? "#000" : "rgba(255,255,255,0.22)",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? shadow.goldCTA : "none",
                transition: "background 0.30s ease, box-shadow 0.30s ease, color 0.24s ease",
                marginBottom: 20,
                position: "relative", overflow: "hidden",
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
                  {loading ? "Joining…" : "Join ELVN →"}
                </motion.span>
              </AnimatePresence>

              {/* Gold shimmer — plays once when all fields complete */}
              <AnimatePresence>
                {canSubmit && (
                  <motion.div
                    key="shimmer"
                    initial={{ x: "-115%", opacity: 1 }}
                    animate={{ x: "115%", opacity: 0.55 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.78, ease: [0.4, 0, 0.6, 1], delay: 0.14 }}
                    style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.button>

            {/* ── Footer ── */}
            <p style={{
              textAlign: "center",
              fontSize: "0.5625rem", fontWeight: 400,
              color: "rgba(255,255,255,0.20)",
              letterSpacing: "0.07em", textTransform: "uppercase",
              lineHeight: 1.8, margin: 0,
            }}>
              Private network · 2,438 members
            </p>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Entry overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {entering && (
          <motion.div
            key="entering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.40, ease: "easeIn" } }}
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
                textTransform: "uppercase",
                color: "rgba(226,190,116,0.80)",
              }}
            >ELVN</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes splash-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.25; transform:scale(0.60); }
        }
      `}</style>
    </div>
  );
}
