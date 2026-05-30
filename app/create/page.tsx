"use client";

import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Users, Trophy, TrendingUp } from "lucide-react";
import { color, radius, typo, space } from "@/lib/tokens";
import { fmt, rgb } from "@/lib/challengeData";
import { useAppStore } from "@/lib/appStore";

export default function CreatePage() {
  const router = useRouter();
  const { createdChallenges } = useAppStore();
  const hasCreated = createdChallenges.length > 0;

  const totalParticipants = createdChallenges.reduce((a, c) => a + c.participants, 0);
  const creatorEarnings   = Math.round(
    createdChallenges.reduce((a, c) => a + (c.isPublic ? c.entry * c.participants * 0.10 : 0), 0)
  );

  return (
    <div className="main-content no-scrollbar" style={{ background: color.bg.base, overflowY: "auto" }}>

      {/* ── Header ── */}
      <div
        style={{
          padding: `20px ${space.screenX}px 24px`,
          background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 65%), #000",
          borderBottom: `1px solid ${color.border.faint}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ ...typo.label, color: color.text.tertiary, marginBottom: 6 }}>Creator Studio</p>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em", color: color.text.primary, lineHeight: 1, margin: 0 }}>
              Create
            </h1>
            <p style={{ fontSize: "0.8125rem", color: color.text.secondary, marginTop: 4, fontWeight: 500, margin: "4px 0 0" }}>
              Host your own accountability room
            </p>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: radius.lg, background: "rgba(201,168,76,0.10)", border: `1px solid ${color.gold.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>
            ⚡
          </div>
        </div>

        {/* Creator stats — visible once a challenge is created */}
        {hasCreated && (
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {[
              { label: "Challenges",   value: String(createdChallenges.length), icon: <Trophy   size={12} style={{ color: color.gold.base }} /> },
              { label: "Participants", value: String(totalParticipants),         icon: <Users    size={12} style={{ color: "#4DC87A"      }} /> },
              { label: "Earned",       value: fmt(creatorEarnings),              icon: <TrendingUp size={12} style={{ color: "#8B8BDE"   }} /> },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "12px 10px", borderRadius: radius.md, background: color.bg.surface, border: `1px solid ${color.border.faint}`, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 5 }}>
                  {s.icon}
                  <span style={{ ...typo.label, color: color.text.muted, fontSize: "0.4375rem" }}>{s.label}</span>
                </div>
                <p style={{ fontSize: "1rem", fontWeight: 800, color: color.text.primary, letterSpacing: "-0.04em", margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: `24px ${space.screenX}px 100px` }}>

        {/* How it works — shown before first challenge */}
        {!hasCreated && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ ...typo.label, color: color.text.tertiary, marginBottom: 14 }}>How It Works</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { emoji: "🏛️", title: "Host a room",     desc: "Set the rules, stakes, and size. Public or invite-only."  },
                { emoji: "💰", title: "Earn as creator",  desc: "Public challenges: earn 10% of the total prize pool."      },
                { emoji: "👑", title: "Build reputation", desc: "Top creators get featured. Build your athlete community."  },
              ].map(b => (
                <div key={b.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${color.border.faint}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: radius.md, background: "rgba(201,168,76,0.08)", border: `1px solid ${color.gold.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem", flexShrink: 0 }}>
                    {b.emoji}
                  </div>
                  <div>
                    <p style={{ fontSize: "0.875rem", fontWeight: 700, color: color.text.primary, margin: "0 0 2px" }}>{b.title}</p>
                    <p style={{ fontSize: "0.6875rem", color: color.text.secondary, margin: 0, lineHeight: 1.45 }}>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Created challenges list */}
        {hasCreated && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ ...typo.label, color: color.text.tertiary, marginBottom: 14 }}>Your Challenges</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {createdChallenges.map(c => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/challenges/${c.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: radius.lg, background: color.bg.surface, border: `1px solid ${color.border.faint}`, textAlign: "left", cursor: "pointer", width: "100%" }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: radius.md, background: `rgba(${rgb(c.accentColor)},0.10)`, border: `1px solid rgba(${rgb(c.accentColor)},0.18)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem", flexShrink: 0 }}>
                    {c.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 700, color: color.text.primary, margin: "0 0 3px", letterSpacing: "-0.01em" }}>{c.title}</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>{c.participants}/{c.maxParticipants} members</span>
                      <span style={{ fontSize: "0.5625rem", color: c.isPublic ? "#4DC87A" : "#6098D8", fontWeight: 600 }}>
                        {c.isPublic ? "Public" : "Private"}
                      </span>
                      {!c.isPublic && c.inviteCode && (
                        <span style={{ fontSize: "0.5625rem", color: color.text.muted, fontFamily: "monospace" }}>#{c.inviteCode}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: color.text.muted, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => router.push("/create/new")}
          style={{
            width: "100%", padding: "17px 24px", borderRadius: 14,
            background: "linear-gradient(135deg,#C9A84C,#A07828)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            cursor: "pointer",
            boxShadow: "0 0 32px rgba(201,168,76,0.32), 0 4px 20px rgba(0,0,0,0.70)",
          }}
        >
          <Plus size={18} style={{ color: "#000" }} />
          <span style={{ fontSize: "0.9375rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#000" }}>
            {hasCreated ? "Create New Challenge" : "Create Your First Challenge"}
          </span>
        </button>

        <p style={{ fontSize: "0.5625rem", color: color.text.muted, textAlign: "center", marginTop: 12, lineHeight: 1.7 }}>
          Public: 80% → winners · 10% → you · 10% → ELVN{"\n"}
          Private: 90% → winners · 10% → ELVN · Free allowed
        </p>
      </div>

    </div>
  );
}
