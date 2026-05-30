"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { color, shadow, space } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProofMethodType = "Camera" | "Health" | "Steps";

// ─── Data ─────────────────────────────────────────────────────────────────────

const TOTAL = 5;

const PROOF_METHODS: {
  key: ProofMethodType; title: string; sub: string; badge: string; desc: string;
}[] = [
  { key: "Camera", title: "Live camera",    sub: "Captured in real time — no gallery uploads",      badge: "LIVE", desc: "Timestamped. Device-verified. Community-visible. No fakes." },
  { key: "Health", title: "Health sync",    sub: "Auto-verified from Apple Health or Google Fit",    badge: "AUTO", desc: "Passive sync from your health platform. Device signs every proof." },
  { key: "Steps",  title: "Step tracking",  sub: "Daily target measured by your device sensor",      badge: "AUTO", desc: "Sensor-verified. Hit your target and proof generates automatically." },
];

const HOW_STEPS = [
  {
    num: "01", action: "Join a room.",
    detail: "Choose an accountability challenge. Stake coins. Your commitment is public and locked in.",
  },
  {
    num: "02", action: "Prove every day.",
    detail: "Submit device-verified proof daily. Camera capture or health sync. No fakes accepted.",
  },
  {
    num: "03", action: "Earn your place.",
    detail: "Consistent performers win the prize pool. Miss a day — lose your stake.",
  },
];

// ─── Handle suggestions ───────────────────────────────────────────────────────
// Three suggestions that feel like real people's handles, not templates.
// The number is seeded from the name so it's stable across re-renders.

function generateSuggestions(firstName: string): string[] {
  const n = firstName.toLowerCase().replace(/[^a-z]/g, "");
  if (!n) return [];
  const base = n.length > 12 ? n.slice(0, 11) : n;
  const seed = n.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const num  = (seed % 89) + 11; // 11–99, consistent for the same name
  return [base, `${base}${num}`, `the.${base}`];
}

// Mock availability — ~91% of handles return available.
// Seeded by handle value so the result is stable while typing.
function mockAvailable(handle: string): boolean {
  const sum = handle.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (sum * 31) % 11 !== 0;
}

// ─── Motion system ────────────────────────────────────────────────────────────
//
// E  — natural deceleration. All entrances.
// EX — brisk acceleration. All exits (content leaves decisively).
//
// Screen variants:
//   Hero     (S1)   — scale-only. Gravitas, no y-shift.
//   Nav      (S2-4) — y + scale. Standard pacing.
//   Ceremony (S5)   — slowest stagger. Maximum weight. Closing act.
//
// Parallax depth tiers (y offset = apparent Z distance):
//   lineNear  y:6  fast — labels, anchors
//   line      y:16 mid  — standard body
//   lineFar   y:28 slow — metadata, footers
//   lineSoft  y:10 slow — ceremony elements
//   metric    y:32 + scale:0.88 — editorial numbers, "land" into place
//
const E  = [0.22, 1, 0.36, 1] as const;
const EX = [0.4,  0, 0.8, 1]  as const;

const screenHero = {
  initial: { opacity: 0, scale: 0.984 },
  animate: {
    opacity: 1, scale: 1,
    transition: { duration: 0.55, ease: "easeOut", staggerChildren: 0.12, delayChildren: 0.05 },
  },
  exit: { opacity: 0, scale: 1.016, transition: { duration: 0.24, ease: EX } },
};

const screenNav = {
  initial: { opacity: 0, y: 12, scale: 0.988 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.48, ease: E, staggerChildren: 0.075, delayChildren: 0.04 },
  },
  exit: { opacity: 0, y: -10, scale: 1.010, transition: { duration: 0.20, ease: EX } },
};

const screenCeremony = {
  initial: { opacity: 0, scale: 0.982 },
  animate: {
    opacity: 1, scale: 1,
    transition: { duration: 0.58, ease: "easeOut", staggerChildren: 0.10, delayChildren: 0.06 },
  },
  exit: { opacity: 0, scale: 1.014, transition: { duration: 0.24, ease: EX } },
};

