"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { color, radius, typo, space, motion } from "@/lib/tokens";
import { fmt } from "@/lib/challengeData";
import { useAppStore, type CreateChallengeConfig } from "@/lib/appStore";
import type { Challenge } from "@/lib/challengeData";

// ─── Types ────────────────────────────────────────────────────────────────────
type FormState = CreateChallengeConfig & { startDate: string; endDate: string };
type Patcher   = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

const STEP_TITLES = ["", "Challenge Type", "Basic Info", "Rules & Goal", "Schedule", "Prize & Entry", "Review"];

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDays(from: string, n: number): string {
  if (!from) return "";
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysFromDates(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CreateNewPage() {
  const router = useRouter();
  const store  = useAppStore();

  const [step,    setStep]    = useState(1);
  const [created, setCreated] = useState<Challenge | null>(null);
  const [copied,  setCopied]  = useState(false);

  const today = todayStr();

  const [form, setForm] = useState<FormState>({
    isPublic:  false,
    memberCap: 50,
    title:     "",
    tagline:   "",
    category:  "discipline",
    stepGoal:  10000,
    proofType: "Camera Proof",
    minStreak: 0,
    duration:  14,
    entry:     0,
    startDate: today,
    endDate:   addDays(today, 14),
  });

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function patchDuration(start: string, end: string) {
    const d = daysFromDates(start, end);
    setForm(prev => ({ ...prev, startDate: start, endDate: end, duration: d }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 2: return form.title.trim().length >= 3;
      case 4: return form.duration >= 3 && form.duration <= 30;
      case 5: return form.isPublic ? form.entry > 0 : form.entry >= 0;
      default: return true;
    }
  }

  function handleNext() {
    if (step < 6) {
      setStep(s => s + 1);
    } else {
      const challenge = store.createChallenge({
        isPublic:  form.isPublic,
        memberCap: form.memberCap,
        title:     form.title,
        tagline:   form.tagline,
        category:  form.category,
        stepGoal:  form.stepGoal,
        proofType: form.proofType,
        minStreak: form.minStreak,
        duration:  form.duration,
        entry:     form.entry,
      });
      setCreated(challenge);
      setStep(7);
    }
  }

  function handleBack() {
    if (step === 1) router.back();
    else setStep(s => s - 1);
  }

  function copyCode() {
    if (!created?.inviteCode) return;
    navigator.clipboard.writeText(created.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Success Screen ────────────────────────────────────────────────────────
  if (step === 7 && created) {
    return (
      <div style={{ minHeight: "100dvh", background: color.bg.base, display: "flex", flexDirection: "column", padding: `52px ${space.screenX}px 48px`, boxSizing: "border-box" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>

          {/* Check mark */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(77,200,122,0.12)", border: "2px solid rgba(77,200,122,0.30)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 0 40px rgba(77,200,122,0.18)", animation: "scaleIn 0.45s cubic-bezier(.175,.885,.32,1.275) both" }}>
            <Check size={32} style={{ color: "#4DC87A" }} strokeWidth={2.5} />
          </div>

          <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", color: "#4DC87A", textTransform: "uppercase", marginBottom: 10 }}>
            Challenge Created
          </p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em", color: color.text.primary, margin: "0 0 8px", lineHeight: 1.1 }}>
            {created.title}
          </h1>
          <p style={{ fontSize: "0.8125rem", color: color.text.secondary, marginBottom: 32, maxWidth: 280, lineHeight: 1.5 }}>
            {created.isPublic
              ? "Your challenge is now live on the discover feed."
              : "Share the invite code to fill your room."}
          </p>

          {/* Invite code — private only */}
          {!created.isPublic && created.inviteCode && (
            <div style={{ marginBottom: 24, width: "100%" }}>
              <p style={{ ...typo.label, color: color.text.tertiary, marginBottom: 10 }}>Invite Code</p>
              <button
                onClick={copyCode}
                style={{ width: "100%", padding: "16px 20px", borderRadius: radius.lg, background: "rgba(96,152,216,0.07)", border: "1px solid rgba(96,152,216,0.22)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              >
                <span style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "0.18em", color: "#6098D8" }}>
                  {created.inviteCode}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {copied
                    ? <Check size={14} style={{ color: "#4DC87A" }} />
                    : <Copy  size={14} style={{ color: color.text.muted }} />
                  }
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: copied ? "#4DC87A" : color.text.muted }}>
                    {copied ? "Copied!" : "Copy"}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Summary */}
          <div style={{ width: "100%", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${color.border.faint}`, overflow: "hidden", marginBottom: 32 }}>
            {[
              { label: "Duration",   value: `${created.duration} days`         },
              { label: "Entry Fee",  value: created.entry === 0 ? "Free" : fmt(created.entry) },
              { label: "Prize Pool", value: created.entry > 0 ? fmt(created.prize) : "None"  },
              { label: "Capacity",   value: `${created.maxParticipants} members` },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < 3 ? `1px solid ${color.border.faint}` : "none" }}>
                <span style={{ fontSize: "0.75rem", color: color.text.tertiary }}>{r.label}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: color.text.primary }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={() => router.push(`/challenges/${created.id}`)}
            style={{ width: "100%", padding: "17px", borderRadius: 14, background: "linear-gradient(135deg,#C9A84C,#A07828)", border: "none", fontSize: "0.9375rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#000", cursor: "pointer", boxShadow: "0 0 32px rgba(201,168,76,0.32)" }}
          >
            View Room →
          </button>
          <button
            onClick={() => router.push("/challenges")}
            style={{ width: "100%", padding: "14px", borderRadius: 14, background: "none", border: `1px solid ${color.border.subtle}`, fontSize: "0.875rem", fontWeight: 600, color: color.text.secondary, cursor: "pointer" }}
          >
            Back to Discover
          </button>
        </div>

        <style>{`
          @keyframes scaleIn {
            0%   { opacity: 0; transform: scale(0.5); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // ── Form Layout ───────────────────────────────────────────────────────────
  const ctaLabel    = step < 6 ? "Continue →" : "Create Challenge";
  const ctaDisabled = !canProceed();
  const isGoldCTA   = step === 6 && !ctaDisabled;

  return (
    <div style={{ minHeight: "100dvh", background: color.bg.base, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

      {/* ── Step header ── */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 10,
          padding: "14px 20px 12px",
          paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: `1px solid ${color.border.faint}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button
            onClick={handleBack}
            style={{ width: 34, height: 34, borderRadius: radius.full, background: color.bg.surface, border: `1px solid ${color.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <ArrowLeft size={14} style={{ color: color.text.secondary }} />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.4375rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: color.text.muted, margin: "0 0 2px" }}>
              STEP {step} OF 6
            </p>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: color.text.primary, margin: 0, letterSpacing: "-0.02em" }}>
              {STEP_TITLES[step]}
            </p>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? color.gold.base : "rgba(255,255,255,0.07)",
                boxShadow: i <= step ? "0 0 6px rgba(201,168,76,0.30)" : "none",
                transition: `background ${motion.base}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Step content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: `24px ${space.screenX}px 140px` }}>
        {step === 1 && <Step1 form={form} patch={patch} />}
        {step === 2 && <Step2 form={form} patch={patch} />}
        {step === 3 && <Step3 form={form} patch={patch} />}
        {step === 4 && <Step4 form={form} patchDuration={patchDuration} />}
        {step === 5 && <Step5 form={form} patch={patch} />}
        {step === 6 && <Step6 form={form} />}
      </div>

      {/* ── Bottom CTA ── */}
      <div
        style={{
          position: "fixed", bottom: "var(--navbar-h)", left: 0, right: 0,
          padding: "14px 20px",
          background: "rgba(0,0,0,0.94)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: `1px solid ${color.border.faint}`,
        }}
      >
        <button
          onClick={handleNext}
          disabled={ctaDisabled}
          style={{
            width: "100%", padding: "17px", borderRadius: 14,
            background: isGoldCTA ? "linear-gradient(135deg,#C9A84C,#A07828)" : ctaDisabled ? "rgba(255,255,255,0.05)" : "rgba(201,168,76,0.10)",
            border: isGoldCTA ? "none" : ctaDisabled ? `1px solid ${color.border.faint}` : `1.5px solid ${color.gold.border}`,
            fontSize: "0.9375rem", fontWeight: 800, letterSpacing: "0.05em",
            color: isGoldCTA ? "#000" : ctaDisabled ? color.text.muted : color.gold.base,
            cursor: ctaDisabled ? "not-allowed" : "pointer",
            opacity: ctaDisabled ? 0.48 : 1,
            boxShadow: isGoldCTA ? "0 0 32px rgba(201,168,76,0.32)" : "none",
            transition: `all ${motion.base}`,
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Step 1: Challenge Type ────────────────────────────────────────────────────
const CAPS = [50, 100, 250, 500] as const;

function Step1({ form, patch }: { form: FormState; patch: Patcher }) {
  return (
    <div>
      <p style={{ fontSize: "0.8125rem", color: color.text.secondary, marginBottom: 24, lineHeight: 1.6 }}>
        Private rooms are invite-only. Public challenges appear on the discover feed and earn you a creator fee.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {([
          { isPublic: false as const, emoji: "🔒", title: "Private Room",      desc: "Invite-only. Max 50. Free or paid. You auto-join as member 1." },
          { isPublic: true  as const, emoji: "🌐", title: "Public Challenge",  desc: "Discoverable by all. Earn 10% creator fee per participant."       },
        ]).map(o => {
          const active = form.isPublic === o.isPublic;
          return (
            <button
              key={String(o.isPublic)}
              onClick={() => {
                patch("isPublic", o.isPublic);
                if (!o.isPublic) patch("memberCap", 50);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 16, padding: "18px 16px",
                borderRadius: radius.xl,
                background: active ? "rgba(201,168,76,0.07)" : color.bg.surface,
                border: active ? `2px solid ${color.gold.border}` : `1.5px solid ${color.border.faint}`,
                cursor: "pointer", textAlign: "left", width: "100%",
                boxShadow: active ? "0 0 24px rgba(201,168,76,0.08)" : "none",
                transition: `all ${motion.base}`,
              }}
            >
              <div style={{ width: 46, height: 46, borderRadius: radius.lg, background: active ? "rgba(201,168,76,0.10)" : "rgba(255,255,255,0.04)", border: active ? `1px solid ${color.gold.border}` : `1px solid ${color.border.faint}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>
                {o.emoji}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{ fontSize: "1rem", fontWeight: 800, color: active ? color.gold.base : color.text.primary, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{o.title}</p>
                <p style={{ fontSize: "0.6875rem", color: color.text.secondary, margin: 0, lineHeight: 1.45 }}>{o.desc}</p>
              </div>
              {active && <Check size={18} style={{ color: color.gold.base, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Cap selector — public only */}
      {form.isPublic && (
        <div>
          <p style={{ ...typo.label, color: color.text.tertiary, marginBottom: 12 }}>Room Size Cap</p>
          <div style={{ display: "flex", gap: 8 }}>
            {CAPS.map(cap => {
              const active = form.memberCap === cap;
              return (
                <button
                  key={cap}
                  onClick={() => patch("memberCap", cap)}
                  style={{ flex: 1, padding: "12px 4px", borderRadius: radius.md, background: active ? "rgba(201,168,76,0.10)" : color.bg.surface, border: active ? `1px solid ${color.gold.border}` : `1px solid ${color.border.faint}`, cursor: "pointer", transition: `all ${motion.fast}` }}
                >
                  <p style={{ fontSize: "0.875rem", fontWeight: 800, color: active ? color.gold.base : color.text.primary, margin: "0 0 2px" }}>{cap}</p>
                  <p style={{ fontSize: "0.4375rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.text.muted, margin: 0 }}>members</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Basic Info ────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "discipline",     label: "Discipline",     emoji: "🧠" },
  { key: "performance",    label: "Performance",    emoji: "🏆" },
  { key: "transformation", label: "Transformation", emoji: "🔥" },
  { key: "elite",          label: "Elite",          emoji: "👑" },
  { key: "social",         label: "Social",         emoji: "👥" },
] as const;

function Step2({ form, patch }: { form: FormState; patch: Patcher }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Title */}
      <div>
        <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 10 }}>Challenge Name</label>
        <input
          type="text"
          value={form.title}
          onChange={e => patch("title", e.target.value)}
          placeholder="e.g. Morning Warriors"
          maxLength={40}
          style={{ width: "100%", padding: "14px 16px", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${form.title.length >= 3 ? color.gold.border : color.border.subtle}`, color: color.text.primary, fontSize: "0.9375rem", fontWeight: 600, outline: "none", transition: `border-color ${motion.fast}`, boxSizing: "border-box" }}
        />
        <p style={{ fontSize: "0.5625rem", color: color.text.muted, marginTop: 6, textAlign: "right" }}>{form.title.length}/40</p>
      </div>

      {/* Tagline */}
      <div>
        <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 10 }}>
          Tagline&nbsp;<span style={{ color: color.text.muted, fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: "0.625rem" }}>optional</span>
        </label>
        <input
          type="text"
          value={form.tagline}
          onChange={e => patch("tagline", e.target.value)}
          placeholder="e.g. 30 days. No excuses."
          maxLength={60}
          style={{ width: "100%", padding: "14px 16px", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${color.border.subtle}`, color: color.text.primary, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Category */}
      <div>
        <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 10 }}>Category</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map(c => {
            const active = form.category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => patch("category", c.key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: radius.full, background: active ? "rgba(201,168,76,0.10)" : color.bg.surface, border: active ? `1px solid ${color.gold.border}` : `1px solid ${color.border.faint}`, cursor: "pointer", transition: `all ${motion.fast}` }}
              >
                <span style={{ fontSize: "0.875rem" }}>{c.emoji}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: active ? color.gold.base : color.text.secondary }}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Rules & Goal ─────────────────────────────────────────────────────
const STEP_GOALS   = [5000, 8000, 10000, 12000, 15000, 20000, 30000, 50000] as const;
const PROOF_TYPES  = [
  {
    key:   "Camera Proof",
    emoji: "📸",
    desc:  "Real-time camera snap. Live only. No gallery uploads.",
    badge: "📸 Live proof only",
    detail: "Members open the ELVN camera and snap a live photo to prove their workout. No screenshots, no gallery. Keeps the community honest.",
  },
  {
    key:   "Step Tracking",
    emoji: "📍",
    desc:  "Passive GPS step tracking. Auto-verified daily steps.",
    badge: "📍 Auto-verified",
    detail: "Members' step counts are tracked passively via the ELVN motion sensor. No manual input needed. Proof is automatic.",
  },
] as const;

function Step3({ form, patch }: { form: FormState; patch: Patcher }) {
  const selectedProof = PROOF_TYPES.find(p => p.key === form.proofType) ?? PROOF_TYPES[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Step goal */}
      <div>
        <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 10 }}>Daily Step Goal</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STEP_GOALS.map(g => {
            const active = form.stepGoal === g;
            const label  = g >= 1000 ? `${g / 1000}K` : `${g}`;
            return (
              <button
                key={g}
                onClick={() => patch("stepGoal", g)}
                style={{ padding: "9px 16px", borderRadius: radius.full, background: active ? "rgba(201,168,76,0.10)" : color.bg.surface, border: active ? `1px solid ${color.gold.border}` : `1px solid ${color.border.faint}`, cursor: "pointer", transition: `all ${motion.fast}` }}
              >
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: active ? color.gold.base : color.text.secondary }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Proof type */}
      <div>
        <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 12 }}>Proof Type</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PROOF_TYPES.map(p => {
            const active = form.proofType === p.key;
            return (
              <button
                key={p.key}
                onClick={() => patch("proofType", p.key)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: radius.lg, background: active ? "rgba(201,168,76,0.06)" : color.bg.surface, border: active ? `1px solid ${color.gold.border}` : `1px solid ${color.border.faint}`, cursor: "pointer", textAlign: "left", width: "100%", transition: `all ${motion.base}` }}
              >
                <span style={{ fontSize: "1.25rem", lineHeight: 1, flexShrink: 0 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 700, color: active ? color.gold.base : color.text.primary, margin: "0 0 2px" }}>{p.key}</p>
                  <p style={{ fontSize: "0.5625rem", color: color.text.muted, margin: 0 }}>{p.desc}</p>
                </div>
                {active && <Check size={15} style={{ color: color.gold.base, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Explanation card for selected proof type */}
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: radius.lg, background: "rgba(255,255,255,0.03)", border: `1px solid ${color.border.faint}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: "0.5625rem", fontWeight: 700, padding: "3px 8px", borderRadius: radius.full, background: "rgba(201,168,76,0.08)", border: `1px solid ${color.gold.border}`, color: color.gold.base }}>
              {selectedProof.badge}
            </span>
          </div>
          <p style={{ fontSize: "0.6875rem", color: color.text.secondary, margin: 0, lineHeight: 1.55 }}>
            {selectedProof.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Schedule ─────────────────────────────────────────────────────────
function Step4({ form, patchDuration }: { form: FormState; patchDuration: (s: string, e: string) => void }) {
  const days  = form.duration;
  const valid = days >= 3 && days <= 30;
  const durationColor = !form.endDate ? color.text.muted : valid ? "#4DC87A" : "#E07840";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 10 }}>Start Date</label>
        <input
          type="date"
          value={form.startDate}
          min={todayStr()}
          onChange={e => patchDuration(e.target.value, form.endDate)}
          style={{ width: "100%", padding: "14px 16px", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${color.border.subtle}`, color: color.text.primary, fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      <div>
        <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 10 }}>End Date</label>
        <input
          type="date"
          value={form.endDate}
          min={form.startDate || todayStr()}
          onChange={e => patchDuration(form.startDate, e.target.value)}
          style={{ width: "100%", padding: "14px 16px", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${color.border.subtle}`, color: color.text.primary, fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {form.startDate && form.endDate && (
        <div style={{ padding: "16px", borderRadius: radius.lg, background: valid ? "rgba(77,200,122,0.06)" : "rgba(224,120,64,0.06)", border: `1px solid ${valid ? "rgba(77,200,122,0.20)" : "rgba(224,120,64,0.20)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: color.text.secondary }}>Duration</span>
            <span style={{ fontSize: "1.125rem", fontWeight: 900, color: durationColor, letterSpacing: "-0.04em" }}>
              {days > 0 ? `${days} days` : "Invalid range"}
            </span>
          </div>
          {!valid && days > 0 && (
            <p style={{ fontSize: "0.5625rem", color: "#E07840", margin: "6px 0 0" }}>
              {days < 3 ? "Minimum 3 days." : "Maximum 30 days."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Prize & Entry ────────────────────────────────────────────────────
const ALL_FEES     = [0, 50, 99, 199, 499, 999, 2499, 4999] as const;
const PUBLIC_FEES  = ALL_FEES.filter(f => f > 0);

function Step5({ form, patch }: { form: FormState; patch: Patcher }) {
  const fees       = form.isPublic ? PUBLIC_FEES : ALL_FEES;
  const totalPool  = form.memberCap * form.entry;
  const winnerPool = Math.round(totalPool * 0.80);
  const creatorFee = form.isPublic ? Math.round(totalPool * 0.10) : 0;
  const platformFee= Math.round(totalPool * 0.10);

  return (
    <div>
      <p style={{ fontSize: "0.8125rem", color: color.text.secondary, marginBottom: 22, lineHeight: 1.6 }}>
        {form.isPublic
          ? "Entry fee required for public challenges. You earn 10% as creator."
          : "Entry fee is optional for private rooms."}
      </p>

      <label style={{ ...typo.label, color: color.text.tertiary, display: "block", marginBottom: 12 }}>Entry Fee per Person</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {fees.map(fee => {
          const active = form.entry === fee;
          return (
            <button
              key={fee}
              onClick={() => patch("entry", fee)}
              style={{ padding: "10px 16px", borderRadius: radius.md, background: active ? "rgba(201,168,76,0.10)" : color.bg.surface, border: active ? `1px solid ${color.gold.border}` : `1px solid ${color.border.faint}`, cursor: "pointer", transition: `all ${motion.fast}` }}
            >
              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: active ? color.gold.base : color.text.secondary }}>
                {fee === 0 ? "Free" : `₹${fee}`}
              </span>
            </button>
          );
        })}
      </div>

      {form.entry > 0 ? (
        <div style={{ padding: "16px", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${color.border.faint}` }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: color.text.primary, margin: "0 0 14px" }}>Pool Breakdown</p>
          {[
            { label: "Total Pool",    value: fmt(totalPool),    accent: color.text.primary },
            { label: "Winners (80%)", value: fmt(winnerPool),   accent: "#4DC87A"          },
            ...(form.isPublic ? [{ label: "You (10%)", value: fmt(creatorFee), accent: color.gold.base }] : []),
            { label: "ELVN (10%)",    value: fmt(platformFee),  accent: color.text.muted   },
          ].map((r, i, arr) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < arr.length - 1 ? `1px solid ${color.border.faint}` : "none" }}>
              <span style={{ fontSize: "0.75rem", color: color.text.tertiary }}>{r.label}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: r.accent }}>{r.value}</span>
            </div>
          ))}
          <p style={{ fontSize: "0.4375rem", color: color.text.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
            Based on {form.memberCap} members × ₹{form.entry}
          </p>
        </div>
      ) : (
        <div style={{ padding: "14px 16px", borderRadius: radius.lg, background: "rgba(96,152,216,0.06)", border: "1px solid rgba(96,152,216,0.16)" }}>
          <p style={{ fontSize: "0.75rem", color: "#6098D8", margin: 0 }}>
            Free challenge — no prize pool. Accountability only.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 6: Review ───────────────────────────────────────────────────────────
function Step6({ form }: { form: FormState }) {
  const totalPool = form.memberCap * form.entry;
  const prize     = Math.round(totalPool * 0.80);

  const rows = [
    { label: "Type",       value: form.isPublic ? "Public" : "Private"                                   },
    { label: "Room Size",  value: `${form.memberCap} members`                                             },
    { label: "Title",      value: form.title || "—"                                                       },
    { label: "Category",   value: form.category.charAt(0).toUpperCase() + form.category.slice(1)          },
    { label: "Step Goal",  value: form.stepGoal >= 1000 ? `${form.stepGoal / 1000}K/day` : `${form.stepGoal}/day` },
    { label: "Proof",      value: form.proofType                                                          },
    { label: "Duration",   value: `${form.duration} days`                                                 },
    { label: "Entry",      value: form.entry === 0 ? "Free" : `₹${form.entry}`                            },
    { label: "Prize Pool", value: form.entry > 0 ? fmt(prize) : "None"                                   },
  ];

  return (
    <div>
      <p style={{ fontSize: "0.8125rem", color: color.text.secondary, marginBottom: 20, lineHeight: 1.6 }}>
        Review your challenge before going live. You&apos;ll be auto-joined as participant 1.
      </p>

      <div style={{ borderRadius: radius.xl, background: color.bg.surface, border: `1px solid ${color.border.faint}`, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${color.border.faint}` : "none" }}>
            <span style={{ fontSize: "0.75rem", color: color.text.tertiary }}>{r.label}</span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: color.text.primary }}>{r.value}</span>
          </div>
        ))}
      </div>

      {form.entry > 0 && (
        <p style={{ fontSize: "0.5625rem", color: color.text.muted, marginTop: 14, lineHeight: 1.6, textAlign: "center" }}>
          ₹{form.entry} will be deducted from your wallet on creation.
        </p>
      )}
    </div>
  );
}
