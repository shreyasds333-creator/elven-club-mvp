// Map pin and partner data for the Activity / City screen

export type PinType = "user" | "gym" | "cafe" | "store";

export interface MapPin {
  id: string;
  type: PinType;
  label: string;     // initials for users, emoji for places
  lng: number;
  lat: number;
  isLive?: boolean;
  detail?: string;
  name?: string;
  activity?: string;   // user: last logged activity
  streakDays?: number; // user: current streak
  distanceKm?: number; // approximate km from "you"
}

export interface Partner {
  id: number;
  name: string;
  category: string;
  emoji: string;
  area: string;
  distance: string;
  coinsRequired?: number;
  isNew?: boolean;
  isHot?: boolean;
  bg: string;
  accent: string;
}

export const PIN_COLOR: Record<PinType, string> = {
  user:  "#4DC87A",
  gym:   "#C9A84C",
  cafe:  "#4DC8B8",
  store: "#8B8BDE",
};

// Centered on Koramangala, Bangalore
export const MAP_CENTER: [number, number] = [77.6230, 12.9352];

export const MAP_PINS: MapPin[] = [
  { id: "u1", type: "user",  label: "PK", lng: 77.6245, lat: 12.9380, isLive: true,  name: "Priya K",     activity: "Morning 5K run 🏃",   streakDays:  8, distanceKm: 1.2, detail: "Priya · HSR Colony"      },
  { id: "u2", type: "user",  label: "AS", lng: 77.6192, lat: 12.9290, isLive: true,  name: "Arjun S",     activity: "Chest day done 💪",   streakDays: 30, distanceKm: 0.8, detail: "Arjun · Koramangala"     },
  { id: "u3", type: "user",  label: "SK", lng: 77.6145, lat: 12.9410, isLive: false, name: "Siddharth K", activity: "14K steps today 📍",  streakDays:  5, distanceKm: 2.4, detail: "Siddharth · Indiranagar" },
  { id: "u4", type: "user",  label: "MV", lng: 77.6315, lat: 12.9188, isLive: true,  name: "Mihail V",    activity: "5AM run done 🌅",      streakDays: 14, distanceKm: 3.1, detail: "Mihail · BTM Layout"     },
  { id: "u5", type: "user",  label: "NR", lng: 77.6270, lat: 12.9455, isLive: false, name: "Nisha R",     activity: "Yoga flow done 🧘",   streakDays: 11, distanceKm: 2.1, detail: "Nisha · Indiranagar"     },
  { id: "g1", type: "gym",   label: "🏋️", lng: 77.6222, lat: 12.9345, detail: "Cult.fit · Koramangala · 0.4km"    },
  { id: "g2", type: "gym",   label: "🏋️", lng: 77.6290, lat: 12.9418, detail: "Gold's Gym · Indiranagar · 1.1km"  },
  { id: "c1", type: "cafe",  label: "🥗", lng: 77.6175, lat: 12.9492, detail: "Farm Box · Healthy food · 0.5km"   },
  { id: "c2", type: "cafe",  label: "🥗", lng: 77.6355, lat: 12.9258, detail: "TWC Cafe · Protein · 1.2km"        },
  { id: "s1", type: "store", label: "💊", lng: 77.6130, lat: 12.9322, detail: "MuscleBlaze · Supplements · 1.9km" },
];

export const PARTNERS: Partner[] = [
  { id: 1, name: "Cult.fit",        category: "Gym",          emoji: "🏋️", area: "Koramangala",  distance: "0.4km", coinsRequired: 5000, isHot: true, bg: "linear-gradient(135deg,#0A2010,#050C08)", accent: "#4DC87A" },
  { id: 2, name: "Farm Box",        category: "Protein Cafe", emoji: "🥗", area: "HSR Colony",   distance: "0.8km", coinsRequired: 2000, isNew: true, bg: "linear-gradient(135deg,#0A1A1A,#050A0A)", accent: "#4DC8B8" },
  { id: 3, name: "MuscleBlaze",     category: "Supplements",  emoji: "💊", area: "Indiranagar",  distance: "1.9km", coinsRequired: 3000,             bg: "linear-gradient(135deg,#120A20,#080510)", accent: "#8B8BDE" },
  { id: 4, name: "The Whole Truth", category: "Snacks",       emoji: "🌿", area: "Koramangala",  distance: "0.6km", coinsRequired: 1500,             bg: "linear-gradient(135deg,#0A1A0A,#050A05)", accent: "#4DC87A" },
  { id: 5, name: "Decathlon",       category: "Sports",       emoji: "🏃", area: "Marathahalli", distance: "2.8km", coinsRequired: 8000,             bg: "linear-gradient(135deg,#0A1020,#050810)", accent: "#6098D8" },
];
