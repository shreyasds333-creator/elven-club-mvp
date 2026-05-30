import type { CSSProperties } from "react";

// ─── Color ───────────────────────────────────────────────────────────────────
export const color = {
  // Layered backgrounds — depth through elevation, not brightness
  bg: {
    base:    "#000000",
    deep:    "#070707",
    card:    "#101010",
    surface: "#161616",
    muted:   "#1C1C1C",
    overlay: "rgba(0,0,0,0.75)",
  },

  // Gold — warm jewelry tone. Never yellow, never neon.
  gold: {
    bright:   "#E2BE74",
    base:     "#C9A84C",
    deep:     "#A07828",
    subtle:   "rgba(201,168,76,0.07)",
    glow:     "rgba(201,168,76,0.13)",
    border:   "rgba(201,168,76,0.20)",
    gradient: "linear-gradient(135deg, #E2BE74 0%, #C9A84C 100%)",
  },

  // Text — white at multiple opacities for hierarchy
  text: {
    primary:   "#FFFFFF",
    secondary: "rgba(255,255,255,0.54)",
    tertiary:  "rgba(255,255,255,0.30)",
    muted:     "rgba(255,255,255,0.16)",
  },

  // Borders — barely-there layering
  border: {
    faint:   "rgba(255,255,255,0.04)",
    subtle:  "rgba(255,255,255,0.07)",
    default: "rgba(255,255,255,0.10)",
    strong:  "rgba(255,255,255,0.15)",
  },

  // Status
  status: {
    success: "#4DC87A",  // coins won / on track
    streak:  "#E07840",  // streak / urgency
    info:    "#6098D8",  // neutral / enrolled
  },
} as const;

// ─── Mission Category Atmospheres ────────────────────────────────────────────
// One soft ambient glow per category on near-black — cinematic depth, no neons
export const covers = {
  performance:    "radial-gradient(ellipse at 22% 18%, rgba(99,102,241,0.26) 0%, transparent 62%), #07070F",
  discipline:     "radial-gradient(ellipse at 22% 18%, rgba(180,83,9,0.26) 0%, transparent 62%), #0C0804",
  transformation: "radial-gradient(ellipse at 22% 18%, rgba(4,120,87,0.24) 0%, transparent 62%), #050E09",
  social:         "radial-gradient(ellipse at 22% 18%, rgba(37,99,235,0.28) 0%, transparent 62%), #050810",
  elite:          "radial-gradient(ellipse at 22% 18%, rgba(201,168,76,0.22) 0%, transparent 62%), #0D0A04",
} as const;

// Accent color per category — for prize amounts, highlights
export const accentByCategory: Record<string, string> = {
  performance:    "#8B8BDE",
  discipline:     "#C9A84C",
  transformation: "#4DC87A",
  social:         "#6098D8",
  elite:          "#E2BE74",
};

// Difficulty tier visual config (legacy — use tierStyle for challenge tiers)
export const difficultyStyle: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  Beginner: {
    text:   "rgba(255,255,255,0.48)",
    bg:     "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.09)",
  },
  Intermediate: {
    text:   "#6098D8",
    bg:     "rgba(96,152,216,0.08)",
    border: "rgba(96,152,216,0.18)",
  },
  Elite: {
    text:   "#C9A84C",
    bg:     "rgba(201,168,76,0.08)",
    border: "rgba(201,168,76,0.20)",
  },
};

// Challenge room tier identities — Rookie → Warrior → Elite → Insane
export const tierStyle: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  Rookie:  { text: "rgba(255,255,255,0.55)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.10)", glow: "rgba(255,255,255,0.06)" },
  Warrior: { text: "#6098D8",                bg: "rgba(96,152,216,0.08)",  border: "rgba(96,152,216,0.20)",  glow: "rgba(96,152,216,0.08)"  },
  Elite:   { text: "#C9A84C",                bg: "rgba(201,168,76,0.08)",  border: "rgba(201,168,76,0.22)",  glow: "rgba(201,168,76,0.08)"  },
  Insane:  { text: "#E07840",                bg: "rgba(224,120,64,0.10)",  border: "rgba(224,120,64,0.24)",  glow: "rgba(224,120,64,0.08)"  },
};

// ─── Radius ──────────────────────────────────────────────────────────────────
export const radius = {
  xs:   "6px",
  sm:   "10px",
  md:   "14px",
  lg:   "18px",
  xl:   "22px",
  xxl:  "26px",
  full: "9999px",
} as const;

// ─── Shadow ──────────────────────────────────────────────────────────────────
export const shadow = {
  goldCTA:  "0 6px 28px rgba(201,168,76,0.32), 0 2px 8px rgba(0,0,0,0.6)",
  goldAura: "0 0 60px rgba(201,168,76,0.10)",
  cardLift: "0 8px 32px rgba(0,0,0,0.55)",
  navBlur:  "0 -24px 48px rgba(0,0,0,0.7)",
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
export const typo = {
  metric: {
    fontWeight: 800,
    letterSpacing: "-0.05em",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.0,
  } satisfies CSSProperties,

  heading: {
    fontSize: "1.125rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
  } satisfies CSSProperties,

  title: {
    fontSize: "1rem",
    fontWeight: 700,
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
  } satisfies CSSProperties,

  label: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.09em",
    textTransform: "uppercase" as const,
    lineHeight: 1,
  } satisfies CSSProperties,

  body: {
    fontSize: "0.875rem",
    fontWeight: 400,
    letterSpacing: "0em",
    lineHeight: 1.5,
  } satisfies CSSProperties,

  caption: {
    fontSize: "0.75rem",
    fontWeight: 400,
    letterSpacing: "0.01em",
    lineHeight: 1.4,
  } satisfies CSSProperties,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const space = {
  screenX:  20,
  sectionY: 36,
  cardPad:  18,
  gap:      12,
} as const;

// ─── Transitions ─────────────────────────────────────────────────────────────
export const motion = {
  fast:   "0.14s cubic-bezier(0.4, 0, 0.2, 1)",
  base:   "0.22s cubic-bezier(0.4, 0, 0.2, 1)",
  slow:   "0.40s cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "0.36s cubic-bezier(0.175, 0.885, 0.32, 1.1)",
} as const;
