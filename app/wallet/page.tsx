"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Settings, Gift, Clock, TrendingUp, ChevronRight, ChevronDown, X, Zap } from "lucide-react";
import { color, radius, typo, space, motion } from "@/lib/tokens";
import { fmtCoins, rgb } from "@/lib/challengeData";
import { useAppStore, todayStr, type Transaction } from "@/lib/appStore";

// ─── Types ────────────────────────────────────────────────────────────────────
type RewardStatus = "UNLOCKED" | "ELITE ACCESS" | "STREAK EXCLUSIVE" | "LIMITED" | "NEW";

interface Reward {
  id:            number;
  brand:         string;
  emoji:         string;
  offer:         string;     // "1 Month Membership", "Whey Protein 1KG"
  desc:          string;
  status:        RewardStatus;
  statusColor:   string;
  bg:            string;
  accent:        string;
  expires:       string;
  coinsRequired: number;
  requirement?:  string;
  limitedCount?: number;
  isNew?:        boolean;
  category:      string;
}

interface CoinEvent {
  id:       number;
  desc:     string;
  coins:    number;
  isDebit:  boolean;
  emoji:    string;
  category: "Win" | "Streak" | "Proof" | "Entry" | "Bonus";
}

interface CoinGroup { date: string; items: CoinEvent[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function coinColor(ev: CoinEvent): string {
  if (ev.isDebit)            return "rgba(255,255,255,0.28)";
  if (ev.category === "Win") return "#4DC87A";
  return color.gold.base;
}

function groupTotal(items: CoinEvent[]): number {
  return items.reduce((s, ev) => ev.isDebit ? s - ev.coins : s + ev.coins, 0);
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const DISC_SCORE = 87;
const TIER_GOAL  = 50000;   // coins needed to reach Platinum tier

const BAR_H = 36;
const DAY_LABELS = ["S","M","T","W","T","F","S"] as const;

function buildWeeklyCoins(txns: Transaction[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const offset  = 6 - i;
    const date    = new Date(Date.now() - offset * 86_400_000);
    const dateStr = date.toISOString().slice(0, 10);
    const coins   = txns
      .filter(t => !t.isDebit && new Date(t.timestamp).toISOString().slice(0, 10) === dateStr)
      .reduce((s, t) => s + t.coins, 0);
    return { day: DAY_LABELS[date.getDay()], coins, isToday: offset === 0 };
  });
}

const REWARDS: Reward[] = [
  {
    id: 1, brand: "Cult.fit", emoji: "🏋️",
    offer: "1 Month Free",
    desc: "Full premium membership · All locations across India",
    status: "UNLOCKED", statusColor: "#4DC87A",
    coinsRequired: 20000,
    expires: "Jun 30", category: "fitness",
    accent: "#8B8BDE",
    bg: "radial-gradient(ellipse at 18% 22%, rgba(99,102,241,0.28) 0%, transparent 60%), linear-gradient(155deg,#07070F 0%,#040408 100%)",
  },
  {
    id: 2, brand: "MuscleBlaze", emoji: "💊",
    offer: "Whey Protein 1KG",
    desc: "Advanced whey · 25g protein per serving",
    status: "STREAK EXCLUSIVE", statusColor: "#E07840",
    coinsRequired: 15000,
    expires: "Jul 15", requirement: "🔥 10+ day streak", category: "supplements",
    accent: "#E07840",
    bg: "radial-gradient(ellipse at 18% 22%, rgba(224,120,64,0.24) 0%, transparent 60%), linear-gradient(155deg,#0C0704 0%,#060302 100%)",
  },
  {
    id: 3, brand: "Decathlon", emoji: "🏅",
    offer: "Equipment Voucher",
    desc: "Sports gear, apparel & accessories",
    status: "UNLOCKED", statusColor: "#6098D8",
    coinsRequired: 8000,
    expires: "Jun 28", category: "gear",
    accent: "#6098D8",
    bg: "radial-gradient(ellipse at 18% 22%, rgba(37,99,235,0.24) 0%, transparent 60%), linear-gradient(155deg,#050810 0%,#030406 100%)",
  },
  {
    id: 4, brand: "Nykaa Fashion", emoji: "👕",
    offer: "Activewear Set",
    desc: "Premium fitness activewear for workouts",
    status: "LIMITED", statusColor: "#E2BE74",
    coinsRequired: 12000, limitedCount: 3,
    expires: "Jul 31", category: "fashion",
    accent: "#C9A84C",
    bg: "radial-gradient(ellipse at 18% 22%, rgba(201,168,76,0.22) 0%, transparent 60%), linear-gradient(155deg,#0D0A04 0%,#080600 100%)",
  },
  {
    id: 5, brand: "The Whole Truth", emoji: "🧃",
    offer: "Protein Bar 12-Pack",
    desc: "Clean label · no hidden sugar · high protein",
    status: "NEW", statusColor: "#4DC87A",
    coinsRequired: 6000,
    expires: "Open", category: "nutrition", isNew: true,
    accent: "#4DC87A",
    bg: "radial-gradient(ellipse at 18% 22%, rgba(77,200,122,0.20) 0%, transparent 60%), linear-gradient(155deg,#050E09 0%,#020704 100%)",
  },
  {
    id: 6, brand: "WHOOP", emoji: "⌚",
    offer: "3-Month Membership",
    desc: "Advanced fitness tracker & recovery monitoring",
    status: "ELITE ACCESS", statusColor: "#8B8BDE",
    coinsRequired: 50000,
    expires: "Open", category: "tech",
    accent: "#8B8BDE",
    bg: "radial-gradient(ellipse at 18% 22%, rgba(139,139,222,0.24) 0%, transparent 60%), linear-gradient(155deg,#07070F 0%,#040408 100%)",
  },
];

// ─── Coin purchase packages ───────────────────────────────────────────────────
const COIN_PKGS = [
  { id: 1, coins: 100,  price: 10,  label: "Starter",  badge: null,       accent: "#6098D8" },
  { id: 2, coins: 500,  price: 45,  label: "Popular",  badge: "BEST VALUE", accent: "#4DC87A" },
  { id: 3, coins: 1000, price: 80,  label: "Pro",      badge: "20% OFF",  accent: "#E2BE74" },
  { id: 4, coins: 5000, price: 350, label: "Elite",    badge: "30% OFF",  accent: "#8B8BDE" },
] as const;

const UPI_ID = "elvnclub@ybl"; // ← replace with your actual UPI ID

function buildCoinGroups(txns: Transaction[]): CoinGroup[] {
  if (!txns.length) return [];
  const t = todayStr();
  const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const map = new Map<string, CoinEvent[]>();
  for (const tx of txns) {
    const date = new Date(tx.timestamp).toISOString().slice(0, 10);
    const label = date === t ? "Today" : date === y ? "Yesterday" :
      new Date(tx.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const ev: CoinEvent = {
      id: tx.timestamp,
      desc: tx.label,
      coins: tx.coins,
      isDebit: tx.isDebit,
      emoji: tx.emoji,
      category: tx.category,
    };
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(ev);
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }));
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { coins: COINS, streak, transactions } = useAppStore();
  const coinGroups  = buildCoinGroups(transactions);
  const weeklyCoins = buildWeeklyCoins(transactions);
  const wMax        = Math.max(...weeklyCoins.map(w => w.coins), 1);
  const weekTotal   = weeklyCoins.reduce((s, d) => s + d.coins, 0);
  const router = useRouter();

  const [vaultExpanded, setVaultExpanded] = useState(false);
  const [activeReward,  setActiveReward]  = useState<Reward | null>(null);
  const [buySheet,      setBuySheet]      = useState(false);
  const [buyPkg,        setBuyPkg]        = useState<(typeof COIN_PKGS)[number] | null>(null);
  const [payState,      setPayState]      = useState<"idle" | "waiting" | "credited">("idle");
  const { addCoins } = useAppStore();

  const rewardsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const TIER_PCT = Math.min(Math.round((COINS / TIER_GOAL) * 100), 100);

  const ACTIONS = [
    {
      id: "buy",     label: "Buy Coins",  sub: "UPI · instant",
      clr: "#4DC87A", bg: "rgba(77,200,122,0.08)", border: "rgba(77,200,122,0.20)",
      Icon: TrendingUp,
      handler: () => setBuySheet(true),
    },
    {
      id: "redeem",  label: "Redeem",     sub: `${fmtCoins(COINS)} available`,
      clr: color.gold.base, bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.20)",
      Icon: Gift,
      handler: () => rewardsRef.current?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      id: "earn",    label: "Earn More",  sub: "Daily proofs",
      clr: "#8B8BDE", bg: "rgba(139,139,222,0.08)", border: "rgba(139,139,222,0.20)",
      Icon: Zap,
      handler: () => router.push("/challenges"),
    },
    {
      id: "history", label: "History",    sub: `${coinGroups.reduce((s,g)=>s+g.items.length,0)} entries`,
      clr: "#6098D8", bg: "rgba(96,152,216,0.08)", border: "rgba(96,152,216,0.20)",
      Icon: Clock,
      handler: () => historyRef.current?.scrollIntoView({ behavior: "smooth" }),
    },
  ];

