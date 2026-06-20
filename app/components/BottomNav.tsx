"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Trophy, User, Wallet } from "lucide-react";
import { color, radius, motion } from "@/lib/tokens";

const TABS = [
  { href: "/feed",       label: "Activity",   Icon: Zap    },
  { href: "/challenges", label: "Challenges", Icon: Trophy },
  { href: "/camera",     label: "",           Icon: null   },
  { href: "/profile",    label: "Profile",    Icon: User   },
  { href: "/wallet",     label: "Wallet",     Icon: Wallet },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/welcome" || pathname === "/auth") return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderRadius: "20px 20px 0 0",
        background: "rgba(7,7,10,0.96)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderBottom: "none",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.03) inset",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ── Tab row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingTop: 10,
          paddingLeft: 6,
          paddingRight: 6,
          maxWidth: 500,
          margin: "0 auto",
        }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const isActive = href === "/challenges" ? pathname.startsWith("/challenges") : pathname === href;
          const isCamera = href === "/camera";

          /* ── Center spacer for camera slot ── */
          if (isCamera) {
            return <div key={href} style={{ width: 56, flexShrink: 0 }} />;
          }

          /* ── Regular tab ── */
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 12px 7px",
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
                borderRadius: radius.sm,
                textDecoration: "none",
                opacity: isActive ? 1 : 0.38,
                background: isActive ? "rgba(201,168,76,0.08)" : "transparent",
                border: isActive ? "1px solid rgba(201,168,76,0.15)" : "1px solid transparent",
                transition: `opacity ${motion.fast}, background ${motion.fast}`,
              }}
            >
              <Icon
                size={20}
                style={{
                  color: isActive ? color.gold.base : "#fff",
                  strokeWidth: isActive ? 2 : 1.5,
                  display: "block",
                }}
              />
              {isActive && (
                <span
                  style={{
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: color.gold.base,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
