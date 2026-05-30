"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/authStore";
import { color, shadow, space } from "@/lib/tokens";

const KEY = "elvn_walkthrough_seen";

// ─── Motion easing ────────────────────────────────────────────────────────────
const E = [0.22, 1, 0.36, 1] as const;

// ─── Step definitions ─────────────────────────────────────────────────────────
// selector  → CSS selector for the real DOM element to highlight.
// ringPad   → extra px added around the element's bounding box on each side.
// rR        → border-radius of the spotlight ring.
// accent    → colour used for the ring glow and card accent.
//
// Selectors are chosen to be unambiguous within the shell:
//   nav a[href=…]  → BottomNav tabs (scoped to <nav>, not page links)
//   a[href="/camera"]  → CameraFAB (only fixed camera link in the shell)
//   a.tb-avatar    → TopBar profile link (has the .tb-avatar className)

interface Step {
  title:    string;
  sub:      string;
  selector: string;
  ringPad:  number;
  rR:       string;
  accent:   string;
}

const STEPS: Step[] = [
  {
    title:    "Live accountability from the ELVN network.",
    sub:      "Track real progress, streaks, and proof activity.",
    selector: "nav a[href='/feed']",
    ringPad:  8, rR: "14px",
    accent:   "#4DC87A",
  },
  {
    title:    "Join challenges to build streaks and discipline.",
    sub:      "Consistency increases your reputation.",
    selector: "nav a[href='/challenges']",
    ringPad:  8, rR: "14px",
    accent:   "#E2BE74",
  },
  {
    title:    "Submit proof daily to protect your streak.",
    sub:      "Device-verified. No fakes accepted. No exceptions.",
    selector: "a[href='/camera']",
    ringPad:  8, rR: "50%",
    accent:   "#E2BE74",
  },
  {
    title:    "Earn coins, status, and rewards through consistency.",
    sub:      "Discipline compounds over time.",
    selector: "nav a[href='/wallet']",
    ringPad:  8, rR: "14px",
    accent:   "#C9A84C",
  },
  {
    title:    "Your identity lives here.",
    sub:      "Track streaks, proof history, and reputation.",
    selector: "a.tb-avatar",
    ringPad:  7, rR: "50%",
    accent:   "#8B8BDE",
  },
];

