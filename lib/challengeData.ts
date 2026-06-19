// Shared challenge types, helpers, and mock data — intimate 30–50 person accountability rooms

export type Tier      = "Rookie" | "Warrior" | "Elite" | "Insane";
export type FilterCat = "All" | "Elite" | "Transformation" | "Performance" | "Discipline" | "Social";

export type Participant = { initials: string; bg: string };
export type RecentProof = { initials: string; bg: string; action: string; timeAgo: string };

export interface Challenge {
  id:              number;
  title:           string;
  tagline:         string;
  emoji:           string;
  category:        string;
  duration:        number;
  entry:           number;   // in coins (1 coin = ₹1)
  prize:           number;   // total pool in coins
  participants:    number;   // current room size
  maxParticipants: number;   // cap: 30–50
  winnersCount:    number;   // top N split the 80%
  daysLeft:        number;
  tier:            Tier;
  accentColor:     string;
  cardBg:          string;
  trending:        boolean;
  isLive:          boolean;
  friendsJoined:   Participant[];
  recentProofs:    RecentProof[];
  proofType:       string;
  minStreak:       number;
  joinedToday:     number;
  liveTicket:      string;
  proofsToday:     number;
  activeNow:       number;
  socialBlip:      string;   // "Priya maintained her streak"
  missedYesterday: number;
  // Creator economy fields
  creator?:    { name: string; initials: string; bg: string; cred?: string };
  isPublic?:   boolean;   // undefined = treat as public
  inviteCode?: string;    // private challenges only
  memberCap?:  number;    // cap selected during creation
  stepGoal?:   number;    // daily step target for step challenges
  community?:  string;    // city / club identifier shown on card
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmt(n: number): string {
  if (n >= 100_000) return `₹${parseFloat((n / 100_000).toFixed(1))}L`;
  if (n >= 1_000)   return `₹${parseFloat((n / 1_000).toFixed(1))}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}
export function fmtCoins(n: number): string {
  if (n >= 100_000) return `${parseFloat((n / 100_000).toFixed(1))}L`;
  if (n >= 1_000)   return `${parseFloat((n / 1_000).toFixed(1))}K`;
  return `${n.toLocaleString("en-IN")}`;
}
export function rgb(hex: string): string {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

// ─── Participant pool ─────────────────────────────────────────────────────────
const P: Record<string, Participant> = {
  PK: { initials: "PK", bg: "linear-gradient(135deg,#145C38,#062010)" },
  AS: { initials: "AS", bg: "linear-gradient(135deg,#7A4A18,#3A2008)" },
  RD: { initials: "RD", bg: "linear-gradient(135deg,#1A3A6A,#081528)" },
  NR: { initials: "NR", bg: "linear-gradient(135deg,#6A2A10,#2A0E06)" },
  VM: { initials: "VM", bg: "linear-gradient(135deg,#3A3080,#141228)" },
};

// ─── Challenge data — small rooms, real stakes ────────────────────────────────
export const FEATURED: Challenge = {
  id: 0, title: "75 Hard India",
  tagline: "The most demanding 30-day program. For those who are serious.",
  emoji: "🔥", category: "transformation",
  duration: 30, entry: 25000, prize: 1000000,
  participants: 28, maxParticipants: 40, winnersCount: 3,
  daysLeft: 28, tier: "Insane", accentColor: "#4DC87A", trending: true, isLive: true,
  cardBg: "radial-gradient(ellipse at 20% 26%, rgba(4,120,87,0.30) 0%, transparent 58%), linear-gradient(160deg,#050E09 0%,#020704 100%)",
  friendsJoined: [P.PK, P.VM],
  recentProofs: [
    { ...P.PK, action: "Morning run 5K 🏃", timeAgo: "4m" },
    { ...P.AS, action: "Weight training 💪", timeAgo: "11m" },
    { ...P.NR, action: "Yoga flow done 🧘",  timeAgo: "28m" },
  ],
  proofType: "2× Camera snap daily", minStreak: 5, joinedToday: 6,
  liveTicket: "PK posted morning run · 4m ago",
  proofsToday: 16, activeNow: 9,
  socialBlip: "Bangalore leads this week",
  missedYesterday: 2,
  community: "Pan India",
  creator: { name: "Arjun S.", initials: "AS", bg: P.AS.bg, cred: "🔥 Day 91 streak" },
};

export const CHALLENGES: Challenge[] = [
  {
    id: 1, title: "Summer Shred",
    tagline: "30 days. 30 people. One room. No excuses.",
    emoji: "⚡", category: "elite",
    duration: 30, entry: 5000, prize: 250000,
    participants: 24, maxParticipants: 30, winnersCount: 3,
    daysLeft: 22, tier: "Elite", accentColor: "#E2BE74", trending: true, isLive: true,
    cardBg: "radial-gradient(ellipse at 24% 22%, rgba(201,168,76,0.22) 0%, transparent 58%), linear-gradient(160deg,#0D0A04 0%,#080600 100%)",
    friendsJoined: [P.PK, P.AS, P.NR],
    recentProofs: [
      { ...P.AS, action: "Chest day 🏋️", timeAgo: "3m" },
      { ...P.PK, action: "5K run 🏃",     timeAgo: "17m" },
    ],
    proofType: "Camera snap", minStreak: 7, joinedToday: 4,
    liveTicket: "Arjun posted proof · 3m ago",
    proofsToday: 11, activeNow: 6,
    socialBlip: "HSR dominating tonight",
    missedYesterday: 1,
    community: "HSR Colony",
    creator: { name: "Priya K.", initials: "PK", bg: P.PK.bg, cred: "🏆 8 rooms hosted" },
  },
  {
    id: 2, title: "10K Daily Walk",
    tagline: "Hit 10,000 steps every day. Community keeps you honest.",
    emoji: "🚶", category: "discipline",
    duration: 7, entry: 200, prize: 12000,
    participants: 38, maxParticipants: 50, winnersCount: 8,
    daysLeft: 6, tier: "Rookie", accentColor: "#C9A84C", trending: false, isLive: true,
    cardBg: "radial-gradient(ellipse at 20% 22%, rgba(180,83,9,0.22) 0%, transparent 58%), linear-gradient(160deg,#0C0804 0%,#060402 100%)",
    friendsJoined: [P.RD],
    recentProofs: [{ ...P.RD, action: "Hit 12K steps 🚶", timeAgo: "8m" }],
    proofType: "GPS tracked", minStreak: 0, joinedToday: 8,
    liveTicket: "62 competing · last proof 8m ago",
    proofsToday: 14, activeNow: 12,
    socialBlip: "Mumbai catching up",
    missedYesterday: 4,
    community: "Mumbai",
    creator: { name: "Rahul D.", initials: "RD", bg: P.RD.bg, cred: "1.4K members joined" },
  },
  {
    id: 3, title: "Office Step Challenge",
    tagline: "Beat your colleagues. Win real money.",
    emoji: "💼", category: "performance",
    duration: 14, entry: 999, prize: 58000,
    participants: 24, maxParticipants: 40, winnersCount: 5,
    daysLeft: 9, tier: "Warrior", accentColor: "#8B8BDE", trending: true, isLive: false,
    cardBg: "radial-gradient(ellipse at 22% 20%, rgba(99,102,241,0.22) 0%, transparent 58%), linear-gradient(160deg,#07070F 0%,#040408 100%)",
    friendsJoined: [],
    recentProofs: [],
    proofType: "GPS tracked", minStreak: 0, joinedToday: 5,
    liveTicket: "Opens in 2 days · 5 joined today",
    proofsToday: 8, activeNow: 5,
    socialBlip: "Koramangala office tribe leads",
    missedYesterday: 3,
    community: "Koramangala",
    creator: { name: "Nisha R.", initials: "NR", bg: P.NR.bg, cred: "⚡ 94% completion rate" },
  },
  {
    id: 4, title: "Mumbai Moves",
    tagline: "City-wide fitness battle. Intimate room. Maximum pressure.",
    emoji: "🌆", category: "social",
    duration: 14, entry: 999, prize: 34000,
    participants: 41, maxParticipants: 45, winnersCount: 5,
    daysLeft: 11, tier: "Warrior", accentColor: "#6098D8", trending: false, isLive: false,
    cardBg: "radial-gradient(ellipse at 20% 24%, rgba(37,99,235,0.22) 0%, transparent 58%), linear-gradient(160deg,#050810 0%,#030406 100%)",
    friendsJoined: [P.VM],
    recentProofs: [],
    proofType: "Check-in + Camera", minStreak: 3, joinedToday: 3,
    liveTicket: "Vikram just joined · 3 today",
    proofsToday: 9, activeNow: 7,
    socialBlip: "Mumbai vs Bangalore 🔥",
    missedYesterday: 2,
    community: "Mumbai Fitness",
    creator: { name: "Vikram M.", initials: "VM", bg: P.VM.bg, cred: "👥 Mumbai community" },
  },
  {
    id: 5, title: "Discipline Mode",
    tagline: "7 days. No excuses. Community is watching.",
    emoji: "🧠", category: "discipline",
    duration: 7, entry: 200, prize: 8600,
    participants: 46, maxParticipants: 50, winnersCount: 8,
    daysLeft: 3, tier: "Rookie", accentColor: "#E07840", trending: false, isLive: true,
    cardBg: "radial-gradient(ellipse at 22% 22%, rgba(224,120,64,0.18) 0%, transparent 58%), linear-gradient(160deg,#0C0804 0%,#060402 100%)",
    friendsJoined: [],
    recentProofs: [{ ...P.NR, action: "14K steps today", timeAgo: "22m" }],
    proofType: "Camera snap", minStreak: 0, joinedToday: 2,
    liveTicket: "NR logged 14K steps · 22m ago",
    proofsToday: 12, activeNow: 8,
    socialBlip: "Delhi leads this week",
    missedYesterday: 3,
    community: "Delhi NCR",
    creator: { name: "Arjun S.", initials: "AS", bg: P.AS.bg, cred: "🔥 Day 78 streak" },
  },
];

export const ALL_CHALLENGES: Challenge[] = [FEATURED, ...CHALLENGES];

export const FILTER_CATS: FilterCat[] = ["All", "Elite", "Transformation", "Performance", "Discipline", "Social"];
export const FILTER_EMOJI: Record<FilterCat, string> = {
  All: "⚡", Elite: "👑", Transformation: "🔥", Performance: "🏆", Discipline: "🧠", Social: "👥",
};
export function timeToMidnight(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function timeToMidnightRaw(): { h: number; m: number; s: number } {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = midnight.getTime() - now.getTime();
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

// ─── DB types & mapper ───────────────────────────────────────────────────────

export interface DbChallenge {
  id:               number;
  title:            string;
  tagline:          string;
  emoji:            string;
  category:         string;
  duration:         number;
  entry_coins:      number;
  prize_coins:      number;
  max_participants: number;
  proof_type:       string;
  tier:             Tier;
  accent_color:     string;
  card_bg:          string;
  is_live:          boolean;
  is_public:        boolean;
  creator_id:       string | null;
  winners_count:    number;
  created_at:       string;
  // joined from profiles via creator_id
  creator_name?:     string;
  creator_initials?: string;
  // aggregated
  participant_count?: number;
}

export function dbToChallenge(row: DbChallenge): Challenge {
  const daysPassed = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000);
  const daysLeft   = Math.max(0, row.duration - daysPassed);
  return {
    id:              row.id,
    title:           row.title,
    tagline:         row.tagline,
    emoji:           row.emoji,
    category:        row.category,
    duration:        row.duration,
    entry:           row.entry_coins,
    prize:           row.prize_coins,
    participants:    row.participant_count ?? 0,
    maxParticipants: row.max_participants,
    winnersCount:    row.winners_count ?? 3,
    daysLeft,
    tier:            row.tier,
    accentColor:     row.accent_color,
    cardBg:          row.card_bg,
    trending:        false,
    isLive:          row.is_live,
    isPublic:        row.is_public,
    friendsJoined:   [],
    recentProofs:    [],
    proofType:       row.proof_type,
    minStreak:       0,
    joinedToday:     0,
    liveTicket:      row.is_live ? "Live now" : "Coming soon",
    proofsToday:     0,
    activeNow:       0,
    socialBlip:      "",
    missedYesterday: 0,
    creator: row.creator_name ? {
      name:     row.creator_name,
      initials: row.creator_initials ?? row.creator_name.slice(0, 2).toUpperCase(),
      bg:       "linear-gradient(135deg,#7A4A18,#3A2008)",
    } : undefined,
  };
}

export const PROOF_ICON: Record<string, string> = {
  "Camera snap": "📸", "Camera Proof": "📸", "2× Camera snap daily": "📸",
  "GPS tracked": "📍", "Step Tracking": "📍", "Check-in + Camera": "📍",
};
