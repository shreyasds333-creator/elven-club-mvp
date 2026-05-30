"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { Users, Zap, Activity, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterType = "All" | "Athletes" | "Cafes" | "Gyms" | "Challenges" | "Recovery";

type User = {
  id: number; name: string; calories: number; km: number;
  activity: string; streak: number; discScore: number;
  challenge: string;
  recentAct: string; recentTime: string;
  lat: number; lng: number;
  accent: string; avatarBg: string; initials: string;
};

type Spot = {
  id: number; name: string;
  type: "cafe" | "gym" | "recovery";
  tagline: string; emoji: string;
  tags: string[]; accent: string;
  lat: number; lng: number;
};

type Zone = {
  id: number; name: string;
  participants: number;
  lat: number; lng: number;
  accent: string;
};

type StatItem = { icon: ReactNode; label: string; value: string; color: string };

// ─── Data ─────────────────────────────────────────────────────────────────────
const MAP_CENTER: [number, number] = [72.869, 19.0655];
const ZOOM = 14.6;

const USERS: User[] = [
  {
    id: 1, name: "Arjun",  calories: 820, km: 0.4, activity: "Running",
    streak: 12, discScore: 87, challenge: "Summer Shred",
    recentAct: "5K run · Joggers Park", recentTime: "3m ago",
    lat: 19.0685, lng: 72.8720, accent: "#D4A843",
    avatarBg: "linear-gradient(145deg,#6A3E12,#2E1605)", initials: "AR",
  },
  {
    id: 2, name: "Priya",  calories: 640, km: 0.6, activity: "Cycling",
    streak: 7, discScore: 74, challenge: "Mumbai Moves",
    recentAct: "Cycling · Versova Link", recentTime: "11m ago",
    lat: 19.0640, lng: 72.8648, accent: "#3DBF6E",
    avatarBg: "linear-gradient(145deg,#0D4A28,#051A0F)", initials: "PR",
  },
  {
    id: 3, name: "Rohan",  calories: 490, km: 0.8, activity: "Walking",
    streak: 21, discScore: 92, challenge: "75 Hard India",
    recentAct: "Morning walk · Lokhandwala", recentTime: "28m ago",
    lat: 19.0618, lng: 72.8702, accent: "#4E88D4",
    avatarBg: "linear-gradient(145deg,#122E5E,#060F22)", initials: "RO",
  },
  {
    id: 4, name: "Neha",   calories: 710, km: 1.2, activity: "HIIT",
    streak: 5, discScore: 68, challenge: "Summer Shred",
    recentAct: "HIIT class · Cult.fit", recentTime: "1h ago",
    lat: 19.0678, lng: 72.8742, accent: "#D46A30",
    avatarBg: "linear-gradient(145deg,#5E2008,#200A02)", initials: "NE",
  },
  {
    id: 5, name: "Vikram", calories: 380, km: 1.5, activity: "Yoga",
    streak: 14, discScore: 81, challenge: "Step Challenge",
    recentAct: "Power yoga · Zenveda", recentTime: "45m ago",
    lat: 19.0648, lng: 72.8678, accent: "#7878CC",
    avatarBg: "linear-gradient(145deg,#2C2870,#0E0C28)", initials: "VI",
  },
];

const SPOTS: Spot[] = [
  { id: 101, name: "Booster Bar",      type: "cafe",     tagline: "Cold-press juices · Protein bowls",      emoji: "🥤", accent: "#3DBF6E", tags: ["Protein", "Cold Press", "Açaí"],    lat: 19.0662, lng: 72.8698 },
  { id: 102, name: "Grind Theory",     type: "gym",      tagline: "Elite CrossFit & strength training",      emoji: "🏋️", accent: "#D4A843", tags: ["CrossFit", "HIIT", "Strength"],   lat: 19.0700, lng: 72.8726 },
  { id: 103, name: "Salt Recovery",    type: "recovery", tagline: "Cold plunge · Sauna · Contrast therapy",  emoji: "❄️", accent: "#7878CC", tags: ["Cold Plunge", "Sauna", "Stretch"], lat: 19.0626, lng: 72.8660 },
  { id: 104, name: "The Press Room",   type: "cafe",     tagline: "Açaí bowls · Whey coffee · Clean eats",   emoji: "🫐", accent: "#3DBF6E", tags: ["Açaí", "Protein Coffee", "Bowls"], lat: 19.0676, lng: 72.8706 },
  { id: 105, name: "Cult.fit Andheri", type: "gym",      tagline: "Group classes · PT · Recovery pods",      emoji: "⚡", accent: "#D4A843", tags: ["Group Classes", "PT", "Strength"],lat: 19.0636, lng: 72.8683 },
  { id: 106, name: "Zenveda Wellness", type: "recovery", tagline: "Yoga · Meditation · Sound bath",          emoji: "🧘", accent: "#7878CC", tags: ["Yoga", "Meditation", "Breathwork"],lat: 19.0652, lng: 72.8718 },
];

const ZONES: Zone[] = [
  { id: 1, name: "Summer Shred Zone", participants: 12, lat: 19.0688, lng: 72.8718, accent: "#D4A843" },
  { id: 2, name: "Mumbai Moves",      participants: 8,  lat: 19.0642, lng: 72.8648, accent: "#3DBF6E" },
];

