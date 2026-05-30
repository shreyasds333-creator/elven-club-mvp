// Live discipline feed — social presence, city competition, crew data, reputation

// ─── Types ────────────────────────────────────────────────────────────────────
export type FeedItemType = "proof" | "streak" | "city" | "live" | "crew";

export interface FeedUser {
  initials: string;
  bg:       string;
  name:     string;
  city?:    string;
}

export interface FeedItem {
  id:              string;
  type:            FeedItemType;
  timeAgo:         string;
  isLive?:         boolean;
  // proof / streak
  user?:           FeedUser;
  action?:         string;
  proofEmoji?:     string;
  challenge?:      string;
  challengeAccent?: string;
  // streak
  streakDays?:     number;
  streakLabel?:    string;
  // city / live
  headline?:       string;
  subline?:        string;
  accent?:         string;
  // live count
  liveCount?:      number;
  liveAvatars?:    { initials: string; bg: string }[];
}

export interface CityEntry {
  rank:    number;
  name:    string;
  isArea:  boolean;
  proofs:  number;
  active:  number;
  streaks: number;
  trend:   "up" | "down" | "flat";
  hot:     boolean;
  blip:    string;
}

export interface CrewMember {
  initials: string;
  bg:       string;
  isActive: boolean;
}

export interface Crew {
  id:          number;
  name:        string;
  emoji:       string;
  city:        string;
  memberCount: number;
  activeNow:   number;
  proofs:      number;
  streakDays:  number;
  rank:        number;
  hot:         boolean;
  accent:      string;
  members:     CrewMember[];
}

export interface ReputationInfo {
  label:  string;
  color:  string;
  bg:     string;
  border: string;
}

// ─── Reputation ───────────────────────────────────────────────────────────────
export function getReputation(streak: number): ReputationInfo {
  if (streak >= 30) return { label: "Elite Consistency", color: "#E2BE74", bg: "rgba(226,190,116,0.10)", border: "rgba(226,190,116,0.24)" };
  if (streak >= 21) return { label: "Verified Grinder",  color: "#4DC87A", bg: "rgba(77,200,122,0.09)",  border: "rgba(77,200,122,0.22)" };
  if (streak >= 14) return { label: "Never Missed",      color: "#8B8BDE", bg: "rgba(139,139,222,0.10)", border: "rgba(139,139,222,0.24)" };
  if (streak >= 7)  return { label: "5AM Warrior",       color: "#C9A84C", bg: "rgba(201,168,76,0.08)",  border: "rgba(201,168,76,0.18)" };
  if (streak >= 3)  return { label: "Rising Star",       color: "#4DC87A", bg: "rgba(77,200,122,0.07)",  border: "rgba(77,200,122,0.16)" };
  return              { label: "Getting Started",        color: "rgba(255,255,255,0.38)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)" };
}

// ─── User pool ────────────────────────────────────────────────────────────────
const U_PK: FeedUser  = { initials: "PK", bg: "linear-gradient(135deg,#145C38,#062010)", name: "Priya",     city: "HSR Colony"   };
const U_AS: FeedUser  = { initials: "AS", bg: "linear-gradient(135deg,#7A4A18,#3A2008)", name: "Arjun",     city: "Koramangala"  };
const U_RD: FeedUser  = { initials: "RD", bg: "linear-gradient(135deg,#1A3A6A,#081528)", name: "Rahul",     city: "Mumbai"       };
const U_NR: FeedUser  = { initials: "NR", bg: "linear-gradient(135deg,#6A2A10,#2A0E06)", name: "Neha",      city: "Indiranagar"  };
const U_VM: FeedUser  = { initials: "VM", bg: "linear-gradient(135deg,#3A3080,#141228)", name: "Vikram",    city: "Whitefield"   };
const U_SK: FeedUser  = { initials: "SK", bg: "linear-gradient(135deg,#1A4A4A,#082020)", name: "Siddharth", city: "Bangalore"    };
const U_AK: FeedUser  = { initials: "AK", bg: "linear-gradient(135deg,#4A2060,#1C0C28)", name: "Anika",     city: "Delhi"        };
const U_MV: FeedUser  = { initials: "MV", bg: "linear-gradient(135deg,#304818,#101A08)", name: "Mihail",    city: "Bangalore"    };
// Extended pool
const U_KT: FeedUser  = { initials: "KT", bg: "linear-gradient(135deg,#4A1840,#180814)", name: "Kavya",     city: "Pune"         };
const U_RS: FeedUser  = { initials: "RS", bg: "linear-gradient(135deg,#1A4A2A,#081A10)", name: "Ravi",      city: "Chennai"      };
const U_DM: FeedUser  = { initials: "DM", bg: "linear-gradient(135deg,#2A3860,#0E1428)", name: "Dev",       city: "Hyderabad"    };
const U_MA: FeedUser  = { initials: "MA", bg: "linear-gradient(135deg,#603018,#281006)", name: "Maya",      city: "Koramangala"  };
const U_RV: FeedUser  = { initials: "RV", bg: "linear-gradient(135deg,#2C2870,#0E0C28)", name: "Rohit",     city: "Mumbai"       };

