"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapGL, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { MAP_PINS, MAP_CENTER, PIN_COLOR, type PinType, type MapPin } from "@/lib/mapData";
import { color, radius } from "@/lib/tokens";

interface Props {
  filter: PinType | "all";
  onPinSelect?: (id: string | null) => void;
}

type MarkerRecord = { el: HTMLDivElement; pin: MapPin };

interface CardPos {
  x: number;
  y: number;
  showBelow: boolean;
}

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARD_W = 224;
const CARD_H = 154;
const CARD_GAP = 26; // px gap between pin center and card edge

export default function MapComponent({ filter, onPinSelect }: Props) {
  const router        = useRouter();
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<MapGL | null>(null);
  const markersRef    = useRef<Record<string, MarkerRecord>>({});
  const selPinRef     = useRef<MapPin | null>(null); // stable ref for event closures

  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [cardPos,     setCardPos]     = useState<CardPos | null>(null);

  // ── Stable action refs (updated every render → no stale closures) ────────────
  const onPinSelectRef = useRef(onPinSelect);
  onPinSelectRef.current = onPinSelect;

  const actionsRef = useRef({
    select: (_pin: MapPin) => {},
    deselect: () => {},
  });

  // Re-define actions on every render so they always close over fresh state setters
  actionsRef.current.select = (pin: MapPin) => {
    const map = mapRef.current;
    if (!map) return;

    // Subtle haptic
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);

    // Smooth pan toward pin (offset so pin appears slightly below center, card fits above)
    map.flyTo({
      center: [pin.lng, pin.lat],
      duration: 440,
      curve: 1,
      offset: [0, 50] as [number, number],
    });

    selPinRef.current = pin;
    setSelectedPin(pin);
    onPinSelectRef.current?.(pin.id);

    // Compute card position after fly settles
    setTimeout(() => {
      if (!mapRef.current || !containerRef.current) return;
      const pos = computeCardPos(mapRef.current, containerRef.current, pin);
      setCardPos(pos);
    }, 460);

    // Also set an immediate position so card can appear right away
    const pos = computeCardPos(map, containerRef.current!, pin);
    setCardPos(pos);
  };

  actionsRef.current.deselect = () => {
    selPinRef.current = null;
    setSelectedPin(null);
    setCardPos(null);
    onPinSelectRef.current?.(null);
  };

  // ── Initialize map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapGL({
      container: containerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: 13.5,
      attributionControl: false,
      maplibreLogo: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // "You are here" dot
      new Marker({ element: buildYouEl(), anchor: "center" })
        .setLngLat(MAP_CENTER)
        .addTo(map);

      MAP_PINS.forEach((pin) => {
        const el = buildPinEl(pin);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          actionsRef.current.select(pin);
        });
        new Marker({ element: el, anchor: "center" })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
        markersRef.current[pin.id] = { el, pin };
      });
    });

    // Click empty map → deselect
    map.on("click", () => actionsRef.current.deselect());

    // Track pin screen position as map moves
    map.on("move", () => {
      if (!selPinRef.current || !containerRef.current) return;
      const pos = computeCardPos(map, containerRef.current, selPinRef.current);
      setCardPos(pos);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply visibility + selection highlight to marker DOM ─────────────────────
  useEffect(() => {
    const hasSel = selectedPin !== null;
    Object.entries(markersRef.current).forEach(([id, { el, pin }]) => {
      const show  = filter === "all" || pin.type === filter;
      const isSel = id === selectedPin?.id;
      el.style.opacity   = !show ? "0.08" : hasSel && !isSel ? "0.28" : "1";
      el.style.transform = isSel ? "scale(1.22) translateY(-2px)" : "scale(1)";
      el.style.filter    = isSel ? `drop-shadow(0 4px 18px ${PIN_COLOR[pin.type]}bb)` : "none";
      el.style.zIndex    = isSel ? "20" : "5";
    });
  }, [filter, selectedPin]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {/* MapLibre renders into this div */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Floating card — positioned using map screen coordinates */}
      <AnimatePresence>
        {selectedPin && cardPos && (
          <FloatingCard
            key={selectedPin.id}
            pin={selectedPin}
            pos={cardPos}
            onClose={() => actionsRef.current.deselect()}
            onViewProfile={() => router.push("/profile")}
          />
        )}
      </AnimatePresence>

      <style>{`
        .maplibregl-ctrl-attrib,
        .maplibregl-ctrl-logo,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-bottom-left { display: none !important; }

        @keyframes mapPing {
          0%   { opacity: 0.65; transform: scale(1);    }
          70%  { opacity: 0;    transform: scale(2.80); }
          100% { opacity: 0;    transform: scale(2.80); }
        }
        @keyframes youPing {
          0%   { opacity: 0.45; transform: scale(1);    }
          70%  { opacity: 0;    transform: scale(2.45); }
          100% { opacity: 0;    transform: scale(2.45); }
        }
      `}</style>
    </div>
  );
}

// ── Compute card screen position with edge-case clamping ──────────────────────
function computeCardPos(map: MapGL, container: HTMLElement, pin: MapPin): CardPos {
  const pt = map.project([pin.lng, pin.lat]);
  const cw = container.clientWidth;
  const ch = container.clientHeight;

  // Clamp x so card doesn't overflow left/right
  const x = Math.max(CARD_W / 2 + 8, Math.min(pt.x, cw - CARD_W / 2 - 8));

  // Show below pin if not enough room above
  const showBelow = pt.y - CARD_GAP - CARD_H < 8;

  // Clamp y for below case
  const y = showBelow
    ? Math.min(pt.y + CARD_GAP, ch - CARD_H - 8)
    : pt.y - CARD_GAP;

  return { x, y, showBelow };
}

// ── Floating glassmorphism card ────────────────────────────────────────────────
interface FloatingCardProps {
  pin: MapPin;
  pos: CardPos;
  onClose: () => void;
  onViewProfile: () => void;
}

function FloatingCard({ pin, pos, onClose, onViewProfile }: FloatingCardProps) {
  const c      = PIN_COLOR[pin.type];
  const isUser = pin.type === "user";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: pos.showBelow ? -10 : 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.82, y: pos.showBelow ? -8 : 8 }}
      transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.7 }}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        // Anchor: center-bottom when above pin; center-top when below
        transform: pos.showBelow ? "translateX(-50%)" : "translate(-50%, -100%)",
        width: CARD_W,
        zIndex: 50,
        pointerEvents: "auto",
      }}
    >
      {/* Arrow pointing toward the pin */}
      <Arrow showBelow={pos.showBelow} color={c} />

      {/* Card body */}
      <div style={{
        background: "rgba(6, 6, 8, 0.90)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: `1px solid ${c}28`,
        borderRadius: 18,
        padding: "14px 15px 13px",
        boxShadow: `0 8px 40px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        order: pos.showBelow ? -1 : 0,
      }}>
        {isUser ? (
          <UserCardContent pin={pin} onViewProfile={onViewProfile} />
        ) : (
          <PlaceCardContent pin={pin} onViewProfile={onViewProfile} />
        )}
      </div>
    </motion.div>
  );
}

// Arrow triangle between card and pin
function Arrow({ showBelow, color: c }: { showBelow: boolean; color: string }) {
  const base = {
    position: "absolute" as const,
    left: "50%",
    transform: "translateX(-50%)",
    width: 0, height: 0,
    zIndex: 1,
  };

  if (showBelow) {
    // Arrow at top of card, points up toward pin
    return (
      <div style={{
        ...base,
        top: -6,
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderBottom: `7px solid ${c}28`,
      }} />
    );
  }
  // Arrow at bottom of card, points down toward pin
  return (
    <div style={{
      ...base,
      bottom: -6,
      borderLeft: "7px solid transparent",
      borderRight: "7px solid transparent",
      borderTop: `7px solid ${c}28`,
    }} />
  );
}

// ── User pin card content ─────────────────────────────────────────────────────
function UserCardContent({ pin, onViewProfile }: { pin: MapPin; onViewProfile: () => void }) {
  const c = PIN_COLOR.user;

  return (
    <>
      {/* Row 1: Avatar + name + live badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: pin.isLive ? "rgba(77,200,122,0.15)" : "rgba(77,200,122,0.07)",
          border: `2px solid ${pin.isLive ? c : `${c}55`}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.5625rem", fontWeight: 800, color: "#fff",
          boxShadow: pin.isLive ? `0 0 12px ${c}44` : "none",
        }}>
          {pin.label}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: color.text.primary, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {pin.name}
            </span>
            {pin.isLive && (
              <span style={{
                fontSize: "0.3125rem", fontWeight: 800, letterSpacing: "0.08em", lineHeight: 1,
                color: "#4DC87A", background: "rgba(77,200,122,0.12)",
                border: "1px solid rgba(77,200,122,0.28)",
                borderRadius: radius.full, padding: "2px 6px",
              }}>
                LIVE
              </span>
            )}
          </div>
          {/* Activity */}
          <span style={{ fontSize: "0.625rem", color: color.text.secondary, lineHeight: 1 }}>
            {pin.activity}
          </span>
        </div>
      </div>

      {/* Row 2: Meta chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
        {pin.distanceKm != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>📍</span>
            <span style={{ fontSize: "0.5625rem", fontWeight: 500, color: color.text.secondary }}>
              {pin.distanceKm} km away
            </span>
          </div>
        )}
        {pin.streakDays != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.5625rem" }}>🔥</span>
            <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: "#C9A84C" }}>
              {pin.streakDays} day streak
            </span>
          </div>
        )}
      </div>

      {/* View Profile CTA */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onViewProfile}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 11,
          background: "rgba(77,200,122,0.10)",
          border: "1px solid rgba(77,200,122,0.24)",
          color: "#4DC87A",
          fontSize: "0.6875rem", fontWeight: 700,
          cursor: "pointer",
          transition: "background 0.16s ease",
        }}
      >
        View Profile
      </motion.button>
    </>
  );
}