const FILTERS: { key: FilterType; emoji: string; label: string }[] = [
  { key: "All",        emoji: "⚡", label: "All"        },
  { key: "Athletes",   emoji: "🏃", label: "Athletes"   },
  { key: "Cafes",      emoji: "🥤", label: "Cafes"      },
  { key: "Gyms",       emoji: "🏋️", label: "Gyms"       },
  { key: "Challenges", emoji: "🔥", label: "Challenges" },
  { key: "Recovery",   emoji: "❄️", label: "Recovery"   },
];

const SPOT_TYPE_LABEL: Record<Spot["type"], string> = {
  cafe: "Café", gym: "Gym", recovery: "Recovery",
};

const ACTIVITY_EMOJI: Record<string, string> = {
  Running: "🏃", Cycling: "🚴", Walking: "🚶", HIIT: "⚡", Yoga: "🧘",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hex2rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Map tile style ───────────────────────────────────────────────────────────
const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256, maxzoom: 19,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
  },
  layers: [{ id: "base", type: "raster", source: "carto",
    paint: {
      "raster-saturation": -0.28, "raster-brightness-max": 0.72,
      "raster-contrast": 0.11,   "raster-opacity": 1.0,
    },
  }],
};

// ─── Heatmap clusters ─────────────────────────────────────────────────────────
function cluster(cx: number, cy: number, offsets: number[][]): GeoJSON.Feature[] {
  return offsets.map(([dlng, dlat]) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [cx + dlng, cy + dlat] },
    properties: {},
  }));
}

const HEAT_RUN = cluster(72.8718, 19.0688, [
  [0,0],[.0010,.0006],[-.0007,.0009],[.0014,-.0005],[-.0012,.0012],[.0018,.0009],
  [.0007,-.0013],[-.0015,.0005],[.0011,.0016],[-.0006,-.0016],[.0020,.0003],
  [-.0018,-.0009],[.0005,.0020],[.0022,-.0006],[-.0022,.0007],[.0008,.0022],
]);
const HEAT_GYM = cluster(72.8648, 19.0642, [
  [0,0],[.0008,.0005],[-.0006,.0008],[.0012,-.0004],[-.0010,.0011],[.0015,.0007],
  [.0006,-.0011],[-.0012,.0004],[.0009,.0013],[-.0004,-.0014],[.0016,.0002],[.0003,.0017],
]);
const HEAT_SOC = cluster(72.8700, 19.0625, [
  [0,0],[.0007,.0004],[-.0005,.0007],[.0010,-.0003],[-.0008,.0009],[.0013,.0006],
  [.0005,-.0009],[-.0010,.0003],[.0007,.0011],[-.0003,-.0012],[.0014,-.0001],
]);