function getScreenVariant(step: number) {
  if (step === 1) return screenHero;
  if (step === TOTAL) return screenCeremony;
  return screenNav;
}

const lineNear = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease: E } },
};
const line = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.52, ease: E } },
};
const lineFar = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.64, ease: E } },
};
const lineSoft = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.70, ease: E } },
};

// Curtain reveal — text rises from behind overflow:hidden mask.
// duration overrides let each word in a sequence accelerate.
function CurtainWord({
  children, style, duration = 0.90,
}: {
  children: string; style?: React.CSSProperties; duration?: number;
}) {
  const variant = {
    initial: { y: "108%" },
    animate: { y: "0%", transition: { duration, ease: E } },
  };
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em" }}>
      <motion.span variants={variant} style={{ display: "block", willChange: "transform", ...style }}>
        {children}
      </motion.span>
    </div>
  );
}

// ─── Shared style constants ───────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize: "0.625rem", fontWeight: 600,
  letterSpacing: "0.14em", textTransform: "uppercase",
  color: "rgba(255,255,255,0.50)",
};

const H2: React.CSSProperties = {
  fontSize: "clamp(2.125rem, 8.5vw, 2.875rem)", fontWeight: 900,
  letterSpacing: "-0.04em", lineHeight: 0.97, color: "#fff", margin: 0,
};

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router = useRouter();
  const [showSplash,     setShowSplash]     = useState(true);
  const [step,           setStep]           = useState(1);
  const [name,           setName]           = useState("");
  const [username,       setUsername]       = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [proofMethod,    setProofMethod]    = useState<ProofMethodType | null>(null);
  const [isEntering,     setIsEntering]     = useState(false);

  useEffect(() => {
    if (!usernameEdited) {
      const s = generateSuggestions(name);
      setUsername(s[0] ?? "");
    }
  }, [name, usernameEdited]);

  // Step 3 = identity (name required), Step 4 = proof (selection required)
  const disabled  = (step === 3 && !name.trim()) || (step === 4 && !proofMethod);
  const showSkip  = [1, 2, 3].includes(step);
  const ctaIsGold = step === 4 || step === TOTAL;

  const splashDone = useCallback(() => setShowSplash(false), []);

  function ctaLabel(): string {
    if (step === 1)     return "Begin";
    if (step === 4)     return "Start my streak";
    if (step === TOTAL) return "Enter ELVN";
    return "Continue";
  }

  function advance() {
    if (disabled) return;
    if (step >= TOTAL) { finish(); return; }
    setStep(s => s + 1);
  }

  function finish() {
    if (typeof window !== "undefined") {
      localStorage.setItem("elvn_onboarding", "1");
      if (name.trim())  localStorage.setItem("elvn_user_name",    name.trim());
      if (username)     localStorage.setItem("elvn_user_handle",  username);
      if (proofMethod)  localStorage.setItem("elvn_proof_method", proofMethod);
    }
    setIsEntering(true);
    setTimeout(() => router.push("/auth"), 900);
  }

  function skip() {
    if (typeof window !== "undefined") localStorage.setItem("elvn_onboarding", "1");
    router.push("/auth");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "radial-gradient(ellipse 65% 42% at 72% -4%, rgba(201,168,76,0.048) 0%, transparent 100%), #000",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse 110% 90% at 50% 50%, transparent 35%, rgba(0,0,0,0.60) 100%)",
      }} />

      <div className="grain" />
      <AmbientLight step={step} />

      {/* Bottom ceremony glow — steps 4 and 5 */}
      <AnimatePresence>
        {ctaIsGold && (
          <motion.div
            key="ceremony-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 1.4, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: "50%", pointerEvents: "none", zIndex: 2,
              background: "linear-gradient(to top, rgba(201,168,76,0.065) 0%, rgba(201,168,76,0.015) 50%, transparent 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div style={{ position: "relative", zIndex: 10, flexShrink: 0, paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div style={{ height: 1, background: "rgba(255,255,255,0.055)", position: "relative", overflow: "hidden" }}>
          <motion.div
            style={{ height: "100%", background: "rgba(201,168,76,0.60)", originX: 0 }}
            initial={false}
            animate={{ width: `${(step / TOTAL) * 100}%` }}
            transition={{ duration: 0.80, ease: E }}
          />
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          padding: `14px ${space.screenX}px 0`, minHeight: 42,
        }}>
          <AnimatePresence>
            {showSkip && !showSplash && (
              <motion.button
                key="skip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.30, ease: E } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                onClick={skip}
                style={{
                  background: "none", border: "none", padding: "6px 0",
                  fontSize: "0.75rem", fontWeight: 400, letterSpacing: "0.02em",
                  color: "rgba(255,255,255,0.40)", cursor: "pointer",
                }}
              >Skip</motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Screen area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 5 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            variants={getScreenVariant(step)}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              height: "100%",
              overflowY: "auto", overflowX: "hidden",
              padding: `clamp(28px, 5vh, 40px) ${space.screenX}px 52px`,
            }}
            className="no-scrollbar"
          >
            {step === 1 && <S1 />}
            {step === 2 && <S2 />}
            {step === 3 && (
              <S3
                name={name} setName={setName}
                username={username} setUsername={setUsername}
                setUsernameEdited={setUsernameEdited}
              />
            )}
            {step === 4 && <S4 proofMethod={proofMethod} setProofMethod={setProofMethod} />}
            {step === 5 && <S5 name={name} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div style={{
        position: "relative", zIndex: 10, flexShrink: 0,
        padding: `8px ${space.screenX}px`,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 24px)`,
      }}>
        <motion.button
          onClick={advance}
          disabled={disabled}
          whileTap={disabled ? {} : { scale: 0.966, y: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          style={{
            width: "100%", padding: "20px 24px",
            borderRadius: "14px", border: "none",
            background: disabled
              ? "rgba(255,255,255,0.04)"
              : ctaIsGold
                ? color.gold.gradient
                : "rgba(255,255,255,0.93)",
            fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "0.015em",
            color: disabled ? "rgba(255,255,255,0.26)" : "#0A0A0A",
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: disabled
              ? "none"
              : ctaIsGold
                ? shadow.goldCTA
                : "0 2px 24px rgba(255,255,255,0.08), 0 1px 0 rgba(255,255,255,0.08) inset",
            transition: "background 0.28s ease, box-shadow 0.28s ease, color 0.22s ease",
            position: "relative", overflow: "hidden",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={ctaLabel()}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: E } }}
              exit={{ opacity: 0, y: -5, transition: { duration: 0.14, ease: EX } }}
              style={{ display: "block", position: "relative", zIndex: 1 }}
            >
              {ctaLabel()}
            </motion.span>
          </AnimatePresence>

          {/* Gold shimmer — plays once when button becomes gold */}
          <AnimatePresence>
            {ctaIsGold && !disabled && (
              <motion.div
                key={`shimmer-${step}`}
                initial={{ x: "-115%", opacity: 1 }}
                animate={{ x: "115%", opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.70, ease: [0.4, 0, 0.6, 1], delay: 0.22 }}
                style={{
                  position: "absolute", inset: 0, zIndex: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Splash overlay */}
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" onComplete={splashDone} />}
      </AnimatePresence>

      {/* Entry ceremony — expands gold glow before navigating */}
      <AnimatePresence>
        {isEntering && (
          <motion.div
            key="entry-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.50, ease: "easeIn" }}
            style={{
              position: "absolute", inset: 0, zIndex: 30,
              background: "#000", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div className="grain" />
            <motion.div
              initial={{ opacity: 0, scale: 0.20 }}
              animate={{ opacity: 0.11, scale: 1.60 }}
              transition={{ duration: 0.95, ease: E }}
              style={{
                position: "absolute", width: "80vw", height: "80vw", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 68%)",
                filter: "blur(80px)", pointerEvents: "none",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.55, ease: E, delay: 0.22 }}
              style={{ position: "relative", zIndex: 1, textAlign: "center" }}
            >
              <span style={{
                fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.42em",
                paddingLeft: "0.42em", textTransform: "uppercase",
                color: "rgba(226,190,116,0.82)", display: "block", marginBottom: 14,
              }}>ELVN</span>
              <div style={{
                width: 40, height: 1, margin: "0 auto",
                background: "linear-gradient(to right, rgba(201,168,76,0.15), rgba(201,168,76,0.50), rgba(201,168,76,0.15))",
              }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes dot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.25;transform:scale(0.60);}}`}</style>
    </div>
  );
}

