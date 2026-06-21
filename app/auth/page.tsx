"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const INPUT: React.CSSProperties = {
  width: "100%", padding: "15px 0",
  background: "none", border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  fontSize: "0.9375rem", fontWeight: 400,
  color: "#fff", outline: "none",
  letterSpacing: "0.01em",
};

export default function AuthPage() {
  const router               = useRouter();
  const { sendOtp, verifyOtp } = useAuth();

  const [email,   setEmail]   = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  type ResendState = "idle" | "sending" | "sent" | "cooldown";
  const [resendState,    setResendState]    = useState<ResendState>("idle");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendState !== "cooldown") return;
    if (resendCooldown <= 0) { setResendState("idle"); return; }
    const t = setTimeout(() => setResendCooldown(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendState, resendCooldown]);

  async function handleResend() {
    if (resendState !== "idle") return;
    setResendState("sending");
    setError("");
    const { error: err } = await sendOtp(email.trim().toLowerCase());
    if (err) { setError(err); setResendState("idle"); return; }
    setResendState("sent");
    setTimeout(() => { setResendState("cooldown"); setResendCooldown(30); }, 1500);
  }

  async function handleSendOtp() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || loading) return;
    setLoading(true);
    setError("");
    const { error: err } = await sendOtp(trimmed);
    if (err) { setError(err); setLoading(false); return; }
    setLoading(false);
    setOtpSent(true);
  }

  async function handleVerify() {
    if (otpCode.length < 6 || loading) return;
    setLoading(true);
    setError("");
    const { error: err } = await verifyOtp(email.trim().toLowerCase(), otpCode);
    if (err) { setError(err); setLoading(false); return; }
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

      {/* Ambient glows */}
      <div style={{
        position: "absolute", top: "-18%", left: "50%",
        transform: "translateX(-50%)",
        width: "68vw", height: "68vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 70%)",
        filter: "blur(90px)", opacity: 0.068, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-12%", right: "8%",
        width: "46vw", height: "46vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 70%)",
        filter: "blur(72px)", opacity: 0.026, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 110% 90% at 50% 50%, transparent 38%, rgba(0,0,0,0.60) 100%)",
      }} />
      <div className="grain" />

      <AnimatePresence mode="wait">
        {!otpSent ? (
          <motion.div
            key="email"
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
            {/* Wordmark */}
            <motion.div variants={line} style={{ marginBottom: 52, textAlign: "center" }}>
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
              }}>Welcome back</span>
            </motion.div>

            {/* Email input */}
            <motion.div variants={line} style={{ marginBottom: 8 }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                style={INPUT}
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
                onClick={handleSendOtp}
                disabled={!email.includes("@") || loading}
                whileTap={email.includes("@") && !loading ? { scale: 0.968, y: 1 } : {}}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                style={{
                  width: "100%", padding: "20px 24px",
                  borderRadius: "14px", border: "none",
                  background: email.includes("@")
                    ? "rgba(255,255,255,0.93)"
                    : "rgba(255,255,255,0.04)",
                  fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "0.015em",
                  color: email.includes("@") ? "#0A0A0A" : "rgba(255,255,255,0.22)",
                  cursor: email.includes("@") ? "pointer" : "not-allowed",
                  boxShadow: email.includes("@")
                    ? "0 2px 24px rgba(255,255,255,0.08), 0 1px 0 rgba(255,255,255,0.08) inset"
                    : "none",
                  transition: "background 0.28s ease, box-shadow 0.28s ease, color 0.22s ease",
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={loading ? "l" : "i"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: E } }}
                    exit={{ opacity: 0, y: -5, transition: { duration: 0.14, ease: EX } }}
                    style={{ display: "block" }}
                  >
                    {loading ? "Sending…" : "Send Code →"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.div>

            {/* New user link */}
            <motion.div variants={line} style={{ textAlign: "center", marginTop: 28 }}>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.28)" }}>
                New here?{" "}
              </span>
              <Link
                href="/welcome"
                style={{
                  fontSize: "0.75rem", fontWeight: 600,
                  color: "rgba(201,168,76,0.72)",
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}
              >
                Join ELVN →
              </Link>
            </motion.div>

            <motion.p variants={line} style={{
              textAlign: "center",
              fontSize: "0.625rem", fontWeight: 400,
              color: "rgba(255,255,255,0.22)",
              marginTop: 36, letterSpacing: "0.06em",
              textTransform: "uppercase",
              lineHeight: 1.8,
            }}>
              Private network · 2,438 members
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
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
            {/* Wordmark */}
            <motion.div variants={line} style={{ marginBottom: 44, textAlign: "center" }}>
              <span style={{
                fontSize: "1.125rem", fontWeight: 700,
                letterSpacing: "0.38em", paddingLeft: "0.38em",
                textTransform: "uppercase",
                color: "rgba(226,190,116,0.88)", display: "block", marginBottom: 10,
              }}>ELVN</span>
              <div style={{ fontSize: "1.5rem", marginTop: 4 }}>📬</div>
            </motion.div>

            <motion.div variants={line}>
              <h2 style={{
                fontSize: "1.375rem", fontWeight: 800, letterSpacing: "-0.03em",
                color: "#fff", margin: "0 0 8px",
              }}>Check your email</h2>
              <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.42)", margin: "0 0 4px", lineHeight: 1.55 }}>
                We sent a 6-digit code to
              </p>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgba(226,190,116,0.88)", margin: "0 0 32px" }}>
                {email}
              </p>
            </motion.div>

            {/* OTP input */}
            <motion.div variants={line} style={{ marginBottom: 8 }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={e => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                autoFocus
                style={{
                  ...INPUT,
                  fontSize: "2rem", fontWeight: 700,
                  letterSpacing: "0.22em", textAlign: "center",
                  paddingBottom: 16,
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

            {/* Verify CTA */}
            <motion.div variants={line} style={{ marginTop: 28 }}>
              <motion.button
                onClick={handleVerify}
                disabled={otpCode.length < 6 || loading}
                whileTap={otpCode.length === 6 && !loading ? { scale: 0.968, y: 1 } : {}}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                style={{
                  width: "100%", padding: "20px 24px",
                  borderRadius: "14px", border: "none",
                  background: otpCode.length === 6
                    ? color.gold.gradient
                    : "rgba(255,255,255,0.04)",
                  fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "0.015em",
                  color: otpCode.length === 6 ? "#000" : "rgba(255,255,255,0.22)",
                  cursor: otpCode.length === 6 ? "pointer" : "not-allowed",
                  boxShadow: otpCode.length === 6 ? shadow.goldCTA : "none",
                  transition: "background 0.28s ease, box-shadow 0.28s ease, color 0.22s ease",
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={loading ? "l" : "i"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: E } }}
                    exit={{ opacity: 0, y: -5, transition: { duration: 0.14, ease: EX } }}
                    style={{ display: "block" }}
                  >
                    {loading ? "Verifying…" : "Sign In →"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.div>

            {/* Resend + back */}
            <motion.div variants={line} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
              <button
                onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }}
                style={{ background: "none", border: "none", fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", cursor: "pointer", padding: 0 }}
              >
                ← Change email
              </button>
              <button
                onClick={handleResend}
                disabled={resendState !== "idle"}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontSize: "0.8125rem", fontWeight: 600,
                  cursor: resendState === "idle" ? "pointer" : "default",
                  color: resendState === "sent"     ? "#4DC87A"
                       : resendState !== "idle"     ? "rgba(255,255,255,0.22)"
                       : "rgba(201,168,76,0.60)",
                  transition: "color 0.2s ease",
                }}
              >
                {resendState === "sending"  ? "Sending…"
                 : resendState === "sent"   ? "Code sent ✓"
                 : resendState === "cooldown" ? `Resend in ${resendCooldown}s`
                 : "Resend code"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