// ─── Feed items ───────────────────────────────────────────────────────────────
export const FEED_ITEMS: FeedItem[] = [
  {
    id: "live-now", type: "live", timeAgo: "now", isLive: true,
    liveCount: 4,
    liveAvatars: [U_PK, U_AS, U_SK, U_MV],
    headline: "4 people proving live",
    subline: "Active in your network right now",
    accent: "#4DC87A",
  },
  {
    id: "p1", type: "proof", timeAgo: "2m", isLive: true,
    user: U_PK, action: "Morning 5K run", proofEmoji: "🏃",
    challenge: "Summer Shred", challengeAccent: "#E2BE74",
  },
  {
    id: "p-rv", type: "proof", timeAgo: "3m", isLive: true,
    user: U_RV, action: "Gym session · chest day", proofEmoji: "📸",
    challenge: "75 Hard India", challengeAccent: "#4DC87A",
  },
  {
    id: "city-1", type: "city", timeAgo: "4m",
    headline: "🔥 Bangalore overtakes Mumbai",
    subline: "128 proofs today · 47 active right now",
    accent: "#E2BE74",
  },
  {
    id: "p2", type: "proof", timeAgo: "7m",
    user: U_AS, action: "Chest day 💪", proofEmoji: "📸",
    challenge: "75 Hard India", challengeAccent: "#4DC87A",
  },
  {
    id: "s1", type: "streak", timeAgo: "11m",
    user: U_RD, streakDays: 21, streakLabel: "Verified Grinder",
    challenge: "10K Daily Walk", challengeAccent: "#C9A84C",
  },
  {
    id: "p3", type: "proof", timeAgo: "14m",
    user: U_SK, action: "14K steps today", proofEmoji: "📍",
    challenge: "10K Daily Walk", challengeAccent: "#C9A84C",
  },
  {
    id: "p-ma", type: "proof", timeAgo: "17m",
    user: U_MA, action: "Extended streak to 21 days 🔥", proofEmoji: "🏆",
    challenge: "Discipline Mode", challengeAccent: "#E07840",
  },
  {
    id: "city-2", type: "city", timeAgo: "18m",
    headline: "⚡ HSR Colony gains momentum",
    subline: "89 proofs this week · overtaking Koramangala",
    accent: "#4DC87A",
  },
  {
    id: "p4", type: "proof", timeAgo: "22m",
    user: U_NR, action: "Yoga flow done", proofEmoji: "🧘",
    challenge: "Discipline Mode", challengeAccent: "#E07840",
  },
  {
    id: "p-kt", type: "proof", timeAgo: "26m",
    user: U_KT, action: "4AM run · 6.2K steps", proofEmoji: "🏃",
    challenge: "Summer Shred", challengeAccent: "#E2BE74",
  },
  {
    id: "s2", type: "streak", timeAgo: "28m",
    user: U_AK, streakDays: 14, streakLabel: "Never Missed",
    challenge: "Office Step Challenge", challengeAccent: "#8B8BDE",
  },
  {
    id: "p5", type: "proof", timeAgo: "31m",
    user: U_VM, action: "Meal prep done", proofEmoji: "🥗",
    challenge: "Mumbai Moves", challengeAccent: "#6098D8",
  },
  {
    id: "p-rs", type: "proof", timeAgo: "38m",
    user: U_RS, action: "Hit 12K steps · health sync verified", proofEmoji: "📍",
    challenge: "10K Daily Walk", challengeAccent: "#C9A84C",
  },
  {
    id: "city-3", type: "city", timeAgo: "45m",
    headline: "💪 48 proofs uploaded this hour",
    subline: "Network momentum: strongest since 6AM",
    accent: "#8B8BDE",
  },
  {
    id: "p6", type: "proof", timeAgo: "52m",
    user: U_RD, action: "Hit 12K steps", proofEmoji: "📍",
    challenge: "10K Daily Walk", challengeAccent: "#C9A84C",
  },
  {
    id: "p-dm", type: "proof", timeAgo: "55m",
    user: U_DM, action: "Morning lift · PRs all around", proofEmoji: "🏋️",
    challenge: "75 Hard India", challengeAccent: "#4DC87A",
  },
  {
    id: "s3", type: "streak", timeAgo: "1h",
    user: U_MV, streakDays: 30, streakLabel: "Elite Consistency",
    challenge: "75 Hard India", challengeAccent: "#4DC87A",
  },
  {
    id: "p7", type: "proof", timeAgo: "1h",
    user: U_SK, action: "5AM run 🌅", proofEmoji: "🏃",
    challenge: "Summer Shred", challengeAccent: "#E2BE74",
  },
  {
    id: "city-4", type: "city", timeAgo: "1h 12m",
    headline: "🥇 Koramangala leads workouts today",
    subline: "71 gym proofs · 24 active challengers",
    accent: "#E07840",
  },
  {
    id: "p8", type: "proof", timeAgo: "1h 20m",
    user: U_AS, action: "Morning meal logged", proofEmoji: "🥗",
    challenge: "75 Hard India", challengeAccent: "#4DC87A",
  },
  {
    id: "s4", type: "streak", timeAgo: "1h 38m",
    user: U_PK, streakDays: 8, streakLabel: "5AM Warrior",
    challenge: "Summer Shred", challengeAccent: "#E2BE74",
  },
  {
    id: "p-nrv2", type: "proof", timeAgo: "1h 44m",
    user: U_NR, action: "Deep work session · 90 min block", proofEmoji: "🧠",
    challenge: "Discipline Mode", challengeAccent: "#E07840",
  },
  {
    id: "p9", type: "proof", timeAgo: "2h",
    user: U_RV, action: "Night session done", proofEmoji: "📸",
    challenge: "Discipline Mode", challengeAccent: "#E07840",
  },
  {
    id: "city-5", type: "city", timeAgo: "2h 10m",
    headline: "📍 12 proving nearby right now",
    subline: "HSR Colony · Koramangala · Indiranagar active",
    accent: "#4DC87A",
  },
];