// ─── Splash ───────────────────────────────────────────────────────────────────

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 3200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.018, transition: { duration: 1.10, ease: "easeInOut" } }}
      style={{
        position: "absolute", inset: 0, zIndex: 20, background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div className="grain" />

      <motion.div
        initial={{ opacity: 0, scale: 0.80 }}
        animate={{ opacity: 0.090, scale: 1 }}
        transition={{ duration: 2.2, ease: "easeOut", delay: 0.10 }}
        style={{
          position: "absolute", width: "90vw", height: "90vw", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 68%)",
          filter: "blur(100px)", pointerEvents: "none",
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.032 }}
        transition={{ duration: 2.8, ease: "easeOut", delay: 0.60 }}
        style={{
          position: "absolute", bottom: "-10%", left: "10%",
          width: "50vw", height: "50vw", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 70%)",
          filter: "blur(72px)", pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, filter: "blur(18px)", y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 1.15, ease: E, delay: 0.40 }}
        >
          <span style={{
            fontSize: "2rem", fontWeight: 700,
            letterSpacing: "0.42em", paddingLeft: "0.42em",
            textTransform: "uppercase",
            color: "rgba(226,190,116,1.0)", display: "block",
          }}>ELVN</span>
        </motion.div>

        <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 22px" }}>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: E, delay: 1.15 }}
            style={{
              width: 56, height: 1,
              background: "linear-gradient(to right, rgba(201,168,76,0.25), rgba(201,168,76,0.75), rgba(201,168,76,0.25))",
              transformOrigin: "left center",
            }}
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.90, ease: E, delay: 1.55 }}
          style={{
            fontSize: "0.5625rem", fontWeight: 500,
            color: "rgba(255,255,255,0.56)",
            letterSpacing: "0.22em", textTransform: "uppercase", margin: 0,
          }}
        >
          Discipline becomes identity
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Ambient light ────────────────────────────────────────────────────────────

