"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { usePathname } from "next/navigation";

export default function CameraFAB() {
  const pathname = usePathname();
  if (pathname === "/welcome" || pathname === "/auth") return null;

  return (
    <Link
      href="/camera"
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #E2BE74 0%, #C9A84C 100%)",
        boxShadow:
          "0 0 0 2px rgba(255,255,255,0.15), 0 4px 16px rgba(201,168,76,0.50), 0 2px 6px rgba(0,0,0,0.8)",
      }}
    >
      <Camera size={24} style={{ color: "#000", strokeWidth: 2.2 }} />
    </Link>
  );
}
