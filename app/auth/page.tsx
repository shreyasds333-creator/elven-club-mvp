"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/authStore";
import { color, shadow, space } from "@/lib/tokens";

const E  = [0.22, 1, 0.36, 1] as const;
const EX = [0.4,  0, 0.8, 1]  as const;

const screen = {
  initial: { opacity: 0, y: 14, scale: 0.990 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.52, ease: E, staggerChildren: 0.10, delayChildren: 0.06 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.20, ease: EX } },
};

const line = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.56, ease: E } },
};

export default function AuthPage() {
  const router = useRouter();
  const { login, signup } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [mode,     setMode]     = useState<"join" | "return">("join");

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");

    const { error: err } = mode === "join"
      ? await signup(email, password)
      : await login(email, password);

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    router.replace("/challenges");
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "radial-gradient(ellipse 58% 38% at 30% 6%, rgba(201,168,76,0.044) 0%, transparent 100%), #000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>

      {/* Primary ambient gold */}
      <div style={{
        position: "absolute", top: "-18%", left: "50%",
        transform: "translateX(-50%)",
        width: "68vw", height: "68vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 70%)",
        filter: "blur(90px)", opacity: 0.068, pointerEvents: "none",
      }} />

      {/* Secondary ambient — depth */}
      <div style={{
        position: "absolute", bottom: "-12%", right: "8%",
        width: "46vw", height: "46vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 70%)",
        filter: "blur(72px)", opacity: 0.026, pointerEvents: "none",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 110% 90% at 50% 50%, transparent 38%, rgba(0,0,0,0.60) 100%)",
      }} />

      <div className="grain" />

      <motion.div
        variants={screen}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 380,
          padding: `0 ${space.screenX}px`,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Wordmark + tagline */}
        <motion.div variants={line} style={{ marginBottom: 56, textAlign: "center" }}>
          <span style={{
            fontSize: "1.125rem", fontWeight: 700,
            letterSpacing: "0.38em", paddingLeft: "0.38em",
            textTransform: "uppercase",
            color: "rgba(226,190,116,0.88)", display: "block", marginBottom: 10,
          }}>ELVN</span>
          <span style={{
            fontSize: "0.5625rem", fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.34)", display: "block",
          }}>Private fitness network</span>
        </motion.div>

        {/* Mode tabs */}
        <motion.div variants={line} style={{
          display: "flex", marginBottom: 44,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          {(["join", "return"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, paddingBottom: 14,
                background: "none", border: "none",
                fontSize: "0.8125rem",
                fontWeight: mode === m ? 600 : 400,
                color: mode === m ? "#fff" : "rgba(255,255,255,0.26)",
                cursor: "pointer",
                borderBottom: `1px solid ${mode === m ? "rgba(201,168,76,0.70)" : "transparent"}`,
                marginBottom: -1,
                letterSpacing: "0.025em",
                transition: "color 0.22s ease, border-color 0.22s ease",
                textAlign: "left",
              }}
            >
              {m === "join" ? "Join" : "Return"}
            </button>
          ))}
        </motion.div>

        {/* Inputs */}
        <motion.div variants={line} style={{ display: "flex", flexDirection: "column", marginBottom: 8 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoCapitalize="none"
            autoComplete="email"
            style={{
              width: "100%", padding: "15px 0",
              background: "none", border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.10)",
              fontSize: "0.9375rem", fontWeight: 400,
              color: "#fff", outline: "none",
              letterSpacing: "0.01em",
            }}
          />
          <input
            type="password"
            placeholder="Password  (6+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoComplete={mode === "join" ? "new-password" : "current-password"}
            style={{
              width: "100%", padding: "15px 0",
              background: "none", border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.10)",
              fontSize: "0.9375rem", fontWeight: 400,
              color: "#fff", outline: "none",
              letterSpacing: "0.01em",
            }}
          />
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              key="err"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: E } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.16, ease: EX } }}
              style={{
                fontSize: "0.75rem", color: "rgba(255,80,80,0.80)",
                margin: "12px 0 0", fontWeight: 400, lineHeight: 1.5,
              }}
            >{error}</motion.p>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div variants={line} style={{ marginTop: 28 }}>
          <motion.button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            whileTap={canSubmit && !loading ? { scale: 0.968, y: 1 } : {}}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            style={{
              width: "100%", padding: "20px 24px",
              borderRadius: "14px", border: "none",
              background: !canSubmit
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.93)",
              fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "0.015em",
              color: !canSubmit ? "rgba(255,255,255,0.22)" : "#0A0A0A",
              cursor: !canSubmit ? "not-allowed" : "pointer",
              boxShadow: !canSubmit
                ? "none"
                : shadow.goldCTA.replace(/201,168,76/g, "255,255,255").replace("0.32", "0.10"),
              transition: "background 0.28s ease, box-shadow 0.28s ease, color 0.22s ease",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${mode}-${loading}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: E } }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: EX } }}
                style={{ display: "block" }}
              >
                {loading ? "—" : mode === "join" ? "Create account" : "Sign in"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p variants={line} style={{
          textAlign: "center",
          fontSize: "0.625rem", fontWeight: 400,
          color: "rgba(255,255,255,0.30)",
          marginTop: 32, letterSpacing: "0.06em",
          textTransform: "uppercase",
          lineHeight: 1.8,
        }}>
          Private network · 2,438 members
        </motion.p>
      </motion.div>
    </div>
  );
}