function AmbientLight({ step }: { step: number }) {
  type Pos = { top: string; left: string; opacity: number };

  const primary: Record<number, Pos> = {
    1: { top: "-14%", left: "66%", opacity: 0.092 },
    2: { top: "4%",   left: "28%", opacity: 0.042 },
    3: { top: "10%",  left: "76%", opacity: 0.062 },
    4: { top: "14%",  left: "68%", opacity: 0.058 },
    5: { top: "-8%",  left: "50%", opacity: 0.100 },
  };

  const secondary: Record<number, Pos & { color: string }> = {
    1: { top: "90%", left: "16%", opacity: 0.024, color: "rgba(201,168,76,1)"  },
    2: { top: "94%", left: "74%", opacity: 0.014, color: "rgba(201,168,76,1)"  },
    3: { top: "82%", left: "8%",  opacity: 0.020, color: "rgba(201,168,76,1)"  },
    4: { top: "76%", left: "10%", opacity: 0.018, color: "rgba(96,152,216,1)"  },
    5: { top: "78%", left: "84%", opacity: 0.030, color: "rgba(201,168,76,1)"  },
  };

  const p = primary[step]   ?? primary[1];
  const s = secondary[step] ?? secondary[1];

  return (
    <>
      <motion.div
        initial={false}
        animate={{ opacity: p.opacity, top: p.top, left: p.left }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
        style={{
          position: "absolute", width: "90vw", height: "90vw",
          borderRadius: "50%", pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 68%)",
          filter: "blur(100px)", transform: "translate(-50%, -50%)",
        }}
      />
      <motion.div
        initial={false}
        animate={{ opacity: s.opacity, top: s.top, left: s.left }}
        transition={{ duration: 2.0, ease: "easeInOut" }}
        style={{
          position: "absolute", width: "56vw", height: "56vw",
          borderRadius: "50%", pointerEvents: "none", zIndex: 0,
          background: `radial-gradient(circle, ${s.color} 0%, transparent 68%)`,
          filter: "blur(72px)", transform: "translate(-50%, -50%)",
        }}
      />
    </>
  );
}

