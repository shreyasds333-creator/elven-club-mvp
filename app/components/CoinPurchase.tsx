"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authStore";
import { useAppStore } from "@/lib/appStore";
import { color, radius } from "@/lib/tokens";

const UPI_ID = "elvnclub@ybl"; // ← replace with your actual merchant UPI ID

const PACKS = [
  { id: "starter",  coins: 500,  price: 500,  paise: 50000,  label: "Starter",  badge: null,         accent: "#6098D8", sub: "Perfect to join your first challenge" },
  { id: "popular",  coins: 1200, price: 999,  paise: 99900,  label: "Popular",  badge: "BEST VALUE", accent: "#4DC87A", sub: "Most members pick this one" },
  { id: "pro",      coins: 3000, price: 2499, paise: 249900, label: "Pro",      badge: "17% OFF",    accent: "#E2BE74", sub: "Serious competitors" },
  { id: "elite",    coins: 7000, price: 4999, paise: 499900, label: "Elite",    badge: "28% OFF",    accent: "#8B8BDE", sub: "Unlock the highest-stake rooms" },
] as const;

type Pack = typeof PACKS[number];
type Step = "select" | "waiting" | "credited";

interface Props {
  onClose: () => void;
}

export default function CoinPurchase({ onClose }: Props) {
  const { user }    = useAuth();
  const { addCoins } = useAppStore();

  // ── All state before returns ────────────────────────────────────────────────
  const [step,    setStep]    = useState<Step>("select");
  const [pack,    setPack]    = useState<Pack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function handleSelectPack(p: Pack) {
    setPack(p);
    setError("");

    const note    = encodeURIComponent(`ELVN ${p.coins} Coins`);
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=ELVN+Club&am=${p.price}&cu=INR&tn=${note}`;
    window.location.href = upiLink;

    // Show "did you pay?" after a short delay (user returns from UPI app)
    setTimeout(() => setStep("waiting"), 1200);
  }

  async function handleConfirmPaid() {
    if (!pack || !user?.id) return;
    setLoading(true);
    setError("");

    const upiRef = `ELVN-${Date.now()}`;

    try {
      const { error: dbErr } = await supabase.from("coin_purchases").insert({
        user_id:      user.id,
        pack_id:      pack.id,
        coins:        pack.coins,
        amount_paise: pack.paise,
        upi_ref:      upiRef,
        status:       "pending",
      });
      if (dbErr) throw new Error(dbErr.message);

      // Credit coins optimistically
      addCoins(pack.coins, `Bought ${pack.coins.toLocaleString("en-IN")} coins`, "Bonus", "💰");
      setStep("credited");
    } catch {
      setError("Something went wrong. Please contact support if coins weren't added.");
      setLoading(false);
    }
  }

  function handleClose() {
    if (step === "credited") return; // auto-closes via timeout below
    onClose();
  }

  // Auto-close after credited
  if (step === "credited") {
    setTimeout(onClose, 2200);
  }

  // ── Credited screen ────────────────────────────────────────────────────────
  if (step === "credited") {
    return (
      <Backdrop onClose={() => {}}>
        <Sheet>
          <div style={{ padding: "40px 24px 48px", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 18 }}>✅</div>
            <h3 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 10px" }}>
              Coins Added!
            </h3>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.48)", margin: 0 }}>
              ⟡ {pack?.coins.toLocaleString("en-IN")} coins added to your vault
            </p>
          </div>
        </Sheet>
      </Backdrop>
    );
  }

  // ── Waiting / did you pay? screen ─────────────────────────────────────────
  if (step === "waiting") {
    return (
      <Backdrop onClose={handleClose}>
        <Sheet>
          <Handle />
          <CloseBtn onClick={handleClose} />

          <div style={{ padding: "8px 24px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📲</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 10px" }}>
              Complete in UPI app
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.42)", margin: "0 0 8px", lineHeight: 1.55 }}>
              Pay ₹{pack?.price.toLocaleString("en-IN")} for {pack?.coins.toLocaleString("en-IN")} coins<br />
              via PhonePe, GPay, or any UPI app.
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(201,168,76,0.68)", fontWeight: 600, margin: "0 0 32px" }}>
              UPI: {UPI_ID}
            </p>

            {error && (
              <p style={{ fontSize: "0.75rem", color: "rgba(255,80,80,0.80)", margin: "0 0 16px", lineHeight: 1.4 }}>{error}</p>
            )}

            <button
              onClick={handleConfirmPaid}
              disabled={loading}
              style={{ width: "100%", padding: "19px", borderRadius: 14, border: "none", background: loading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#E2BE74 0%,#C9A84C 100%)", fontSize: "0.9375rem", fontWeight: 800, color: loading ? "rgba(255,255,255,0.30)" : "#000", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 24px rgba(201,168,76,0.38)", marginBottom: 14, transition: "background 0.2s ease, color 0.2s ease" }}
            >
              {loading ? "Processing…" : "✓ I've Paid — Add Coins"}
            </button>

            <button
              onClick={() => { setPack(null); setStep("select"); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", fontSize: "0.8125rem", cursor: "pointer" }}
            >
              ← Choose different pack
            </button>
          </div>
        </Sheet>
      </Backdrop>
    );
  }

  // ── Select pack screen ─────────────────────────────────────────────────────
  return (
    <Backdrop onClose={onClose}>
      <Sheet>
        <Handle />
        <CloseBtn onClick={onClose} />

        <div style={{ padding: "8px 20px 40px" }}>
          <div style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 5px" }}>
              Buy Coins
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.36)", margin: 0 }}>
              Pay via PhonePe, GPay, or any UPI app
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {PACKS.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPack(p)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 18px", borderRadius: 14, border: `1px solid rgba(${hexToRgb(p.accent)},0.22)`,
                  background: `rgba(${hexToRgb(p.accent)},0.07)`, cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `rgba(${hexToRgb(p.accent)},0.14)`, border: `1px solid rgba(${hexToRgb(p.accent)},0.30)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "1.125rem", color: p.accent }}>⟡</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                      {p.coins.toLocaleString("en-IN")} coins
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.36)", marginTop: 3 }}>
                      {p.sub}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                  {p.badge && (
                    <span style={{ fontSize: "0.4375rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: p.accent, background: `rgba(${hexToRgb(p.accent)},0.14)`, border: `1px solid rgba(${hexToRgb(p.accent)},0.28)`, padding: "2px 7px", borderRadius: 99 }}>
                      {p.badge}
                    </span>
                  )}
                  <span style={{ fontSize: "1.0625rem", fontWeight: 800, color: p.accent, letterSpacing: "-0.03em" }}>
                    ₹{p.price.toLocaleString("en-IN")}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <span style={{ fontSize: "1rem" }}>🔒</span>
            <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.22)" }}>
              Secure UPI payment · Coins credited instantly
            </span>
          </div>
        </div>
      </Sheet>
    </Backdrop>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#0A0A0E", borderRadius: "22px 22px 0 0", borderTop: "1px solid rgba(255,255,255,0.09)", animation: "cpSlideUp 0.32s cubic-bezier(.175,.885,.32,1.275) both" }}>
      {children}
      <style>{`@keyframes cpSlideUp { 0% { opacity:0; transform:translateY(100%); } 100% { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

function Handle() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 4 }}>
      <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ position: "absolute", top: 14, right: 18, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
    >
      <X size={14} color="rgba(255,255,255,0.55)" />
    </button>
  );
}

// Keep color/radius imports happy
void color;
void radius;