  function handleBuy(pkg: (typeof COIN_PKGS)[number]) {
    setBuyPkg(pkg);
    setPayState("waiting");
    const note = encodeURIComponent(`ELVN ${pkg.coins} Coins`);
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=ELVN+Club&am=${pkg.price}&tn=${note}&cu=INR`;
    window.location.href = upiLink;
  }

  async function handlePaidConfirm() {
    if (!buyPkg) return;
    // Optimistic local update
    addCoins(buyPkg.coins, `Bought ${buyPkg.coins} coins via UPI`, "Bonus", "💰");
    setPayState("credited");

    // Persist to Supabase in background
    try {
      const { data: { session } } = await (await import("@/lib/supabaseClient")).supabase.auth.getSession();
      if (session?.user?.id) {
        fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id, coins: buyPkg.coins }),
        }).catch(() => {});
      }
    } catch { /* fire and forget */ }

    setTimeout(() => {
      setPayState("idle");
      setBuyPkg(null);
      setBuySheet(false);
    }, 2200);
  }

  return (
    <>
      <div className="main-content no-scrollbar" style={{ background: color.bg.base, overflowY: "auto" }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ padding: `22px ${space.screenX}px 0`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.045em", margin: 0, color: color.text.primary, lineHeight: 1 }}>
              Vault
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: radius.full, background: "rgba(201,168,76,0.09)", border: `1px solid ${color.gold.border}` }}>
              <span style={{ fontSize: 8 }}>🥇</span>
              <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: color.gold.base, letterSpacing: "0.07em", textTransform: "uppercase" }}>Gold</span>
            </div>
          </div>
          <button className="hdr-btn" style={{ width: 36, height: 36, borderRadius: radius.full, background: color.bg.surface, border: `1px solid ${color.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Settings size={14} style={{ color: color.text.secondary }} />
          </button>
        </div>

        {/* ── Reward Vault Card ───────────────────────────────────────────────── */}
        <div style={{ padding: `18px ${space.screenX}px 0` }}>
          <div
            className="vault-card"
            style={{
              position: "relative", borderRadius: radius.xl, overflow: "hidden",
              background: "radial-gradient(ellipse at 14% 18%, rgba(201,168,76,0.22) 0%, transparent 54%), radial-gradient(ellipse at 86% 84%, rgba(96,152,216,0.06) 0%, transparent 50%), linear-gradient(160deg,#09070C 0%,#070508 55%,#050407 100%)",
              border: "1px solid rgba(201,168,76,0.24)",
              padding: "22px 22px 0",
              cursor: "pointer",
            }}
            onClick={() => setVaultExpanded(v => !v)}
          >
            {/* Animated atmosphere */}
            <div style={{ position:"absolute", inset:-28, pointerEvents:"none", zIndex:1, background:"radial-gradient(ellipse at 15% 22%, rgba(201,168,76,0.16) 0%, transparent 54%)", animation:"atmospherePulse 6.5s ease-in-out infinite" }} />
            <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"42%", pointerEvents:"none", zIndex:2, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.024),transparent)", animation:"lightSweep 10s ease-in-out infinite" }} />