// ─── Measured position of the target element ──────────────────────────────────
interface SpotPos {
  cx: number; // viewport center-x
  cy: number; // viewport center-y
  w:  number; // element width
  h:  number; // element height
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function hexRgb(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

function measure(selector: string): SpotPos | null {
  const el = document.querySelector<Element>(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalkthroughOverlay() {
  const [visible, setVisible] = useState(false);
  const [step,    setStep]    = useState(0);
  const [pos,     setPos]     = useState<SpotPos | null>(null);
  const pathname  = usePathname();
  const { user, isLoading } = useAuth();

  // ── Trigger: show once, after first authenticated app-page visit ─────────────
  useEffect(() => {
    if (isLoading || !user) return;
    if (["/", "/welcome", "/auth"].includes(pathname)) return;
    try { if (localStorage.getItem(KEY)) return; } catch { return; }
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [user, isLoading, pathname]);

  // ── Measure: getBoundingClientRect on step change and window resize ───────────
  const remeasure = useCallback(() => {
    if (!visible) return;
    setPos(measure(STEPS[step].selector));
  }, [step, visible]);

  useEffect(() => {
    // Run immediately so the ring appears in the right place from frame one.
    remeasure();
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, [remeasure]);

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setVisible(false);
  }

  function advance() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }

  const s      = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Derived ring dimensions from measured element size + padding
  const pad   = s.ringPad;
  const ringW = pos ? pos.w + pad * 2 : 0;
  const ringH = pos ? pos.h + pad * 2 : 0;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── Tap-to-advance backdrop ────────────────────────────────────── */}
          <motion.div
            key="wt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.20 }}
            onClick={advance}
            style={{ position: "fixed", inset: 0, zIndex: 8998, cursor: "pointer" }}
          />

          {/* ── Spotlight ring ─────────────────────────────────────────────────
               Rendered only after the DOM measurement succeeds.
               Positioned with transform: translate(-50%, -50%) so that
               left/top point to the element's exact center — no offset drift.
               key={step} triggers the cross-fade animation on step change.  ── */}
          <AnimatePresence mode="wait">
            {pos && (
              <motion.div
                key={`wt-ring-${step}`}
                initial={{ opacity: 0, scale: 0.78 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.78 }}
                transition={{ duration: 0.28, ease: E }}
                style={{
                  position:      "fixed",
                  left:          pos.cx,
                  top:           pos.cy,
                  width:         ringW,
                  height:        ringH,
                  borderRadius:  s.rR,
                  border:        `2px solid ${s.accent}`,
                  // translate(-50%, -50%) perfectly centers the ring on the element.
                  // No bottom/top/left offsets — all relative to real DOM bounds.
                  transform:     "translate(-50%, -50%)",
                  boxShadow:     [
                    "0 0 0 9999px rgba(0,0,0,0.76)",
                    `0 0 20px rgba(${hexRgb(s.accent)},0.60)`,
                    `0 0 44px rgba(${hexRgb(s.accent)},0.24)`,
                  ].join(", "),
                  zIndex:        9000,
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>

          {/* ── Tooltip card ───────────────────────────────────────────────────
               Vertically centered in the viewport — independent of spotlight
               position so it stays readable on all screen sizes.           ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`wt-card-${step}`}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.34, ease: E, delay: 0.06 }}
              style={{
                position:      "fixed",
                left:          space.screenX,
                right:         space.screenX,
                top:           "50%",
                transform:     "translateY(-50%)",
                zIndex:        9001,
                pointerEvents: "auto",
              }}
            >
              <div style={{
                background:   "linear-gradient(155deg, rgba(14,12,10,0.99) 0%, rgba(9,8,7,0.99) 100%)",
                border:       `1px solid rgba(${hexRgb(s.accent)},0.28)`,
                borderRadius: "18px",
                padding:      "22px 22px 20px",
                boxShadow:    [
                  "0 28px 72px rgba(0,0,0,0.65)",
                  "0 0 0 1px rgba(255,255,255,0.03) inset",
                  `0 0 44px rgba(${hexRgb(s.accent)},0.07)`,
                ].join(", "),
              }}>

                {/* Progress indicator — active step is wider */}
                <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
                  {STEPS.map((_, i) => (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={{
                        width:      i === step ? 22 : 5,
                        background: i <= step ? s.accent : "rgba(255,255,255,0.09)",
                        opacity:    i < step ? 0.45 : 1,
                      }}
                      transition={{ duration: 0.28, ease: E }}
                      style={{ height: 4, borderRadius: 3, flexShrink: 0 }}
                    />
                  ))}
                </div>

                {/* Step counter */}
                <span style={{
                  fontSize:      "0.4375rem",
                  fontWeight:    700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color:         s.accent,
                  opacity:       0.72,
                  display:       "block",
                  marginBottom:  8,
                }}>
                  {step + 1} of {STEPS.length}
                </span>

                {/* Title */}
                <h3 style={{
                  fontSize:      "1.0625rem",
                  fontWeight:    800,
                  letterSpacing: "-0.03em",
                  lineHeight:    1.28,
                  color:         "#fff",
                  margin:        "0 0 9px",
                }}>
                  {s.title}
                </h3>

                {/* Subtext */}
                <p style={{
                  fontSize:   "0.8125rem",
                  fontWeight: 400,
                  color:      "rgba(255,255,255,0.50)",
                  lineHeight: 1.55,
                  margin:     "0 0 22px",
                }}>
                  {s.sub}
                </p>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(); }}
                    style={{
                      background: "none",
                      border:     "none",
                      cursor:     "pointer",
                      fontSize:   "0.75rem",
                      fontWeight: 400,
                      padding:    "6px 0",
                      color:      "rgba(255,255,255,0.26)",
                    }}
                  >
                    Skip
                  </button>

                  <motion.button
                    onClick={e => { e.stopPropagation(); advance(); }}
                    whileTap={{ scale: 0.96, y: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    style={{
                      padding:       "11px 24px",
                      borderRadius:  "10px",
                      border:        isLast ? "none" : `1px solid rgba(${hexRgb(s.accent)},0.28)`,
                      background:    isLast ? color.gold.gradient : `rgba(${hexRgb(s.accent)},0.13)`,
                      color:         isLast ? "#000" : s.accent,
                      fontSize:      "0.8125rem",
                      fontWeight:    700,
                      letterSpacing: "0.01em",
                      cursor:        "pointer",
                      boxShadow:     isLast ? shadow.goldCTA : "none",
                      transition:    "background 0.22s ease",
                    }}
                  >
                    {isLast ? "Enter ELVN →" : "Next"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