// ─── S1 — What is ELVN ────────────────────────────────────────────────────────

function S1() {
  const heroFont: React.CSSProperties = {
    fontSize: "clamp(3.75rem, 14.5vw, 5.25rem)",
    fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.93, color: "#fff",
  };
  return (
    <div style={{ paddingTop: "clamp(12px, 3vh, 24px)" }}>
      <motion.div variants={lineSoft} style={{ marginBottom: "clamp(36px, 8vh, 72px)" }}>
        <span style={{
          fontSize: "0.5625rem", fontWeight: 700,
          letterSpacing: "0.30em", textTransform: "uppercase",
          color: "rgba(201,168,76,0.70)",
        }}>ELVN</span>
      </motion.div>

      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute", top: "-20%", left: "-8%",
          width: "90%", height: "150%",
          background: "radial-gradient(ellipse at 35% 45%, rgba(201,168,76,0.10) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        <CurtainWord style={heroFont} duration={0.88}>Discipline</CurtainWord>
        <CurtainWord style={heroFont} duration={0.80}>becomes</CurtainWord>
        <CurtainWord style={heroFont} duration={0.72}>identity.</CurtainWord>
      </div>

      <motion.p variants={lineFar} style={{
        fontSize: "1rem", fontWeight: 400,
        color: "rgba(255,255,255,0.62)", lineHeight: 1.62,
        margin: "clamp(24px, 5vh, 44px) 0 0", maxWidth: 260,
      }}>
        Real proof. Real stakes. Real accountability.
      </motion.p>

      <motion.div variants={lineFar} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "clamp(20px, 4vh, 36px)" }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", background: "#4DC87A",
          animation: "dot 1.9s ease-in-out infinite",
        }} />
        <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "rgba(255,255,255,0.54)", letterSpacing: "0.025em" }}>
          14 members proving right now
        </span>
      </motion.div>
    </div>
  );
}

// ─── S2 — How it works ────────────────────────────────────────────────────────