            <div style={{ position:"relative", zIndex:10 }}>
              {/* Top row */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <span style={{ fontSize:"0.5rem", fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(201,168,76,0.62)" }}>REWARD VAULT</span>
                <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:radius.full, background:"rgba(77,200,122,0.09)", border:"1px solid rgba(77,200,122,0.18)" }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#4DC87A", animation:"liveDot 1.8s ease-in-out infinite" }} />
                  <span style={{ fontSize:"0.4375rem", fontWeight:700, color:"#4DC87A", letterSpacing:"0.08em", textTransform:"uppercase" }}>Active</span>
                </div>
              </div>

              {/* Balance — coins only, no rupees */}
              <div style={{ marginBottom:3 }}>
                <span style={{ fontSize:"3.75rem", fontWeight:900, letterSpacing:"-0.066em", color:color.gold.bright, lineHeight:0.92, display:"inline-block", animation:"balanceGlow 4.2s ease-in-out infinite" }}>
                  {COINS.toLocaleString("en-IN")}
                </span>
              </div>
              <p style={{ fontSize:"0.5625rem", color:"rgba(255,255,255,0.44)", margin:"0 0 16px", letterSpacing:"0.01em" }}>
                Earned through consistency · redeemable for real rewards
              </p>

              {/* Live strip */}
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:18, padding:"7px 11px", borderRadius:radius.sm, background:"rgba(77,200,122,0.04)", border:"1px solid rgba(77,200,122,0.10)" }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:"#4DC87A", animation:"liveDot 1.8s ease-in-out infinite", flexShrink:0 }} />
                <span style={{ fontSize:"0.5rem", color:"rgba(77,200,122,0.70)", fontWeight:500 }}>
                  +160 pts today · Gold 14 days · Top 12% discipline
                </span>
              </div>

              {/* Stats — discipline metrics, no cash */}
              <div style={{ display:"flex", borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:15 }}>
                {/* This week */}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:"0.4375rem", fontWeight:600, letterSpacing:"0.10em", textTransform:"uppercase", color:"rgba(255,255,255,0.22)", margin:"0 0 5px" }}>This Week</p>
                  <p style={{ fontSize:"1.0625rem", fontWeight:900, color:color.gold.bright, letterSpacing:"-0.04em", margin:"0 0 2px", lineHeight:1 }}>{weekTotal.toLocaleString("en-IN")}</p>
                  <p style={{ fontSize:"0.4375rem", color:"rgba(201,168,76,0.55)", margin:0, fontWeight:500 }}>from proof & wins</p>
                </div>
                <div style={{ width:1, background:"rgba(255,255,255,0.07)", margin:"0 14px" }} />
                {/* Discipline */}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:"0.4375rem", fontWeight:600, letterSpacing:"0.10em", textTransform:"uppercase", color:"rgba(255,255,255,0.22)", margin:"0 0 5px" }}>Discipline</p>
                  <div style={{ display:"flex", alignItems:"baseline", gap:2, marginBottom:2 }}>
                    <p style={{ fontSize:"1.0625rem", fontWeight:800, color:"#4DC87A", letterSpacing:"-0.04em", margin:0, lineHeight:1 }}>{DISC_SCORE}</p>
                    <span style={{ fontSize:"0.375rem", color:"rgba(255,255,255,0.22)", fontWeight:400 }}>/100</span>
                    <TrendingUp size={8} style={{ color:"#4DC87A" }} />
                  </div>
                  <p style={{ fontSize:"0.4375rem", color:"rgba(77,200,122,0.55)", margin:0, fontWeight:500 }}>proof + streaks · top 12%</p>
                </div>
                <div style={{ width:1, background:"rgba(255,255,255,0.07)", margin:"0 14px" }} />
                {/* Streak */}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:"0.4375rem", fontWeight:600, letterSpacing:"0.10em", textTransform:"uppercase", color:"rgba(255,255,255,0.22)", margin:"0 0 5px" }}>Streak</p>
                  <div style={{ display:"flex", alignItems:"baseline", gap:3, marginBottom:2 }}>
                    <p style={{ fontSize:"1.0625rem", fontWeight:800, color:color.gold.bright, letterSpacing:"-0.04em", margin:0, lineHeight:1 }}>{streak}</p>
                    <span style={{ fontSize:"0.375rem", color:"rgba(255,255,255,0.22)" }}>days</span>
                  </div>
                  <p style={{ fontSize:"0.4375rem", color:"rgba(201,168,76,0.55)", margin:0, fontWeight:500 }}>🔥 daily proof</p>
                </div>
              </div>

              {/* Expandable: weekly coins + tier progress */}
              <div style={{
                overflow:"hidden",
                maxHeight: vaultExpanded ? "180px" : "0px",
                opacity: vaultExpanded ? 1 : 0,
                transition: "max-height 0.40s cubic-bezier(.175,.885,.32,1.1), opacity 0.28s ease",
              }}>
                <div style={{ paddingTop:18 }}>
                  <p style={{ fontSize:"0.4375rem", fontWeight:600, letterSpacing:"0.11em", textTransform:"uppercase", color:"rgba(255,255,255,0.18)", margin:"0 0 10px" }}>Coins This Week</p>
                  <div style={{ display:"flex", gap:4, alignItems:"flex-end", paddingBottom:8, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    {weeklyCoins.map((bar, i) => {
                      const h = bar.coins === 0 ? 0 : Math.max(Math.round((bar.coins / wMax) * BAR_H), 5);
                      const isHighest = bar.coins === wMax;
                      return (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                          <div style={{ width:"100%", height:BAR_H, display:"flex", alignItems:"flex-end" }}>
                            {bar.isToday ? (
                              <div style={{ width:"100%", position:"relative" }}>
                                <div style={{ width:"100%", height:3, borderRadius:2, border:"1px dashed rgba(201,168,76,0.28)", background:"transparent" }} />
                                <div style={{ position:"absolute", top:-5, left:"50%", transform:"translateX(-50%)", width:6, height:6, borderRadius:"50%", background:color.gold.base, opacity:0.60, animation:"liveDot 2s ease-in-out infinite" }} />
                              </div>
                            ) : bar.coins === 0 ? (
                              <div style={{ width:"100%", height:2, borderRadius:1, background:"rgba(255,255,255,0.05)" }} />
                            ) : (
                              <div style={{ width:"100%", height:`${h}px`, borderRadius:"3px 3px 0 0",
                                background: isHighest ? "linear-gradient(180deg,#E2BE74 0%,#C9A84C 100%)" : "rgba(201,168,76,0.28)",
                                boxShadow: isHighest ? "0 -2px 8px rgba(201,168,76,0.36)" : "none",
                                animation:`barFill 0.52s cubic-bezier(.175,.885,.32,1.1) ${i*0.072}s both`,
                                transformOrigin:"bottom",
                              }} />
                            )}
                          </div>
                          <span style={{ fontSize:"0.4375rem", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", color: bar.isToday ? color.gold.base : isHighest ? "rgba(201,168,76,0.50)" : "rgba(255,255,255,0.16)" }}>
                            {bar.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tier progress — reward access tier */}
                <div style={{ paddingTop:14, paddingBottom:4 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ fontSize:8 }}>🥇</span>
                      <span style={{ fontSize:"0.5rem", fontWeight:700, color:color.gold.base }}>Gold Access</span>
                    </div>
                    <span style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.40)" }}>
                      {(TIER_GOAL - COINS).toLocaleString()} pts to Platinum
                    </span>
                    <span style={{ fontSize:"0.5rem", fontWeight:500, color:"rgba(255,255,255,0.32)" }}>Platinum</span>
                  </div>
                  <p style={{ fontSize:"0.375rem", color:"rgba(255,255,255,0.30)", margin:"0 0 7px", letterSpacing:"0.03em" }}>
                    Higher tiers unlock exclusive partner rewards
                  </p>
                  <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${TIER_PCT}%`, borderRadius:2, background:"linear-gradient(90deg,#C9A84C,#E2BE74)", boxShadow:"0 0 8px rgba(201,168,76,0.40)", transition:"width 0.9s cubic-bezier(.175,.885,.32,1.1)" }} />
                  </div>
                </div>
              </div>

              {/* Expand affordance */}
              <button
                onClick={(e) => { e.stopPropagation(); setVaultExpanded(v => !v); }}
                className="vault-toggle"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, width:"calc(100% + 44px)", margin:"14px -22px 0", padding:"9px 0", background:"none", border:"none", borderTop:"1px solid rgba(255,255,255,0.06)", cursor:"pointer" }}
              >
                <span style={{ fontSize:"0.375rem", fontWeight:700, color:"rgba(201,168,76,0.55)", letterSpacing:"0.10em", textTransform:"uppercase" }}>
                  {vaultExpanded ? "Less" : "Weekly activity & tier progress"}
                </span>
                <ChevronDown size={9} style={{ color:"rgba(201,168,76,0.55)", transform: vaultExpanded ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.30s ease" }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:10, padding:`16px ${space.screenX}px 0` }}>
          {ACTIONS.map(a => (
            <button
              key={a.id}
              className="action-card"
              onClick={a.handler}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"14px 8px", borderRadius:radius.lg, background:a.bg, border:`1px solid ${a.border}`, cursor:"pointer", boxShadow:`inset 0 1px 0 rgba(255,255,255,0.05)` }}
            >
              <div className="action-icon" style={{ width:36, height:36, borderRadius:"50%", background:`rgba(${rgb(a.clr)},0.12)`, border:`1px solid rgba(${rgb(a.clr)},0.20)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <a.Icon size={15} style={{ color:a.clr }} />
              </div>
              <div style={{ textAlign:"center" }}>
                <span style={{ fontSize:"0.6875rem", fontWeight:700, color:a.clr, display:"block", lineHeight:1 }}>{a.label}</span>
                <span style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.24)", display:"block", marginTop:3 }}>{a.sub}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Featured Drop ─────────────────────────────────────────────────── */}
        <div ref={rewardsRef} style={{ padding:`36px ${space.screenX}px 0` }}>
          <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <span style={{ ...typo.label, color:color.text.tertiary }}>Featured Drop</span>
              <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.38)", margin:"4px 0 0" }}>Earn through discipline · redeem real rewards</p>
            </div>
          </div>

          {/* Hero reward card */}
          <FeaturedCard reward={REWARDS[0]} userCoins={COINS} onTap={() => setActiveReward(REWARDS[0])} />
        </div>

        {/* ── Partner Drops ─────────────────────────────────────────────────── */}
        <div style={{ marginTop:34 }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:`0 ${space.screenX}px`, marginBottom:14 }}>
            <div>
              <span style={{ ...typo.label, color:color.text.tertiary }}>Partner Drops</span>
              <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.38)", margin:"4px 0 0" }}>Unlocked by your consistency</p>
            </div>
            <button className="view-more-btn" style={{ display:"flex", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:0 }}>
              <span style={{ fontSize:"0.6875rem", color:color.gold.base, fontWeight:600 }}>All</span>
              <ChevronRight size={11} style={{ color:color.gold.base }} />
            </button>
          </div>

          <div className="no-scrollbar" style={{ display:"flex", gap:12, paddingLeft:space.screenX, paddingRight:space.screenX, overflowX:"auto" }}>
            {REWARDS.slice(1).map(r => (
              <RewardCard key={r.id} reward={r} userCoins={COINS} onTap={() => setActiveReward(r)} />
            ))}
          </div>
        </div>

        {/* ── Coin Earning History ──────────────────────────────────────────── */}
        <div ref={historyRef} style={{ padding:`36px ${space.screenX}px 0` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ ...typo.label, color:color.text.tertiary }}>Coin History</span>
            <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.38)" }}>How you earned</span>
          </div>

          {coinGroups.map((group, gi) => {
            const total = groupTotal(group.items);
            return (
              <div key={group.date}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:`${gi === 0 ? 10 : 22}px 0 8px` }}>
                  <span style={{ fontSize:"0.5rem", fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", color: gi === 0 ? color.text.secondary : color.text.muted, flexShrink:0 }}>
                    {group.date}
                  </span>
                  <div style={{ flex:1, height:1, background:color.border.faint }} />
                  {total !== 0 && (
                    <span style={{ fontSize:"0.5625rem", fontWeight:700, color: total > 0 ? color.gold.base : "rgba(255,255,255,0.28)", flexShrink:0, letterSpacing:"-0.01em" }}>
                      {total > 0 ? `+${total.toLocaleString()} pts` : `−${Math.abs(total).toLocaleString()} pts`}
                    </span>
                  )}
                </div>

                {group.items.map((ev, ei) => {
                  const clr     = coinColor(ev);
                  const isWin   = ev.category === "Win";
                  const fmtAmt  = ev.isDebit
                    ? `−${ev.coins.toLocaleString()} pts`
                    : `+${ev.coins.toLocaleString()} pts`;
                  return (
                    <div
                      key={ev.id}
                      className="tx-row"
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", marginLeft:-8, marginRight:-8, borderRadius:radius.sm, position:"relative", background: isWin ? "rgba(77,200,122,0.020)" : "transparent", animation:`springIn 0.30s ease ${(gi*2+ei)*0.05}s both`, cursor:"pointer" }}
                    >
                      {!ev.isDebit && (
                        <div style={{ position:"absolute", left:-space.screenX-8, top:"24%", bottom:"24%", width:2.5, borderRadius:"0 2px 2px 0", background:clr, opacity:0.65 }} />
                      )}
                      <div style={{ width:38, height:38, borderRadius:radius.md, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", background: !ev.isDebit ? `rgba(${rgb(clr)},0.09)` : "rgba(255,255,255,0.035)", border:`1px solid ${!ev.isDebit ? `rgba(${rgb(clr)},0.16)` : color.border.faint}` }}>
                        {ev.emoji}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:"0.8125rem", fontWeight: !ev.isDebit ? 600 : 500, color: !ev.isDebit ? color.text.primary : color.text.secondary, margin:0, letterSpacing:"-0.01em", lineHeight:1 }}>
                          {ev.desc}
                        </p>
                        <span style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.32)", marginTop:3, display:"block" }}>{ev.category}</span>
                      </div>
                      <p style={{ fontSize: isWin ? "1rem" : "0.875rem", fontWeight: !ev.isDebit ? 700 : 400, color:clr, letterSpacing:"-0.03em", margin:0, flexShrink:0 }}>
                        {fmtAmt}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <button
            className="view-all-btn"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"13px", borderRadius:radius.lg, background:"rgba(255,255,255,0.022)", border:`1px solid ${color.border.faint}`, cursor:"pointer", marginTop:20 }}
          >
            <span style={{ fontSize:"0.6875rem", fontWeight:500, color:color.text.tertiary }}>View full coin history</span>
            <ChevronRight size={12} style={{ color:color.text.muted }} />
          </button>
        </div>

        <div style={{ height:32 }} />

        <style>{`
          .hdr-btn { transition: opacity 0.14s ease, background ${motion.fast}; }
          .hdr-btn:hover  { background: rgba(255,255,255,0.07) !important; }
          .hdr-btn:active { opacity: 0.55; transform: scale(0.90); }

          .vault-card {
            animation: vaultPulse 6s ease-in-out infinite;
            box-shadow: inset 0 1px 0 rgba(201,168,76,0.16), 0 0 0 1px rgba(255,255,255,0.02), 0 12px 52px rgba(0,0,0,0.80), 0 0 44px rgba(201,168,76,0.06);
            transition: box-shadow 0.30s ease;
          }
          .vault-toggle { transition: opacity 0.16s ease; }
          .vault-toggle:hover { opacity: 0.72 !important; }

          .action-card { transition: transform 0.18s cubic-bezier(.175,.885,.32,1.275), box-shadow 0.18s ease, background ${motion.fast}; }
          .action-card:hover  { transform: translateY(-1px); }
          .action-card:active { transform: scale(0.93) translateY(1px) !important; }
          .action-card:active .action-icon { transform: scale(0.86); }
          .action-icon { transition: transform 0.16s ease; }

          .featured-card { transition: transform 0.22s cubic-bezier(.175,.885,.32,1.275); cursor: pointer; }
          .featured-card:active { transform: scale(0.985) !important; }

          .reward-card { transition: transform 0.20s cubic-bezier(.175,.885,.32,1.275); cursor: pointer; }
          .reward-card:hover  { transform: translateY(-2px); }
          .reward-card:active { transform: scale(0.96) !important; }

          .redeem-btn { transition: transform 0.12s ease, filter 0.12s ease; }
          .redeem-btn:hover  { filter: brightness(1.10); }
          .redeem-btn:active { transform: scale(0.90) !important; }

          .tx-row { transition: background ${motion.fast}; }
          .tx-row:hover  { background: rgba(255,255,255,0.018) !important; }
          .tx-row:active { background: rgba(255,255,255,0.030) !important; }

          .view-all-btn  { transition: background ${motion.fast}; }
          .view-all-btn:hover  { background: rgba(255,255,255,0.036) !important; }
          .view-all-btn:active { background: rgba(255,255,255,0.046) !important; }
          .view-more-btn { transition: opacity 0.14s ease; }
          .view-more-btn:active { opacity: 0.58; }

          .modal-opt { transition: transform 0.16s cubic-bezier(.175,.885,.32,1.275), background ${motion.fast}; }
          .modal-opt:hover  { background: rgba(255,255,255,0.06) !important; }
          .modal-opt:active { transform: scale(0.97) !important; }

          @keyframes vaultPulse {
            0%,100% { box-shadow: inset 0 1px 0 rgba(201,168,76,0.16), 0 0 0 1px rgba(255,255,255,0.02), 0 12px 52px rgba(0,0,0,0.80), 0 0 44px rgba(201,168,76,0.06); }
            50%      { box-shadow: inset 0 1px 0 rgba(201,168,76,0.24), 0 0 0 1px rgba(255,255,255,0.03), 0 12px 52px rgba(0,0,0,0.80), 0 0 68px rgba(201,168,76,0.11); }
          }
          @keyframes atmospherePulse { 0%,100%{opacity:0.58;transform:scale(1);}    50%{opacity:1;transform:scale(1.10);}      }
          @keyframes lightSweep      { 0%,40%{transform:translateX(-135%);}          82%,100%{transform:translateX(345%);}       }
          @keyframes coinDrift       { 0%,100%{transform:translateY(-50%) rotate(-4deg);} 50%{transform:translateY(calc(-50% - 6px)) rotate(-4deg);} }
          @keyframes balanceGlow     { 0%,100%{text-shadow:0 0 40px rgba(201,168,76,0.35);opacity:0.90;} 50%{text-shadow:0 0 62px rgba(201,168,76,0.56);opacity:1;} }
          @keyframes barFill         { from{transform:scaleY(0);} to{transform:scaleY(1);} }
          @keyframes liveDot         { 0%,100%{opacity:1;transform:scale(1);}  50%{opacity:0.24;transform:scale(0.70);} }
          @keyframes urgencyPulse    { 0%,100%{opacity:1;}  50%{opacity:0.36;} }
          @keyframes springIn        { 0%{opacity:0;transform:translateY(7px) scale(0.97);} 65%{opacity:1;transform:translateY(-1px) scale(1.005);} 100%{opacity:1;transform:translateY(0) scale(1);} }
          @keyframes modalSlideUp    { 0%{opacity:0;transform:translateY(100%);} 100%{opacity:1;transform:translateY(0);} }
        `}</style>
      </div>

      {/* ── Reward Detail Modal ───────────────────────────────────────────────── */}
      {activeReward && (
        <div
          style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={() => setActiveReward(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:480, background:"#0A0A0E", borderRadius:"22px 22px 0 0", borderTop:"1px solid rgba(255,255,255,0.10)", padding:"22px 22px 52px", animation:"modalSlideUp 0.32s cubic-bezier(.175,.885,.32,1.275) both" }}
          >
            <div style={{ display:"flex", justifyContent:"center", marginBottom:18 }}>
              <div style={{ width:32, height:3, borderRadius:2, background:"rgba(255,255,255,0.12)" }} />
            </div>
            <RewardDetailContent reward={activeReward} userCoins={COINS} onClose={() => setActiveReward(null)} />
          </div>
        </div>
      )}

      {/* ── Buy Coins Sheet ──────────────────────────────────────────────────── */}
      {buySheet && (
        <div
          onClick={() => { if (payState === "idle") { setBuySheet(false); } }}
          style={{ position:"fixed", inset:0, zIndex:80, background:"rgba(0,0,0,0.72)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"#0A0A0E", borderRadius:"22px 22px 0 0", borderTop:"1px solid rgba(255,255,255,0.10)", padding:"22px 22px 52px", animation:"modalSlideUp 0.32s cubic-bezier(.175,.885,.32,1.275) both" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:18 }}>
              <div style={{ width:32, height:3, borderRadius:2, background:"rgba(255,255,255,0.12)" }} />
            </div>

            {payState === "credited" ? (
              <div style={{ textAlign:"center", padding:"32px 0" }}>
                <div style={{ fontSize:"3rem", marginBottom:16 }}>✅</div>
                <div style={{ fontSize:"1.25rem", fontWeight:800, color:"#4DC87A", letterSpacing:"-0.03em", marginBottom:8 }}>Coins Added!</div>
                <div style={{ fontSize:"0.875rem", color:"rgba(255,255,255,0.48)" }}>⟡ {buyPkg?.coins.toLocaleString("en-IN")} coins credited to your vault</div>
              </div>
            ) : payState === "waiting" ? (
              <div style={{ textAlign:"center", padding:"16px 0 8px" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:14 }}>📲</div>
                <div style={{ fontSize:"1.125rem", fontWeight:800, color:"#fff", letterSpacing:"-0.03em", marginBottom:8 }}>Complete payment in UPI app</div>
                <div style={{ fontSize:"0.8125rem", color:"rgba(255,255,255,0.44)", marginBottom:8, lineHeight:1.55 }}>
                  Pay ₹{buyPkg?.price} via PhonePe / GPay / any UPI app.<br />Come back here once done.
                </div>
                <div style={{ fontSize:"0.75rem", color:"rgba(201,168,76,0.70)", marginBottom:28, fontWeight:600 }}>
                  UPI: {UPI_ID}
                </div>
                <button
                  onClick={handlePaidConfirm}
                  style={{ width:"100%", padding:"18px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#E2BE74,#C9A84C)", fontSize:"0.9375rem", fontWeight:800, color:"#000", cursor:"pointer", boxShadow:"0 4px 24px rgba(201,168,76,0.36)", marginBottom:12 }}
                >
                  ✓ I&apos;ve Paid — Add Coins
                </button>
                <button onClick={() => { setPayState("idle"); setBuyPkg(null); }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.28)", fontSize:"0.8125rem", cursor:"pointer" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:"1.125rem", fontWeight:800, color:"#fff", letterSpacing:"-0.03em", marginBottom:4 }}>Buy Coins</div>
                  <div style={{ fontSize:"0.8125rem", color:"rgba(255,255,255,0.38)" }}>Pay via PhonePe, GPay, or any UPI app</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                  {COIN_PKGS.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => handleBuy(pkg)}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 18px", borderRadius:14, background:`rgba(${rgb(pkg.accent)},0.07)`, border:`1px solid rgba(${rgb(pkg.accent)},0.22)`, cursor:"pointer", position:"relative", overflow:"hidden" }}
                    >
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:`rgba(${rgb(pkg.accent)},0.14)`, border:`1px solid rgba(${rgb(pkg.accent)},0.28)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:"1.25rem", fontWeight:900, color:pkg.accent, letterSpacing:"-0.05em" }}>⟡</span>
                        </div>
                        <div style={{ textAlign:"left" }}>
                          <div style={{ fontSize:"1rem", fontWeight:800, color:"#fff", letterSpacing:"-0.03em", lineHeight:1.1 }}>{pkg.coins.toLocaleString("en-IN")} coins</div>
                          <div style={{ fontSize:"0.6875rem", color:"rgba(255,255,255,0.38)", marginTop:2 }}>{pkg.label}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                        {pkg.badge && (
                          <span style={{ fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.10em", color:pkg.accent, background:`rgba(${rgb(pkg.accent)},0.12)`, border:`1px solid rgba(${rgb(pkg.accent)},0.28)`, padding:"2px 7px", borderRadius:99 }}>{pkg.badge}</span>
                        )}
                        <span style={{ fontSize:"1.0625rem", fontWeight:800, color:pkg.accent, letterSpacing:"-0.03em" }}>₹{pkg.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ fontSize:"1rem" }}>🔒</span>
                  <span style={{ fontSize:"0.6875rem", color:"rgba(255,255,255,0.24)" }}>Secure UPI payment · Coins credited instantly</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Featured Card (hero, full-width) ─────────────────────────────────────────
function FeaturedCard({ reward: r, userCoins, onTap }: { reward: Reward; userCoins: number; onTap: () => void }) {
  const canAfford = userCoins >= r.coinsRequired;
  return (
    <div
      className="featured-card"
      onClick={onTap}
      style={{ position:"relative", borderRadius:radius.xl, background:r.bg, border:`1px solid rgba(${rgb(r.accent)},0.24)`, padding:"20px 20px 18px", overflow:"hidden", boxShadow:`inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.60)` }}
    >
      <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"42%", pointerEvents:"none", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.022),transparent)", animation:`lightSweep 9s ease-in-out infinite` }} />
      <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1, background:`linear-gradient(90deg,transparent,rgba(${rgb(r.accent)},0.45),transparent)`, pointerEvents:"none" }} />

      <div style={{ position:"relative" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2.5px 8px", borderRadius:radius.full, background:`rgba(${rgb(r.statusColor)},0.12)`, border:`1px solid rgba(${rgb(r.statusColor)},0.24)`, fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:r.statusColor }}>
            {r.status === "UNLOCKED" && "✓ "}{r.status}
          </span>
          <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.22)" }}>Expires {r.expires}</span>
        </div>

        <div style={{ display:"flex", alignItems:"flex-end", gap:16, marginBottom:14 }}>
          <span style={{ fontSize:"3.5rem", lineHeight:1 }}>{r.emoji}</span>
          <div>
            <p style={{ fontSize:"1.375rem", fontWeight:900, color:color.text.primary, margin:"0 0 3px", letterSpacing:"-0.03em", lineHeight:1 }}>{r.offer}</p>
            <p style={{ fontSize:"0.75rem", fontWeight:700, color:r.accent, margin:"0 0 4px" }}>{r.brand}</p>
            <p style={{ fontSize:"0.625rem", color:color.text.muted, margin:0 }}>{r.desc}</p>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:"1.125rem", fontWeight:900, color:r.accent, letterSpacing:"-0.04em" }}>
                {r.coinsRequired.toLocaleString()} pts
              </span>
              {canAfford && <span style={{ fontSize:"0.4375rem", color:"#4DC87A", fontWeight:700 }}>✓ You can redeem</span>}
            </div>
            {!canAfford && <span style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.30)" }}>Need {(r.coinsRequired - userCoins).toLocaleString()} more pts</span>}
          </div>
          <button
            className="redeem-btn"
            onClick={e => { e.stopPropagation(); onTap(); }}
            style={{ padding:"9px 18px", borderRadius:radius.lg, background: canAfford ? r.accent : "rgba(255,255,255,0.08)", border:"none", color: canAfford ? "#000" : "rgba(255,255,255,0.30)", fontSize:"0.625rem", fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", cursor: canAfford ? "pointer" : "default", boxShadow: canAfford ? `0 3px 14px rgba(${rgb(r.accent)},0.38)` : "none" }}
          >
            {canAfford ? "Redeem →" : "Locked"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reward Card (horizontal scroll) ─────────────────────────────────────────
function RewardCard({ reward: r, userCoins, onTap }: { reward: Reward; userCoins: number; onTap: () => void }) {
  const canAfford = userCoins >= r.coinsRequired;
  return (
    <div
      className="reward-card"
      onClick={onTap}
      style={{ flexShrink:0, width:162, borderRadius:radius.lg, background:r.bg, border:`1px solid rgba(${rgb(r.accent)},0.20)`, padding:"14px 14px 16px", overflow:"hidden", position:"relative", boxShadow:`inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 24px rgba(0,0,0,0.50)` }}
    >
      <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"42%", pointerEvents:"none", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.020),transparent)", animation:`lightSweep ${7+r.id*0.42}s ease-in-out infinite`, animationDelay:`${-(r.id*1.7)}s` }} />
      <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1, background:`linear-gradient(90deg,transparent,rgba(${rgb(r.accent)},0.38),transparent)`, pointerEvents:"none" }} />

      <div style={{ position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 6px", borderRadius:radius.full, background:`rgba(${rgb(r.statusColor)},0.10)`, border:`1px solid rgba(${rgb(r.statusColor)},0.20)`, fontSize:"0.375rem", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:r.statusColor }}>
            {r.status === "UNLOCKED" && "✓ "}{r.status === "NEW" ? "NEW" : r.status}
          </span>
          {r.limitedCount && (
            <span style={{ fontSize:"0.375rem", fontWeight:700, color:r.statusColor, animation:"urgencyPulse 2s ease-in-out infinite" }}>{r.limitedCount} left</span>
          )}
        </div>

        <div style={{ fontSize:"2.25rem", marginBottom:8, lineHeight:1 }}>{r.emoji}</div>
        <p style={{ fontSize:"0.875rem", fontWeight:800, color:color.text.primary, margin:"0 0 2px", letterSpacing:"-0.02em", lineHeight:1.05 }}>{r.brand}</p>
        <p style={{ fontSize:"0.5625rem", color:color.text.muted, margin:"0 0 10px", lineHeight:1.4 }}>{r.offer}</p>

        {r.requirement && (
          <div style={{ display:"inline-flex", alignItems:"center", margin:"0 0 10px", padding:"2.5px 6px", borderRadius:radius.sm, background:`rgba(${rgb(r.statusColor)},0.08)`, border:`1px solid rgba(${rgb(r.statusColor)},0.15)` }}>
            <span style={{ fontSize:"0.375rem", color:r.statusColor, fontWeight:600 }}>{r.requirement}</span>
          </div>
        )}

        <div style={{ height:1, background:"rgba(255,255,255,0.06)", marginBottom:10 }} />

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"0.875rem", fontWeight:900, color: canAfford ? r.accent : "rgba(255,255,255,0.36)", letterSpacing:"-0.04em" }}>
              {r.coinsRequired >= 1000 ? `${(r.coinsRequired/1000).toFixed(0)}K` : r.coinsRequired} pts
            </div>
          </div>
          <button
            className="redeem-btn"
            onClick={e => { e.stopPropagation(); onTap(); }}
            style={{ padding:"5px 10px", borderRadius:radius.xs, background: canAfford ? r.accent : "rgba(255,255,255,0.07)", border:"none", color: canAfford ? "#000" : "rgba(255,255,255,0.26)", fontSize:"0.4375rem", fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", cursor: canAfford ? "pointer" : "default", boxShadow: canAfford ? `0 2px 10px rgba(${rgb(r.accent)},0.32)` : "none" }}
          >
            {canAfford ? "Redeem" : "Locked"}
          </button>
        </div>
        <span style={{ fontSize:"0.375rem", color:"rgba(255,255,255,0.16)", display:"block", marginTop:8 }}>Expires {r.expires}</span>
      </div>
    </div>
  );
}

// ─── Reward Detail Modal ──────────────────────────────────────────────────────
function RewardDetailContent({ reward: r, userCoins, onClose }: { reward: Reward; userCoins: number; onClose: () => void }) {
  const [redeemed, setRedeemed] = useState(false);
  const canAfford = userCoins >= r.coinsRequired;
  const needed    = r.coinsRequired - userCoins;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (redeemed) {
    return (
      <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
        {/* Animated checkmark */}
        <div style={{ width:72, height:72, borderRadius:"50%", background:"radial-gradient(circle, rgba(201,168,76,0.20) 0%, transparent 70%)", border:"2px solid rgba(201,168,76,0.45)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", animation:"redeemPop 0.52s cubic-bezier(.175,.885,.32,1.275) both", boxShadow:"0 0 36px rgba(201,168,76,0.18)" }}>
          <span style={{ fontSize:"2rem", lineHeight:1 }}>✓</span>
        </div>

        <h2 style={{ fontSize:"1.3125rem", fontWeight:900, letterSpacing:"-0.04em", color:"#fff", margin:"0 0 8px", lineHeight:1 }}>
          Reward reserved.
        </h2>
        <p style={{ fontSize:"0.8125rem", color:"rgba(255,255,255,0.50)", margin:"0 0 24px", lineHeight:1.55 }}>
          This drop unlocks officially soon.<br />You&apos;re among the first.
        </p>

        {/* Early access badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:radius.full, background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.24)", marginBottom:24 }}>
          <span style={{ fontSize:12 }}>🥇</span>
          <span style={{ fontSize:"0.5625rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:r.accent }}>
            Early member access
          </span>
        </div>

        <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.22)", letterSpacing:"0.06em", textTransform:"uppercase", margin:"0 0 20px" }}>
          {r.brand} · {r.offer}
        </p>

        <button
          className="modal-opt"
          onClick={onClose}
          style={{ width:"100%", padding:"14px", borderRadius:radius.lg, background:"rgba(255,255,255,0.06)", border:`1px solid ${color.border.subtle}`, color:color.text.secondary, fontSize:"0.875rem", fontWeight:600, cursor:"pointer" }}
        >
          Done
        </button>

        <style>{`
          @keyframes redeemPop {
            0%   { opacity:0; transform:scale(0.60); }
            65%  { opacity:1; transform:scale(1.10); }
            100% { opacity:1; transform:scale(1.00); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* Brand header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:20 }}>
        <span style={{ fontSize:"3.5rem", lineHeight:1, flexShrink:0 }}>{r.emoji}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2.5px 8px", borderRadius:radius.full, background:`rgba(${rgb(r.statusColor)},0.12)`, border:`1px solid rgba(${rgb(r.statusColor)},0.24)`, fontSize:"0.4375rem", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:r.statusColor }}>
              {r.status}
            </span>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.07)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <X size={13} color="rgba(255,255,255,0.60)" />
            </button>
          </div>
          <h2 style={{ fontSize:"1.1875rem", fontWeight:900, color:color.text.primary, margin:"0 0 3px", letterSpacing:"-0.03em", lineHeight:1.1 }}>{r.offer}</h2>
          <p style={{ fontSize:"0.75rem", fontWeight:700, color:r.accent, margin:"0 0 3px" }}>{r.brand}</p>
        </div>
      </div>

      <p style={{ fontSize:"0.75rem", color:color.text.secondary, margin:"0 0 20px", lineHeight:1.55 }}>{r.desc}</p>

      {/* Requirement */}
      {r.requirement && (
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:radius.sm, background:`rgba(${rgb(r.statusColor)},0.07)`, border:`1px solid rgba(${rgb(r.statusColor)},0.16)`, marginBottom:16 }}>
          <span style={{ fontSize:"0.5625rem", color:r.statusColor, fontWeight:600 }}>{r.requirement}</span>
        </div>
      )}

      {/* Coin requirement block */}
      <div style={{ padding:"14px 16px", borderRadius:radius.lg, background: canAfford ? "rgba(77,200,122,0.06)" : "rgba(255,255,255,0.035)", border: canAfford ? "1px solid rgba(77,200,122,0.16)" : `1px solid ${color.border.subtle}`, marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"0.4375rem", color:color.text.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4, fontWeight:600 }}>Coins required</div>
            <div style={{ fontSize:"1.5rem", fontWeight:900, color: canAfford ? color.gold.bright : "rgba(255,255,255,0.40)", letterSpacing:"-0.04em" }}>
              {r.coinsRequired.toLocaleString()} pts
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"0.4375rem", color:color.text.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4, fontWeight:600 }}>Your balance</div>
            <div style={{ fontSize:"1rem", fontWeight:800, color: canAfford ? "#4DC87A" : "rgba(255,255,255,0.40)", letterSpacing:"-0.03em" }}>
              {userCoins.toLocaleString()} pts
            </div>
          </div>
        </div>
        {!canAfford && (
          <div style={{ marginTop:8, fontSize:"0.5rem", color:"rgba(255,255,255,0.44)" }}>
            Earn {needed.toLocaleString()} more pts — prove daily, win challenges, build your streak
          </div>
        )}
      </div>

      {/* Limited stock */}
      {r.limitedCount && (
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16 }}>
          <div style={{ width:4, height:4, borderRadius:"50%", background:r.statusColor, animation:"urgencyPulse 1.8s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.5625rem", fontWeight:700, color:r.statusColor, animation:"urgencyPulse 1.8s ease-in-out infinite" }}>Only {r.limitedCount} remaining · limited stock</span>
        </div>
      )}

      {/* CTA */}
      {canAfford ? (
        <button
          className="modal-opt"
          onClick={() => setRedeemed(true)}
          style={{ width:"100%", padding:"16px", borderRadius:radius.lg, background: r.accent, border:"none", color:"#000", fontSize:"0.875rem", fontWeight:800, letterSpacing:"0.04em", cursor:"pointer", boxShadow:`0 4px 22px rgba(${rgb(r.accent)},0.42)` }}
        >
          Redeem for {r.coinsRequired.toLocaleString()} pts
        </button>
      ) : (
        <button
          className="modal-opt"
          onClick={() => {}}
          style={{ width:"100%", padding:"16px", borderRadius:radius.lg, background:"rgba(255,255,255,0.05)", border:`1px solid ${color.border.subtle}`, color:color.text.secondary, fontSize:"0.875rem", fontWeight:600, cursor:"default" }}
        >
          Keep earning to unlock
        </button>
      )}

      <p style={{ fontSize:"0.4375rem", color:"rgba(255,255,255,0.18)", textAlign:"center", margin:"12px 0 0", letterSpacing:"0.03em" }}>
        Expires {r.expires} · Delivered within 3–5 business days
      </p>
    </>
  );
}
