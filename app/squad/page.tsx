"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, LogOut } from "lucide-react";
import { color, radius, space, typo } from "@/lib/tokens";
import { useSquad } from "@/lib/useSquad";

// ─── Avatar backgrounds (cycle through for members) ──────────────────────────
const AVATAR_BG = [
  "linear-gradient(135deg,#7A4A18,#3A2008)",
  "linear-gradient(135deg,#145C38,#062010)",
  "linear-gradient(135deg,#1A3A6A,#081528)",
  "linear-gradient(135deg,#4A306A,#1C0E28)",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SquadPage() {
  const router = useRouter();
  const { squad, members, loading, createSquad, joinSquad, leaveSquad } = useSquad();

  const [view,        setView]        = useState<"home" | "create" | "join">("home");
  const [squadName,   setSquadName]   = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [leaving,     setLeaving]     = useState(false);

  async function handleCreate() {
    if (!squadName.trim()) { setFormError("Enter a squad name"); return; }
    setSubmitting(true);
    setFormError(null);
    const { error } = await createSquad(squadName);
    setSubmitting(false);
    if (error) { setFormError(error); return; }
    setView("home");
  }

  async function handleJoin() {
    if (inviteInput.trim().length !== 6) { setFormError("Invite code is 6 characters"); return; }
    setSubmitting(true);
    setFormError(null);
    const { error } = await joinSquad(inviteInput);
    setSubmitting(false);
    if (error) { setFormError(error); return; }
    setView("home");
  }

  async function handleLeave() {
    setLeaving(true);
    await leaveSquad();
    setLeaving(false);
  }

  function copyCode() {
    if (!squad) return;
    navigator.clipboard.writeText(squad.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: color.bg.base, minHeight: "100%", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: `16px ${space.screenX}px 14px`,
        borderBottom: `1px solid ${color.border.faint}`,
      }}>
        <button onClick={() => view !== "home" ? (setView("home"), setFormError(null)) : router.back()}
          style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={22} style={{ color: color.text.secondary }} />
        </button>
        <span style={{ fontSize: "1rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.02em" }}>
          {view === "create" ? "Create Squad" : view === "join" ? "Join Squad" : "My Squad"}
        </span>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${color.gold.base}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

      ) : squad && view === "home" ? (
        // ── Has a squad ──────────────────────────────────────────────────────
        <div style={{ padding: `24px ${space.screenX}px 0` }}>

          {/* Squad name + invite code card */}
          <div style={{
            borderRadius: radius.lg,
            background: "radial-gradient(ellipse at 20% 20%, rgba(96,152,216,0.14) 0%, transparent 60%), #0A0A14",
            border: "1px solid rgba(96,152,216,0.22)",
            padding: "20px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: radius.sm, background: "rgba(96,152,216,0.10)", border: "1px solid rgba(96,152,216,0.24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                👥
              </div>
              <div>
                <div style={{ fontSize: "1.0625rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{squad.name}</div>
                <div style={{ fontSize: "0.5625rem", color: "rgba(96,152,216,0.70)", marginTop: 2 }}>{members.length}/{squad.maxMembers} members</div>
              </div>
            </div>

            {/* Invite code */}
            <div style={{ borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 14 }}>
              <div style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: color.text.muted, marginBottom: 7 }}>
                Invite Code
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  flex: 1, fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 900,
                  letterSpacing: "0.22em", color: color.gold.bright,
                  background: "rgba(226,190,116,0.06)", border: "1px solid rgba(226,190,116,0.16)",
                  borderRadius: radius.md, padding: "10px 14px",
                  textShadow: "0 0 20px rgba(226,190,116,0.40)",
                }}>
                  {squad.inviteCode}
                </div>
                <button onClick={copyCode} style={{
                  width: 44, height: 44, borderRadius: radius.md, flexShrink: 0,
                  background: copied ? "rgba(77,200,122,0.12)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${copied ? "rgba(77,200,122,0.30)" : "rgba(255,255,255,0.10)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s ease",
                }}>
                  {copied
                    ? <Check size={16} style={{ color: "#4DC87A" }} />
                    : <Copy size={16} style={{ color: color.text.secondary }} />}
                </button>
              </div>
              <div style={{ fontSize: "0.5rem", color: color.text.muted, marginTop: 7 }}>
                Share this code — squad mates enter it in "Join Squad"
              </div>
            </div>
          </div>

          {/* Members list */}
          <div style={{ ...typo.label, color: color.text.tertiary, marginBottom: 10 }}>Members</div>
          <div style={{ borderRadius: radius.lg, background: color.bg.card, border: `1px solid ${color.border.subtle}`, overflow: "hidden" }}>
            {members.map((m, i) => (
              <div key={m.userId} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 16px",
                borderBottom: i < members.length - 1 ? `1px solid ${color.border.faint}` : "none",
                background: m.isYou ? "rgba(201,168,76,0.04)" : "transparent",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: AVATAR_BG[i % AVATAR_BG.length],
                  border: m.isYou ? "1.5px solid rgba(201,168,76,0.40)" : "1.5px solid rgba(255,255,255,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.5rem", fontWeight: 800, color: "#fff",
                  boxShadow: m.isYou ? "0 0 10px rgba(201,168,76,0.18)" : "none",
                }}>
                  {m.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: m.isYou ? 800 : 600, color: m.isYou ? color.text.primary : color.text.secondary }}>
                    {m.name}
                  </span>
                  {m.isYou && (
                    <span style={{ marginLeft: 7, fontSize: "0.4375rem", fontWeight: 700, color: color.gold.base, background: "rgba(226,190,116,0.08)", border: "1px solid rgba(226,190,116,0.16)", padding: "1px 5px", borderRadius: radius.full, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      You
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Leave squad */}
          <button
            onClick={handleLeave}
            disabled={leaving}
            style={{
              width: "100%", marginTop: 24, padding: "13px",
              borderRadius: radius.lg,
              background: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,60,60,0.18)",
              color: leaving ? "rgba(255,80,80,0.40)" : "rgba(255,80,80,0.80)",
              fontSize: "0.875rem", fontWeight: 700, cursor: leaving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <LogOut size={14} />
            {leaving ? "Leaving…" : "Leave Squad"}
          </button>
        </div>

      ) : !squad && view === "home" ? (
        // ── No squad ─────────────────────────────────────────────────────────
        <div style={{ padding: `24px ${space.screenX}px 0` }}>
          <p style={{ fontSize: "0.8125rem", color: color.text.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
            Squads are groups of up to 4. Members can see each other's daily proof status on any shared challenge — no chat, just accountability.
          </p>

          <button
            onClick={() => { setView("create"); setFormError(null); setSquadName(""); }}
            style={{
              width: "100%", padding: "17px", borderRadius: radius.lg,
              background: "linear-gradient(135deg,#1A2A4A 0%,#0A1428 100%)",
              border: "1px solid rgba(96,152,216,0.30)",
              display: "flex", alignItems: "center", gap: 14,
              cursor: "pointer", textAlign: "left", marginBottom: 12,
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: radius.sm, background: "rgba(96,152,216,0.10)", border: "1px solid rgba(96,152,216,0.24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              ✦
            </div>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#6098D8", letterSpacing: "-0.01em", marginBottom: 3 }}>Create a Squad</div>
              <div style={{ fontSize: "0.6875rem", color: color.text.muted }}>Name it, get a 6-character code, invite up to 3 others</div>
            </div>
          </button>

          <button
            onClick={() => { setView("join"); setFormError(null); setInviteInput(""); }}
            style={{
              width: "100%", padding: "17px", borderRadius: radius.lg,
              background: color.bg.card,
              border: `1px solid ${color.border.subtle}`,
              display: "flex", alignItems: "center", gap: 14,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: radius.sm, background: "rgba(255,255,255,0.04)", border: `1px solid ${color.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              🔑
            </div>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.01em", marginBottom: 3 }}>Join a Squad</div>
              <div style={{ fontSize: "0.6875rem", color: color.text.muted }}>Enter the 6-character invite code from your squad</div>
            </div>
          </button>
        </div>

      ) : view === "create" ? (
        // ── Create form ──────────────────────────────────────────────────────
        <div style={{ padding: `28px ${space.screenX}px 0` }}>
          <p style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: color.text.muted, margin: "0 0 8px" }}>
            Squad Name
          </p>
          <input
            value={squadName}
            onChange={e => setSquadName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            maxLength={32}
            placeholder="e.g. Morning Grinders"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "14px 16px", borderRadius: radius.lg,
              background: color.bg.surface, border: `1px solid ${formError ? "rgba(255,80,80,0.44)" : color.border.default}`,
              color: color.text.primary, fontSize: "1rem", fontWeight: 600,
              outline: "none", transition: "border-color 0.2s",
            }}
          />
          {formError && <p style={{ fontSize: "0.75rem", color: "rgba(255,80,80,0.80)", margin: "8px 0 0" }}>{formError}</p>}

          <div style={{ fontSize: "0.5625rem", color: color.text.muted, margin: "10px 0 24px" }}>
            A 6-character invite code is generated automatically. Share it with up to 3 people.
          </div>

          <button
            onClick={handleCreate}
            disabled={submitting || !squadName.trim()}
            style={{
              width: "100%", padding: "15px", borderRadius: radius.lg,
              background: submitting || !squadName.trim()
                ? "rgba(96,152,216,0.08)"
                : "linear-gradient(135deg,#4A7ED4 0%,#2A5EA4 100%)",
              border: submitting || !squadName.trim()
                ? "1px solid rgba(96,152,216,0.18)"
                : "none",
              color: submitting || !squadName.trim() ? "rgba(96,152,216,0.40)" : "#fff",
              fontSize: "0.9375rem", fontWeight: 800,
              cursor: submitting || !squadName.trim() ? "not-allowed" : "pointer",
              letterSpacing: "0.03em",
            }}
          >
            {submitting ? "Creating…" : "Create Squad"}
          </button>
        </div>

      ) : view === "join" ? (
        // ── Join form ────────────────────────────────────────────────────────
        <div style={{ padding: `28px ${space.screenX}px 0` }}>
          <p style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: color.text.muted, margin: "0 0 8px" }}>
            Invite Code
          </p>
          <input
            value={inviteInput}
            onChange={e => setInviteInput(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            maxLength={6}
            placeholder="ABC123"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "16px", borderRadius: radius.lg,
              background: color.bg.surface, border: `1px solid ${formError ? "rgba(255,80,80,0.44)" : color.border.default}`,
              color: color.gold.bright, fontSize: "1.5rem", fontWeight: 900,
              fontFamily: "monospace", letterSpacing: "0.22em", textAlign: "center",
              outline: "none", transition: "border-color 0.2s",
            }}
          />
          {formError && <p style={{ fontSize: "0.75rem", color: "rgba(255,80,80,0.80)", margin: "8px 0 0", textAlign: "center" }}>{formError}</p>}

          <div style={{ fontSize: "0.5625rem", color: color.text.muted, margin: "10px 0 24px", textAlign: "center" }}>
            Ask a squad member for their 6-character code.
          </div>

          <button
            onClick={handleJoin}
            disabled={submitting || inviteInput.length !== 6}
            style={{
              width: "100%", padding: "15px", borderRadius: radius.lg,
              background: submitting || inviteInput.length !== 6
                ? "rgba(201,168,76,0.06)"
                : "linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)",
              border: submitting || inviteInput.length !== 6
                ? "1px solid rgba(201,168,76,0.16)"
                : "none",
              color: submitting || inviteInput.length !== 6 ? "rgba(201,168,76,0.35)" : "#000",
              fontSize: "0.9375rem", fontWeight: 900,
              cursor: submitting || inviteInput.length !== 6 ? "not-allowed" : "pointer",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            {submitting ? "Joining…" : "Join Squad"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