// ─── City rankings ────────────────────────────────────────────────────────────
export const CITY_DATA: CityEntry[] = [
  { rank: 1, name: "Bangalore",   isArea: false, proofs: 128, active: 47, streaks: 38, trend: "up",   hot: true,  blip: "Dominates tonight 🔥"   },
  { rank: 2, name: "HSR Colony",  isArea: true,  proofs: 89,  active: 31, streaks: 26, trend: "up",   hot: false, blip: "Gaining fast ⚡"         },
  { rank: 3, name: "Mumbai",      isArea: false, proofs: 84,  active: 28, streaks: 22, trend: "flat", hot: false, blip: "Holding ground"          },
  { rank: 4, name: "Koramangala", isArea: true,  proofs: 71,  active: 24, streaks: 18, trend: "up",   hot: false, blip: "Climbing this week"      },
  { rank: 5, name: "Delhi",       isArea: false, proofs: 58,  active: 19, streaks: 15, trend: "down", hot: false, blip: "Below average"           },
  { rank: 6, name: "Indiranagar", isArea: true,  proofs: 44,  active: 14, streaks: 11, trend: "up",   hot: false, blip: "Watch this area ↑"       },
  { rank: 7, name: "Whitefield",  isArea: true,  proofs: 32,  active: 10, streaks: 8,  trend: "down", hot: false, blip: "Quiet tonight"           },
];

// ─── Accountability crews ─────────────────────────────────────────────────────
export const CREWS: Crew[] = [
  {
    id: 1, name: "HSR Run Club", emoji: "🏃", city: "HSR Colony",
    memberCount: 12, activeNow: 4, proofs: 89, streakDays: 8, rank: 1, hot: true,
    accent: "#4DC87A",
    members: [
      { initials: "PK", bg: "linear-gradient(135deg,#145C38,#062010)", isActive: true  },
      { initials: "AS", bg: "linear-gradient(135deg,#7A4A18,#3A2008)", isActive: true  },
      { initials: "RD", bg: "linear-gradient(135deg,#1A3A6A,#081528)", isActive: false },
      { initials: "NR", bg: "linear-gradient(135deg,#6A2A10,#2A0E06)", isActive: true  },
      { initials: "SK", bg: "linear-gradient(135deg,#1A4A4A,#082020)", isActive: false },
    ],
  },
  {
    id: 2, name: "5AM Bangalore", emoji: "⚡", city: "Bangalore",
    memberCount: 8, activeNow: 3, proofs: 64, streakDays: 14, rank: 2, hot: true,
    accent: "#E2BE74",
    members: [
      { initials: "SK", bg: "linear-gradient(135deg,#1A4A4A,#082020)", isActive: true  },
      { initials: "MV", bg: "linear-gradient(135deg,#304818,#101A08)", isActive: true  },
      { initials: "VM", bg: "linear-gradient(135deg,#3A3080,#141228)", isActive: false },
      { initials: "PK", bg: "linear-gradient(135deg,#145C38,#062010)", isActive: true  },
    ],
  },
  {
    id: 3, name: "Koramangala Lifters", emoji: "🏋️", city: "Koramangala",
    memberCount: 15, activeNow: 5, proofs: 71, streakDays: 5, rank: 3, hot: false,
    accent: "#8B8BDE",
    members: [
      { initials: "NR", bg: "linear-gradient(135deg,#6A2A10,#2A0E06)", isActive: true  },
      { initials: "VM", bg: "linear-gradient(135deg,#3A3080,#141228)", isActive: true  },
      { initials: "RD", bg: "linear-gradient(135deg,#1A3A6A,#081528)", isActive: false },
      { initials: "AK", bg: "linear-gradient(135deg,#4A2060,#1C0C28)", isActive: false },
    ],
  },
];

// ─── Live stats ───────────────────────────────────────────────────────────────
export const FEED_STATS = { proofsToday: 312, liveNow: 17 };