// ─── MapCanvas ────────────────────────────────────────────────────────────────
export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);

  const [ready,      setReady]      = useState(false);
  const [tick,       setTick]       = useState(0);
  const [selId,      setSelId]      = useState<number | null>(null);
  const [selSpot,    setSelSpot]    = useState<number | null>(null);
  const [invited,    setInvited]    = useState<Set<number>>(new Set());
  const [filter,     setFilter]     = useState<FilterType>("All");
  const [hlIdx,      setHlIdx]      = useState(0);
  // Headline ticker
  useEffect(() => {
    const id = setInterval(() => setHlIdx(n => n + 1), 4400);
    return () => clearInterval(id);
  }, []);

  // Close popups on filter change
  useEffect(() => { setSelId(null); setSelSpot(null); }, [filter]);

  // Map init
  useEffect(() => {
    if (!containerRef.current) return;
    let live = true;

    import("maplibre-gl").then(({ default: mgl }) => {
      if (!live || !containerRef.current) return;

      const map = new mgl.Map({
        container: containerRef.current,
        style: MAP_STYLE as any,
        center: MAP_CENTER, zoom: ZOOM,
        minZoom: 12, maxZoom: 18,
        dragRotate: false, pitchWithRotate: false,
        attributionControl: false, fadeDuration: 300,
      });
      mapRef.current = map;

      map.on("load", () => {
        if (!live) return;
        const addHeat = (id: string, feats: GeoJSON.Feature[], clr: string, r: number) => {
          map.addSource(`hs-${id}`, { type: "geojson", data: { type: "FeatureCollection", features: feats } });
          map.addLayer({ id: `hl-${id}`, type: "heatmap", source: `hs-${id}`,
            paint: {
              "heatmap-weight": 1,
              "heatmap-intensity": ["interpolate",["linear"],["zoom"], 12, 0.45, 17, 2.8],
              "heatmap-color": ["interpolate",["linear"],["heatmap-density"],
                0, "rgba(0,0,0,0)", 0.15, hex2rgba(clr, 0.00), 0.38, hex2rgba(clr, 0.10),
                0.60, hex2rgba(clr, 0.26), 0.82, hex2rgba(clr, 0.40), 1.00, hex2rgba(clr, 0.48),
              ],
              "heatmap-radius": ["interpolate",["linear"],["zoom"], 12, r*0.72, 17, r*3.2],
              "heatmap-opacity": 0.72,
            } as any,
          });
        };
        addHeat("run", HEAT_RUN, "#3DBF6E", 30);
        addHeat("gym", HEAT_GYM, "#D4A843", 27);
        addHeat("soc", HEAT_SOC, "#7878CC", 25);
        setReady(true);
      });

      let raf = 0;
      const bump = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setTick(n => n + 1)); };
      map.on("move", bump);
      map.on("zoom",  bump);
    });

    return () => {
      live = false;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  const project = useCallback(
    (lat: number, lng: number): { x: number; y: number } | null => {
      if (!mapRef.current || !ready) return null;
      const p = mapRef.current.project([lng, lat]);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, tick],
  );

  // Filter visibility
  const showUsers  = filter === "All" || filter === "Athletes" || filter === "Challenges";
  const showCafes  = filter === "All" || filter === "Cafes";
  const showGyms   = filter === "All" || filter === "Gyms";
  const showRecov  = filter === "All" || filter === "Recovery";
  const showZones  = filter === "All" || filter === "Challenges";
  const spotVisible = (type: Spot["type"]) =>
    type === "cafe" ? showCafes : type === "gym" ? showGyms : showRecov;

  // Bottom strip content per filter
  let stripStats: StatItem[];
  let headlines: string[];

  switch (filter) {
    case "Athletes":
      stripStats = [
        { icon: <Users size={13} color="#3DBF6E" />,    label: "Competing",  value: "5 nearby",  color: "#3DBF6E" },
        { icon: <Zap   size={13} color="#D4A843" />,    label: "Top Streak", value: "🔥 21 days", color: "#D4A843" },
        { icon: <Activity size={13} color="#4E88D4" />, label: "Avg Disc",   value: "80 pts",    color: "#4E88D4" },
      ];
      headlines = ["5 athletes competing in this area", "Rohan leading · 21-day streak", "Avg discipline score 80"];
      break;
    case "Cafes":
      stripStats = [
        { icon: <span style={{ fontSize: 12 }}>🥤</span>, label: "Spots",    value: "2 nearby",    color: "#3DBF6E" },
        { icon: <span style={{ fontSize: 12 }}>🫐</span>, label: "Nearest",  value: "Booster Bar", color: "#3DBF6E" },
        { icon: <span style={{ fontSize: 12 }}>✓</span>,  label: "Verified", value: "ELVN pick",   color: "#D4A843" },
      ];
      headlines = ["2 ELVN verified cafés nearby", "Booster Bar · cold-press & protein", "The Press Room · açaí bowls open"];
      break;
    case "Gyms":
      stripStats = [
        { icon: <span style={{ fontSize: 12 }}>🏋️</span>, label: "Gyms",    value: "2 nearby", color: "#D4A843" },
        { icon: <span style={{ fontSize: 12 }}>⚡</span>,  label: "Classes",  value: "8 today",  color: "#D4A843" },
        { icon: <span style={{ fontSize: 12 }}>✓</span>,  label: "Verified", value: "ELVN pick", color: "#3DBF6E" },
      ];
      headlines = ["2 ELVN verified gyms nearby", "8 classes running today", "Grind Theory · elite CrossFit"];
      break;
    case "Challenges":
      stripStats = [
        { icon: <Zap   size={13} color="#D4A843" />,   label: "Zones",      value: "2 active",    color: "#D4A843" },
        { icon: <Users size={13} color="#3DBF6E" />,   label: "Competing",  value: "20 athletes", color: "#3DBF6E" },
        { icon: <Activity size={13} color="#7878CC" />, label: "Prize Pool", value: "₹2.5L",      color: "#7878CC" },
      ];
      headlines = ["2 active challenge zones nearby", "20 athletes competing right now", "₹2.5L in active prize pools"];
      break;
    case "Recovery":
      stripStats = [
        { icon: <span style={{ fontSize: 12 }}>❄️</span>, label: "Spots",   value: "2 nearby",     color: "#7878CC" },
        { icon: <span style={{ fontSize: 12 }}>🧊</span>, label: "Plunge",  value: "Salt Recovery", color: "#7878CC" },
        { icon: <span style={{ fontSize: 12 }}>🧘</span>, label: "Yoga",    value: "Zenveda",       color: "#4E88D4" },
      ];
      headlines = ["2 ELVN recovery spots nearby", "Salt Recovery · cold plunge open", "Zenveda · yoga starts 6:30 pm"];
      break;
    default: // All
      stripStats = [
        { icon: <Users    size={13} color="#3DBF6E" />, label: "Athletes",  value: "5 nearby",     color: "#3DBF6E" },
        { icon: <Zap      size={13} color="#D4A843" />, label: "Hot Zone",  value: "Summer Shred", color: "#D4A843" },
        { icon: <Activity size={13} color="#7878CC" />, label: "Recovery",  value: "3 spots",      color: "#7878CC" },
      ];
      headlines = ["12 athletes active in Andheri", "Summer Shred Zone · 12 competing", "3 recovery spots within 600m"];
  }

  const headline = headlines[hlIdx % headlines.length];

  return (
    <div
      ref={wrapRef}
      style={{ height: "100%", position: "relative", overflow: "hidden", background: "#020306" }}
      onClick={() => { setSelId(null); setSelSpot(null); }}
    >
      {/* Map tiles */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* ── Cinematic atmosphere layers (unchanged) ─────────────────────── */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:2, background:"rgba(2,3,8,0.20)" }} />
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:3, background:"radial-gradient(ellipse 84% 76% at 50% 42%, transparent 28%, rgba(1,2,6,0.70) 100%)" }} />
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:4, background:"radial-gradient(ellipse 52% 46% at 50% 44%, rgba(180,120,30,0.048) 0%, transparent 70%)" }} />
      <div style={{ position:"absolute", inset:-20, pointerEvents:"none", zIndex:5, animation:"ambientDrift 22s ease-in-out infinite",
        background:["radial-gradient(ellipse 48% 38% at 58% 62%, rgba(210,140,50,0.036) 0%, transparent 72%)",
                    "radial-gradient(ellipse 34% 28% at 40% 36%, rgba(70,120,240,0.022) 0%, transparent 72%)"].join(", ") }} />
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:6,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23grain)' opacity='0.14'/%3E%3C/svg%3E")`,
        backgroundRepeat:"repeat", backgroundSize:"200px 200px", opacity:0.055, mixBlendMode:"overlay" as const }} />

      {/* ── Challenge zone overlays ─────────────────────────────────────── */}
      {ready && (
        <div style={{ position:"absolute", inset:0, zIndex:10, pointerEvents:"none",
          opacity: showZones ? 1 : 0, transition:"opacity 0.38s ease" }}>
          {ZONES.map(z => {
            const pos = project(z.lat, z.lng);
            if (!pos) return null;
            return (
              <div key={z.id} style={{ position:"absolute", left:pos.x, top:pos.y }}>
                {/* Ambient glow fill */}
                <div style={{ position:"absolute", width:210, height:210, left:-105, top:-105, borderRadius:"50%",
                  background:`radial-gradient(circle, ${hex2rgba(z.accent, 0.10)} 0%, transparent 62%)`,
                  animation:`zoneBreathe ${4.2 + z.id * 0.6}s ease-in-out infinite` }} />
                {/* Dashed orbit ring */}
                <div style={{ position:"absolute", width:158, height:158, left:-79, top:-79, borderRadius:"50%",
                  border:`1.5px dashed ${hex2rgba(z.accent, 0.36)}`,
                  animation:`zoneOrbit ${3.6 + z.id * 0.5}s ease-in-out infinite` }} />
                {/* Crowd pulse rings */}
                {[0, 1].map(i => (
                  <div key={i} style={{ position:"absolute", width:52, height:52, left:-26, top:-26, borderRadius:"50%",
                    border:`1px solid ${hex2rgba(z.accent, 0.52)}`,
                    animation:`crowdPulse 3.0s ease-out infinite`,
                    animationDelay:`${z.id * 0.7 + i * 1.1}s` }} />
                ))}
                {/* Label chip */}
                <div style={{ position:"absolute", left:"50%", top:88, transform:"translateX(-50%)",
                  display:"flex", alignItems:"center", gap:6, padding:"4px 11px", borderRadius:20,
                  background:"rgba(4,5,9,0.88)", backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
                  border:`1px solid ${hex2rgba(z.accent, 0.28)}`, whiteSpace:"nowrap" as const }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:z.accent,
                    boxShadow:`0 0 6px ${z.accent}`, flexShrink:0, animation:"livePulse 2s ease-in-out infinite" }} />
                  <span style={{ fontSize:"0.5625rem", fontWeight:700, color:z.accent, letterSpacing:"0.04em" }}>
                    {z.name}
                  </span>
                  <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.34)", fontWeight:600 }}>
                    {z.participants}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ELVN verified spot pins ─────────────────────────────────────── */}
      {ready && (
        <div style={{ position:"absolute", inset:0, zIndex:15, pointerEvents:"none" }}>
          {SPOTS.map(s => {
            const pos = project(s.lat, s.lng);
            if (!pos) return null;
            const visible = spotVisible(s.type);
            return (
              <div
                key={s.id}
                style={{ position:"absolute", left:pos.x, top:pos.y,
                  transform:"translate(-50%,-50%)",
                  opacity: visible ? 1 : 0,
                  pointerEvents: visible ? "auto" : "none",
                  transition:"opacity 0.32s ease",
                  zIndex: selSpot === s.id ? 10 : 3,
                }}
              >
                <SpotPin
                  spot={s} active={selSpot === s.id}
                  onTap={e => { e.stopPropagation(); setSelSpot(p => p === s.id ? null : s.id); setSelId(null); }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── User athlete pins ───────────────────────────────────────────── */}
      {ready && (
        <div style={{ position:"absolute", inset:0, zIndex:20, pointerEvents:"none" }}>
          {USERS.map(u => {
            const pos = project(u.lat, u.lng);
            if (!pos) return null;
            return (
              <div
                key={u.id}
                style={{ position:"absolute", left:pos.x, top:pos.y,
                  transform:"translate(-50%,-50%)",
                  opacity: showUsers ? 1 : 0,
                  pointerEvents: showUsers ? "auto" : "none",
                  transition:"opacity 0.32s ease",
                  zIndex: selId === u.id ? 10 : 4,
                }}
              >
                <Pin
                  user={u} active={selId === u.id}
                  invited={invited.has(u.id)}
                  onTap={e => { e.stopPropagation(); setSelId(p => p === u.id ? null : u.id); setSelSpot(null); }}
                  onInvite={e => { e.stopPropagation(); setInvited(p => new Set([...p, u.id])); }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter chips ───────────────────────────────────────────────── */}
      <div style={{ position:"absolute", top:12, left:0, right:0, zIndex:42, pointerEvents:"none",
        display:"flex", justifyContent:"center", padding:"0 16px" }}>
        <div className="no-scrollbar"
          style={{ display:"flex", gap:7, overflowX:"auto", pointerEvents:"auto", padding:"4px 2px" }}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={e => { e.stopPropagation(); setFilter(f.key); }}
                style={{
                  flexShrink:0, display:"flex", alignItems:"center", gap:5,
                  padding:"6px 13px", borderRadius:20,
                  background: active ? "rgba(212,168,67,0.18)" : "rgba(4,5,9,0.82)",
                  backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
                  border:`1px solid ${active ? "rgba(212,168,67,0.42)" : "rgba(255,255,255,0.10)"}`,
                  boxShadow: active
                    ? "0 0 18px rgba(212,168,67,0.16), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "0 2px 12px rgba(0,0,0,0.52)",
                  cursor:"pointer",
                  transform:"scale(1)",
                  transition:"all 0.20s cubic-bezier(.175,.885,.32,1.275)",
                }}
              >
                <span style={{ fontSize:10 }}>{f.emoji}</span>
                <span style={{ fontSize:"0.6875rem", fontWeight: active ? 700 : 500,
                  color: active ? "#D4A843" : "rgba(255,255,255,0.56)", letterSpacing:"0.01em" }}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sheet scrim */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:148, pointerEvents:"none", zIndex:30,
        background:"linear-gradient(to bottom, transparent 0%, rgba(2,3,8,0.48) 44%, rgba(2,3,8,0.97) 100%)" }} />

      {/* ── Bottom info strip ──────────────────────────────────────────── */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:44 }}>
        <div style={{
          background:"rgba(4,5,9,0.97)",
          backdropFilter:"blur(52px)", WebkitBackdropFilter:"blur(52px)",
          borderRadius:"22px 22px 0 0",
          borderTop:"1px solid rgba(201,160,60,0.13)",
          borderLeft:"1px solid rgba(255,255,255,0.04)",
          borderRight:"1px solid rgba(255,255,255,0.04)",
          boxShadow:"0 -8px 32px rgba(0,0,0,0.52)",
        }}>
          {/* Handle */}
          <div style={{ display:"flex", justifyContent:"center", paddingTop:12 }}>
            <div style={{ width:32, height:3, borderRadius:2, background:"rgba(255,255,255,0.11)" }} />
          </div>

          {/* Live headline ticker */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"7px 24px 0" }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"#3DBF6E", flexShrink:0,
              animation:"livePulse 2s ease-in-out infinite" }} />
            <span
              key={`${filter}-${hlIdx}`}
              style={{ fontSize:"0.75rem", fontWeight:600, color:"rgba(255,255,255,0.50)",
                letterSpacing:"-0.01em", animation:"hlIn 0.28s cubic-bezier(.175,.885,.32,1.275) both",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:270 }}
            >
              {headline}
            </span>
          </div>

          {/* Contextual stats */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-around", padding:"10px 28px 20px" }}>
            {stripStats.map((s, i) => (
              <span key={i} style={{ display:"contents" }}>
                <Stat icon={s.icon} label={s.label} value={s.value} color={s.color} />
                {i < stripStats.length - 1 && <Sep />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-top-right { display: none !important; }

        @keyframes ambientDrift {
          0%   { transform: translate(0px, 0px);  }
          30%  { transform: translate(7px, -5px); }
          65%  { transform: translate(-5px, 6px); }
          100% { transform: translate(0px, 0px);  }
        }
        @keyframes breathe {
          0%,100% { opacity:0.88; transform:translate(-50%,-50%) scale(1.00); }
          50%     { opacity:0.26; transform:translate(-50%,-50%) scale(1.30); }
        }
        @keyframes ring {
          0%   { transform:scale(1);   opacity:.52; }
          100% { transform:scale(2.5); opacity:0;   }
        }
        @keyframes ring2 {
          0%   { transform:scale(1);   opacity:.34; }
          100% { transform:scale(2.0); opacity:0;   }
        }
        @keyframes popIn {
          0%   { opacity:0; transform:translateX(-50%) scale(.88) translateY(8px);  }
          60%  { opacity:1; transform:translateX(-50%) scale(1.02) translateY(-1px); }
          100% { opacity:1; transform:translateX(-50%) scale(1.00) translateY(0);   }
        }
        @keyframes popInBelow {
          0%   { opacity:0; transform:translateX(-50%) scale(.88) translateY(-8px); }
          60%  { opacity:1; transform:translateX(-50%) scale(1.02) translateY(1px);  }
          100% { opacity:1; transform:translateX(-50%) scale(1.00) translateY(0);   }
        }
        @keyframes spotPopIn {
          0%   { opacity:0; transform:translateX(-50%) scale(.86) translateY(7px);  }
          60%  { opacity:1; transform:translateX(-50%) scale(1.02) translateY(-1px); }
          100% { opacity:1; transform:translateX(-50%) scale(1.00) translateY(0);   }
        }
        @keyframes spotPopInBelow {
          0%   { opacity:0; transform:translateX(-50%) scale(.86) translateY(-7px); }
          60%  { opacity:1; transform:translateX(-50%) scale(1.02) translateY(1px);  }
          100% { opacity:1; transform:translateX(-50%) scale(1.00) translateY(0);   }
        }
        @keyframes zoneBreathe {
          0%,100% { opacity:0.72; transform:scale(1);    }
          50%     { opacity:1;    transform:scale(1.08); }
        }
        @keyframes zoneOrbit {
          0%,100% { opacity:0.55; transform:scale(1);    }
          50%     { opacity:0.20; transform:scale(1.04); }
        }
        @keyframes crowdPulse {
          0%   { transform:scale(0.5); opacity:0.60; }
          100% { transform:scale(2.6); opacity:0;    }
        }
        @keyframes livePulse {
          0%,100% { opacity:1;    transform:scale(1);    }
          50%     { opacity:0.28; transform:scale(0.72); }
        }
        @keyframes hlIn {
          0%   { opacity:0; transform:translateY(4px); }
          100% { opacity:1; transform:translateY(0);   }
        }
        @keyframes spotGlow {
          0%,100% { box-shadow: var(--sg-base); }
          50%     { box-shadow: var(--sg-bright); }
        }
      `}</style>
    </div>
  );
}

// ─── User pin ─────────────────────────────────────────────────────────────────
function Pin({ user: u, active, invited, onTap, onInvite }: {
  user: User; active: boolean; invited: boolean;
  onTap: (e: React.MouseEvent) => void;
  onInvite: (e: React.MouseEvent) => void;
}) {
  const breathePer = `${2.8 + u.id * 0.40}s`;
  const breatheDel = `${-(u.id * 0.65)}s`;

  return (
    <div style={{ position:"relative" }}>
      {/* Popup */}
      {active && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position:"absolute",
            bottom:"calc(100% + 18px)",
            left:"50%",
            transform:"translateX(-50%)",
            width:204, maxWidth:"calc(100vw - 32px)",
            background:"rgba(5,5,11,0.97)",
            backdropFilter:"blur(56px)", WebkitBackdropFilter:"blur(56px)",
            borderRadius:20, padding:"15px 15px 13px",
            border:`1px solid ${u.accent}2A`,
            boxShadow:[
              "0 28px 72px rgba(0,0,0,0.94)",
              "0 8px 24px rgba(0,0,0,0.72)",
              `0 0 0 1px ${u.accent}14`,
              `0 0 48px ${u.accent}0C`,
            ].join(", "),
            animation:"popIn .32s cubic-bezier(.175,.885,.32,1.275) both",
            zIndex:20,
          }}
        >
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ position:"relative", flexShrink:0, width:42, height:42, borderRadius:"50%",
              background:u.avatarBg, border:`2px solid ${u.accent}CC`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:".6875rem", fontWeight:700, color:"#fff", letterSpacing:".03em",
              boxShadow:`0 0 18px ${u.accent}28, 0 0 0 3.5px ${u.accent}10` }}>
              {u.initials}
              <div style={{ position:"absolute", bottom:-2, right:-2, width:16, height:16, borderRadius:"50%",
                background:"#05050C", border:`1.5px solid ${u.accent}50`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, lineHeight:1 }}>
                {ACTIVITY_EMOJI[u.activity]}
              </div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:".9375rem", fontWeight:700, color:"#fff", letterSpacing:"-.025em", lineHeight:1.15, margin:0 }}>
                {u.name}
              </p>
              <p style={{ fontSize:".6875rem", color:u.accent, marginTop:2, opacity:.86, margin:0 }}>
                {ACTIVITY_EMOJI[u.activity]} {u.activity}
              </p>
              {/* Challenge chip */}
              <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:4,
                padding:"2px 8px", borderRadius:20,
                background:`${u.accent}10`, border:`1px solid ${u.accent}22` }}>
                <span style={{ fontSize:7 }}>🔥</span>
                <span style={{ fontSize:".5rem", fontWeight:700, color:u.accent, letterSpacing:"0.04em" }}>
                  {u.challenge}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
            padding:"9px 0", marginBottom:9,
            borderTop:"1px solid rgba(255,255,255,0.05)",
            borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <PStat label="Streak"  value={`🔥 ${u.streak}d`}   color="#D46A30" />
            <PStat label="Disc"    value={`${u.discScore}`}     color={u.accent} />
            <PStat label="km"      value={`${u.km} km`}         color="rgba(255,255,255,.60)" />
          </div>

          {/* Recent activity */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10,
            padding:"7px 10px", borderRadius:10,
            background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize:10 }}>{ACTIVITY_EMOJI[u.activity]}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:".6875rem", color:"rgba(255,255,255,0.68)", lineHeight:1.2,
                display:"block", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {u.recentAct}
              </span>
            </div>
            <span style={{ fontSize:".5rem", color:"rgba(255,255,255,0.26)", flexShrink:0 }}>{u.recentTime}</span>
          </div>

          {/* Invite CTA */}
          <button
            onClick={onInvite} disabled={invited}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              padding:"9px 0", borderRadius:11,
              border:`1px solid ${invited ? "rgba(61,191,110,.26)" : `${u.accent}30`}`,
              background: invited ? "rgba(61,191,110,.06)" : `${u.accent}0C`,
              boxShadow: invited ? "0 0 16px rgba(61,191,110,.09)" : `0 0 16px ${u.accent}10`,
              cursor: invited ? "default" : "pointer",
              transition:"all .28s cubic-bezier(.4,0,.2,1)",
            }}
          >
            {invited ? <Check size={11} style={{ color:"#3DBF6E", strokeWidth:2.5 }} /> : <span style={{ fontSize:10 }}>⚡</span>}
            <span style={{ fontSize:".625rem", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" as const,
              color: invited ? "#3DBF6E" : u.accent, transition:"color .28s ease" }}>
              {invited ? "Invite Sent" : "Invite to Challenge"}
            </span>
          </button>

          {/* Popup tail */}
          <div style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
            borderLeft:"6px solid transparent", borderRight:"6px solid transparent",
            borderTop:"6px solid rgba(5,5,11,0.97)", width:0, height:0 }} />
        </div>
      )}

      {/* Sonar rings */}
      {active && (
        <>
          <div style={{ position:"absolute", inset:-8, borderRadius:"50%",
            border:`1.5px solid ${u.accent}52`, animation:"ring 2.6s ease-out infinite", pointerEvents:"none" }} />
          <div style={{ position:"absolute", inset:-6, borderRadius:"50%",
            border:`1px solid ${u.accent}36`, animation:"ring2 2.6s ease-out infinite .88s", pointerEvents:"none" }} />
        </>
      )}

      {/* Ambient glow field */}
      <div style={{ position:"absolute", left:"50%", top:"50%",
        width:110, height:110, borderRadius:"50%",
        background:`radial-gradient(circle, ${u.accent}07 0%, transparent 70%)`,
        transform:"translate(-50%,-50%)", pointerEvents:"none" }} />

      {/* Breathing aura */}
      <div style={{ position:"absolute", left:"50%", top:"50%",
        width: active ? 84 : 68, height: active ? 84 : 68, borderRadius:"50%",
        background:`radial-gradient(circle, ${u.accent}${active ? "22" : "14"} 0%, transparent 68%)`,
        animation: active ? "none" : `breathe ${breathePer} ease-in-out infinite`,
        animationDelay: active ? "0s" : breatheDel,
        transform:"translate(-50%,-50%)",
        transition:"width .30s ease, height .30s ease",
        pointerEvents:"none" }} />

      {/* Avatar */}
      <div
        onClick={onTap}
        style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
          width:44, height:44, borderRadius:"50%",
          background:u.avatarBg,
          border:`2px solid ${u.accent}${active ? "EE" : "72"}`,
          boxShadow: active
            ? [`0 0 0 4px ${u.accent}1E`, `0 0 0 7.5px ${u.accent}09`, `0 6px 22px rgba(0,0,0,.88)`, `0 0 26px ${u.accent}28`].join(", ")
            : [`0 0 0 2px ${u.accent}0C`, `0 4px 14px rgba(0,0,0,.75)`].join(", "),
          fontSize:".6875rem", fontWeight:700, color:"#fff", letterSpacing:".03em",
          cursor:"pointer",
          transform: active ? "scale(1.16)" : "scale(1)",
          transition:["transform .28s cubic-bezier(.175,.885,.32,1.275)","box-shadow .28s ease","border-color .28s ease"].join(", "),
          zIndex:2 }}
      >
        {u.initials}
        <div style={{ position:"absolute", bottom:-2, right:-2, width:15, height:15, borderRadius:"50%",
          background:"#030508", border:`1.5px solid ${u.accent}${active ? "52" : "38"}`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:7.5, lineHeight:1,
          transition:"border-color .28s ease" }}>
          {ACTIVITY_EMOJI[u.activity]}
        </div>
      </div>
    </div>
  );
}

// ─── ELVN Verified Spot pin ───────────────────────────────────────────────────
function SpotPin({ spot: s, active, onTap }: {
  spot: Spot; active: boolean;
  onTap: (e: React.MouseEvent) => void;
}) {
  const typeClr: Record<Spot["type"], string> = {
    cafe:     "#3DBF6E",
    gym:      "#D4A843",
    recovery: "#7878CC",
  };
  const clr = typeClr[s.type];

  return (
    <div style={{ position:"relative" }}>
      {/* Popup */}
      {active && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position:"absolute",
            bottom:"calc(100% + 14px)",
            left:"50%",
            transform:"translateX(-50%)",
            width:192, maxWidth:"calc(100vw - 32px)",
            background:"rgba(5,5,11,0.97)",
            backdropFilter:"blur(56px)", WebkitBackdropFilter:"blur(56px)",
            borderRadius:18, padding:"13px 14px 12px",
            border:`1px solid ${hex2rgba(clr, 0.26)}`,
            boxShadow:[
              "0 24px 64px rgba(0,0,0,0.92)",
              "0 6px 20px rgba(0,0,0,0.70)",
              `0 0 0 1px ${hex2rgba(clr, 0.10)}`,
              `0 0 40px ${hex2rgba(clr, 0.08)}`,
            ].join(", "),
            animation:"spotPopIn .30s cubic-bezier(.175,.885,.32,1.275) both",
            zIndex:20,
          }}
        >
          {/* Badges row */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <span style={{ padding:"3px 9px", borderRadius:20,
              background:hex2rgba(clr, 0.13), border:`1px solid ${hex2rgba(clr, 0.30)}`,
              fontSize:".5rem", fontWeight:700, color:clr, letterSpacing:"0.08em", textTransform:"uppercase" as const }}>
              {SPOT_TYPE_LABEL[s.type]}
            </span>
            <span style={{ display:"flex", alignItems:"center", gap:3, padding:"3px 8px", borderRadius:20,
              background:"rgba(212,168,67,0.10)", border:"1px solid rgba(212,168,67,0.26)",
              fontSize:".5rem", fontWeight:700, color:"#D4A843", letterSpacing:"0.06em" }}>
              ✓ ELVN
            </span>
          </div>

          {/* Name */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:20 }}>{s.emoji}</span>
            <p style={{ fontSize:".9375rem", fontWeight:700, color:"#fff", letterSpacing:"-.025em", lineHeight:1.1, margin:0 }}>
              {s.name}
            </p>
          </div>

          {/* Tagline */}
          <p style={{ fontSize:".6875rem", color:"rgba(255,255,255,0.46)", margin:"0 0 10px", lineHeight:1.45 }}>
            {s.tagline}
          </p>

          {/* Tags */}
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:5 }}>
            {s.tags.map(tag => (
              <span key={tag} style={{ padding:"3px 8px", borderRadius:20,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)",
                fontSize:".5rem", fontWeight:600, color:"rgba(255,255,255,0.46)", letterSpacing:"0.04em" }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Popup tail */}
          <div style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
            borderLeft:"6px solid transparent", borderRight:"6px solid transparent",
            borderTop:"6px solid rgba(5,5,11,0.97)", width:0, height:0 }} />
        </div>
      )}

      {/* Ambient halo */}
      <div style={{ position:"absolute", left:"50%", top:"50%",
        width:72, height:72, borderRadius:"50%",
        background:`radial-gradient(circle, ${hex2rgba(clr, active ? 0.16 : 0.08)} 0%, transparent 70%)`,
        transform:"translate(-50%,-50%)", pointerEvents:"none",
        transition:"background 0.25s ease" }} />

      {/* Marker body — rounded square, distinct from circular user pins */}
      <div
        onClick={onTap}
        style={{
          position:"relative", width:30, height:30, borderRadius:7,
          background: active ? hex2rgba(clr, 0.22) : "rgba(4,5,9,0.92)",
          border:`1.5px solid ${hex2rgba(clr, active ? 0.80 : 0.48)}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, cursor:"pointer",
          boxShadow: active
            ? `0 0 0 3px ${hex2rgba(clr, 0.18)}, 0 0 20px ${hex2rgba(clr, 0.28)}, 0 3px 12px rgba(0,0,0,0.80)`
            : `0 0 12px ${hex2rgba(clr, 0.16)}, 0 2px 8px rgba(0,0,0,0.72)`,
          transform: active ? "scale(1.14)" : "scale(1)",
          transition:"transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .25s ease, border-color .25s ease, background .25s ease",
          zIndex:2,
        }}
      >
        {s.emoji}
        {/* ELVN verified dot */}
        <div style={{ position:"absolute", top:-3, right:-3, width:9, height:9, borderRadius:"50%",
          background:"#D4A843",
          border:"1.5px solid rgba(4,5,9,0.95)",
          boxShadow:"0 0 6px rgba(212,168,67,0.55)" }} />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function PStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <span style={{ fontSize:".4875rem", fontWeight:600, letterSpacing:".10em", textTransform:"uppercase" as const, color:"rgba(255,255,255,.22)" }}>
        {label}
      </span>
      <span style={{ fontSize:".875rem", fontWeight:800, color, letterSpacing:"-.02em", lineHeight:1 }}>
        {value}
      </span>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        {icon}
        <span style={{ fontSize:".9375rem", fontWeight:700, color, letterSpacing:"-.025em", lineHeight:1 }}>{value}</span>
      </div>
      <span style={{ fontSize:".5rem", fontWeight:600, letterSpacing:".10em", textTransform:"uppercase" as const, color:"rgba(255,255,255,.22)" }}>
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return <div style={{ width:1, height:26, background:"rgba(255,255,255,0.05)" }} />;
}