// ── Place pin card content ────────────────────────────────────────────────────
function PlaceCardContent({ pin, onViewProfile }: { pin: MapPin; onViewProfile: () => void }) {
  const c    = PIN_COLOR[pin.type];
  const name = pin.detail?.split("·")[0].trim() ?? pin.label;
  const rest = pin.detail?.split("·").slice(1).join("·").trim();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${c}14`, border: `1.5px solid ${c}44`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          {pin.label}
        </div>
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: 700, color: color.text.primary, letterSpacing: "-0.015em", marginBottom: 2 }}>
            {name}
          </div>
          {rest && (
            <span style={{ fontSize: "0.5625rem", color: color.text.muted }}>{rest}</span>
          )}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onViewProfile}
        style={{
          width: "100%", padding: "8px 0", borderRadius: 11,
          background: `${c}10`, border: `1px solid ${c}30`,
          color: c, fontSize: "0.6875rem", fontWeight: 700,
          cursor: "pointer", transition: "background 0.16s ease",
        }}
      >
        Get Directions
      </motion.button>
    </>
  );
}

// ── Marker DOM builders ────────────────────────────────────────────────────────

function buildYouEl(): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;width:14px;height:14px;cursor:default;z-index:30;";

  const ring = document.createElement("div");
  ring.style.cssText =
    "position:absolute;inset:-9px;border-radius:50%;" +
    "border:1.5px solid rgba(255,255,255,0.36);" +
    "animation:youPing 2.8s ease-out infinite;pointer-events:none;";
  wrap.appendChild(ring);

  const dot = document.createElement("div");
  dot.style.cssText =
    "width:14px;height:14px;border-radius:50%;background:#fff;" +
    "box-shadow:0 0 0 3px rgba(255,255,255,0.18),0 0 18px rgba(255,255,255,0.44);";
  wrap.appendChild(dot);

  return wrap;
}

function buildPinEl(pin: MapPin): HTMLDivElement {
  const c      = PIN_COLOR[pin.type];
  const isUser = pin.type === "user";
  const isLive = isUser && !!pin.isLive;
  const size   = isUser ? 28 : 32;
  const br     = isUser ? "50%" : "9px";

  const wrap = document.createElement("div");
  wrap.style.cssText =
    `position:relative;width:${size}px;height:${size}px;cursor:pointer;` +
    "transition:transform 0.24s cubic-bezier(.175,.885,.32,1.275)," +
    "filter 0.20s ease,opacity 0.20s ease;";

  if (isLive) {
    const ring = document.createElement("div");
    ring.style.cssText =
      "position:absolute;inset:-7px;border-radius:50%;" +
      `border:1.5px solid ${c};` +
      `animation:mapPing 2.4s ease-out infinite;` +
      `animation-delay:${(Math.random() * 1.4).toFixed(2)}s;` +
      "pointer-events:none;";
    wrap.appendChild(ring);
  }

  const inner = document.createElement("div");
  inner.style.cssText =
    `width:${size}px;height:${size}px;border-radius:${br};` +
    `background:${isLive ? "rgba(77,200,122,0.14)" : `${c}18`};` +
    `border:${isLive ? `2px solid ${c}` : `1.5px solid ${c}66`};` +
    "display:flex;align-items:center;justify-content:center;" +
    `font-size:${isUser ? "8px" : "13px"};font-weight:800;color:#fff;` +
    "box-shadow:0 2px 8px rgba(0,0,0,0.65);" +
    "position:relative;z-index:1;" +
    "user-select:none;-webkit-user-select:none;";
  inner.textContent = pin.label;
  wrap.appendChild(inner);

  return wrap;
}