function S2() {
  return (
    <div style={{ paddingTop: "clamp(16px, 4vh, 28px)" }}>
      <motion.div variants={lineNear} style={{ marginBottom: "clamp(32px, 7vh, 48px)" }}>
        <span style={{ ...LABEL, display: "block", marginBottom: 18 }}>The system</span>
        <h2 style={H2}>How ELVN<br />works.</h2>
      </motion.div>

      {HOW_STEPS.map((s, i) => (
        <motion.div key={s.num} variants={line}>
          <div style={{
            display: "flex", gap: 24, alignItems: "flex-start",
            paddingBottom: i < HOW_STEPS.length - 1 ? "clamp(20px, 4vh, 28px)" : 0,
            marginBottom: i < HOW_STEPS.length - 1 ? 0 : "clamp(24px, 5vh, 32px)",
          }}>
            <span style={{
              fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.12em",
              color: "rgba(201,168,76,0.62)", minWidth: 20, paddingTop: 4, flexShrink: 0,
            }}>{s.num}</span>
            <div>
              <p style={{
                fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.025em",
                color: "#fff", margin: "0 0 9px", lineHeight: 1.20,
              }}>{s.action}</p>
              <p style={{
                fontSize: "0.875rem", fontWeight: 400,
                color: "rgba(255,255,255,0.58)", margin: 0, lineHeight: 1.62,
              }}>{s.detail}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <motion.div variants={lineFar}>
        <span style={{
          fontSize: "0.8125rem", fontWeight: 500,
          color: "rgba(255,255,255,0.48)", letterSpacing: "0.01em",
        }}>
          No exceptions. No shortcuts. No second chances.
        </span>
      </motion.div>
    </div>
  );
}

// ─── S3 — Identity ────────────────────────────────────────────────────────────

type AvailStatus = "idle" | "checking" | "available" | "taken" | "short";

interface S3Props {
  name: string; setName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  setUsernameEdited: (v: boolean) => void;
}

function S3({ name, setName, username, setUsername, setUsernameEdited }: S3Props) {
  const suggestions = generateSuggestions(name);
  const [focused,      setFocused]      = useState(false);
  const [availability, setAvailability] = useState<AvailStatus>("idle");

  // Debounced mock availability check — 380 ms after user stops typing
  useEffect(() => {
    if (!username) { setAvailability("idle"); return; }
    if (username.length < 3) { setAvailability("short"); return; }
    setAvailability("checking");
    const t = setTimeout(() => {
      setAvailability(mockAvailable(username) ? "available" : "taken");
    }, 380);
    return () => clearTimeout(t);
  }, [username]);

  const availColor =
    availability === "available" ? "#4DC87A" :
    availability === "taken"     ? "#E07840" :
    "rgba(255,255,255,0.28)";

  const borderColor = focused
    ? availability === "available" ? "rgba(77,200,122,0.55)"
    : availability === "taken"     ? "rgba(224,120,64,0.46)"
    : "rgba(201,168,76,0.55)"
    : "rgba(255,255,255,0.12)";

  return (
    <div style={{ paddingTop: "clamp(16px, 4vh, 28px)" }}>
      <motion.div variants={lineNear} style={{ marginBottom: "clamp(32px, 7vh, 52px)" }}>
        <span style={{ ...LABEL, display: "block", marginBottom: 16 }}>Your identity</span>
        <h2 style={H2}>Who are you<br />becoming?</h2>
      </motion.div>

      {/* ── Name ── */}
      <motion.div variants={line} style={{ marginBottom: 40 }}>
        <label style={{
          fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.48)",
          display: "block", marginBottom: 16,
        }}>First name</label>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          style={{
            width: "100%", padding: "0 0 18px",
            background: "none", border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.16)",
            fontSize: "1.5rem", fontWeight: 500,
            color: "#fff", outline: "none", letterSpacing: "-0.025em",
          }}
        />
      </motion.div>

      {/* ── Handle — appears once name is typed ── */}
      <AnimatePresence>
        {name.trim() && (
          <motion.div
            key="handle-section"
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.44, ease: E } }}
            exit={{ opacity: 0, y: 6, filter: "blur(2px)", transition: { duration: 0.20, ease: EX } }}
          >
            <label style={{
              fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.48)",
              display: "block", marginBottom: 16,
            }}>Handle</label>

            {/* Input row with inline availability badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0 0 14px",
              borderBottom: `1px solid ${borderColor}`,
              marginBottom: 10,
              transition: "border-color 0.22s ease",
            }}>
              <span style={{
                fontSize: "1.25rem", fontWeight: 600, flexShrink: 0,
                color: focused ? "rgba(201,168,76,0.88)" : "rgba(201,168,76,0.60)",
                transition: "color 0.22s ease",
              }}>@</span>

              <input
                type="text"
                value={username}
                onChange={e => {
                  setUsernameEdited(true);
                  // Strip non-allowed chars, enforce 20-char max
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 20)
                  );
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  flex: 1, background: "none", border: "none",
                  fontSize: "1.25rem", fontWeight: 600,
                  color: "#fff", outline: "none", letterSpacing: "-0.025em",
                }}
              />

              {/* Availability status — animates between states */}
              <AnimatePresence mode="wait">
                {availability !== "idle" && (
                  <motion.span
                    key={availability}
                    initial={{ opacity: 0, scale: 0.78 }}
                    animate={{ opacity: 1, scale: 1, transition: { duration: 0.18, ease: E } }}
                    exit={{ opacity: 0, scale: 0.78, transition: { duration: 0.12 } }}
                    style={{
                      fontSize: "0.5625rem", fontWeight: 700,
                      flexShrink: 0, color: availColor,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {availability === "available" ? "✓ Available"
                   : availability === "taken"     ? "Taken"
                   : availability === "short"     ? "Too short"
                   : "…"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Min-length hint — only while < 3 chars */}
            <AnimatePresence>
              {username.length > 0 && username.length < 3 && (
                <motion.p
                  key="min-hint"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: E } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  style={{
                    fontSize: "0.5625rem", color: "rgba(255,255,255,0.30)",
                    margin: "0 0 12px", letterSpacing: "0.02em",
                  }}
                >
                  Minimum 3 characters
                </motion.p>
              )}
            </AnimatePresence>

            {/* Suggestions — lightweight, secondary, inline */}
            {suggestions.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
                <span style={{
                  fontSize: "0.5625rem", color: "rgba(255,255,255,0.28)",
                  letterSpacing: "0.02em", flexShrink: 0,
                }}>Try:</span>
                {suggestions.map(s => {
                  const active = username === s;
                  return (
                    <motion.button
                      key={s}
                      onClick={() => { setUsername(s); setUsernameEdited(true); }}
                      whileTap={{ scale: 0.93 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{
                        padding: "4px 10px", borderRadius: "9999px",
                        background: active ? "rgba(201,168,76,0.08)" : "transparent",
                        border: `1px solid ${active ? "rgba(201,168,76,0.30)" : "rgba(255,255,255,0.08)"}`,
                        fontSize: "0.6875rem", fontWeight: active ? 600 : 400,
                        color: active ? "rgba(226,190,116,0.90)" : "rgba(255,255,255,0.40)",
                        cursor: "pointer",
                        transition: "background 0.16s ease, border-color 0.16s ease, color 0.16s ease",
                      }}
                    >@{s}</motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── S4 — Proof method ────────────────────────────────────────────────────────

function S4({ proofMethod, setProofMethod }: {
  proofMethod: ProofMethodType | null;
  setProofMethod: (p: ProofMethodType) => void;
}) {
  return (
    <div style={{ paddingTop: "clamp(16px, 4vh, 28px)" }}>
      <motion.div variants={lineNear} style={{ marginBottom: "clamp(24px, 5vh, 40px)" }}>
        <span style={{ ...LABEL, display: "block", marginBottom: 16 }}>Proof method</span>
        <h2 style={{ ...H2, marginBottom: 14 }}>Device-verified<br />proof only.</h2>
        <p style={{ fontSize: "0.875rem", fontWeight: 400, color: "rgba(255,255,255,0.52)", margin: 0, lineHeight: 1.60 }}>
          Every proof is signed by your device. Nothing is self-reported.
        </p>
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {PROOF_METHODS.map(o => {
          const sel = proofMethod === o.key;
          return (
            <motion.div key={o.key} variants={line}>
              <motion.button
                onClick={() => setProofMethod(o.key)}
                whileTap={{ scale: 0.984, y: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                animate={{
                  backgroundColor: sel ? "rgba(201,168,76,0.055)" : "rgba(255,255,255,0.025)",
                  borderColor: sel ? "rgba(201,168,76,0.32)" : "rgba(255,255,255,0.08)",
                }}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  padding: "20px 20px", borderRadius: "16px",
                  border: "1px solid", position: "relative",
                }}
              >
                <AnimatePresence>
                  {sel && (
                    <motion.div
                      key="check"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1, transition: { duration: 0.24, ease: E } }}
                      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.14 } }}
                      style={{
                        position: "absolute", top: 16, right: 16,
                        width: 22, height: 22, borderRadius: "50%",
                        background: color.gold.base,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Check size={12} style={{ color: "#000", strokeWidth: 3 }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.p
                  animate={{ color: sel ? "rgba(201,168,76,0.92)" : "rgba(255,255,255,0.90)" }}
                  transition={{ duration: 0.22 }}
                  style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 5px", letterSpacing: "-0.015em" }}
                >{o.title}</motion.p>

                <p style={{
                  fontSize: "0.8125rem", fontWeight: 400,
                  color: "rgba(255,255,255,0.56)", margin: 0, lineHeight: 1.47,
                }}>{o.sub}</p>

                <AnimatePresence>
                  {sel && (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.30, ease: E } }}
                      exit={{ opacity: 0, y: -4, transition: { duration: 0.16, ease: EX } }}
                    >
                      <p style={{
                        fontSize: "0.8125rem", fontWeight: 400,
                        color: "rgba(255,255,255,0.64)",
                        margin: "14px 0 0", lineHeight: 1.57,
                        paddingTop: 14,
                        borderTop: "1px solid rgba(201,168,76,0.14)",
                      }}>{o.desc}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={lineFar} style={{ marginTop: 24 }}>
        <p style={{
          fontSize: "0.6875rem", fontWeight: 400, color: "rgba(255,255,255,0.44)",
          margin: 0, letterSpacing: "0.03em", lineHeight: 1.6,
        }}>
          Device-signed · tamper-proof · permanent record
        </p>
      </motion.div>
    </div>
  );
}

// ─── S5 — Entry ceremony ──────────────────────────────────────────────────────

function S5({ name }: { name: string }) {
  const firstName = name.split(" ")[0] ?? "";
  const curtainPhrases = (() => {
    if (!firstName) return ["You're entering", "a private", "network."];
    if (firstName.length > 9) return [firstName, "you're entering", "a private network."];
    return [`${firstName}, you're`, "entering a", "private network."];
  })();
  const heroFont: React.CSSProperties = {
    fontSize: "clamp(2.25rem, 10vw, 3.25rem)",
    fontWeight: 900, letterSpacing: "-0.048em", lineHeight: 0.96, color: "#fff",
  };
  return (
    <div style={{ paddingTop: "clamp(16px, 4vh, 32px)" }}>
      <motion.div variants={lineSoft} style={{ marginBottom: "clamp(48px, 10vh, 80px)" }}>
        <span style={{
          fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.30em",
          textTransform: "uppercase", color: "rgba(201,168,76,0.72)",
        }}>ELVN</span>
      </motion.div>

      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute", top: "-15%", left: "-5%",
          width: "85%", height: "130%",
          background: "radial-gradient(ellipse at 30% 45%, rgba(201,168,76,0.09) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        {curtainPhrases.map((phrase, i) => (
          <CurtainWord key={phrase} style={heroFont} duration={0.88 - i * 0.08}>
            {phrase}
          </CurtainWord>
        ))}
      </div>

      <motion.div variants={lineFar} style={{ marginTop: "clamp(20px, 4vh, 28px)", marginBottom: "clamp(28px, 6vh, 44px)" }}>
        <p style={{
          fontSize: "1rem", fontWeight: 400,
          color: "rgba(255,255,255,0.60)", margin: 0, lineHeight: 1.64,
        }}>
          2,438 members showing up daily.<br />Device-verified. No exceptions.
        </p>
      </motion.div>

      <motion.div variants={lineSoft} style={{ marginBottom: 28 }}>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.65, ease: E, delay: 0.30 }}
          style={{
            height: 1,
            background: "linear-gradient(to right, rgba(201,168,76,0.14), rgba(201,168,76,0.32), rgba(201,168,76,0.14))",
            transformOrigin: "left center",
          }}
        />
      </motion.div>

      <motion.div variants={lineSoft}>
        {[
          "Show up every day.",
          "Submit device proof or lose your streak.",
          "Consistency is the only currency.",
        ].map((rule, i) => (
          <div key={rule} style={{
            display: "flex", alignItems: "flex-start", gap: 14,
            paddingBottom: i < 2 ? 20 : 0,
            marginBottom: i < 2 ? 20 : 0,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "rgba(201,168,76,0.55)", flexShrink: 0,
              marginTop: "0.45em",
            }} />
            <span style={{
              fontSize: "0.9375rem", fontWeight: 500,
              color: "rgba(255,255,255,0.74)", letterSpacing: "-0.005em",
              lineHeight: 1.45,
            }}>{rule}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
