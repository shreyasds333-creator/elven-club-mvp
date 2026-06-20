"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/appStore";

export default function ActionErrorToast() {
  const { actionError, clearActionError } = useAppStore();

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(clearActionError, 4000);
    return () => clearTimeout(t);
  }, [actionError, clearActionError]);

  if (!actionError) return null;

  return (
    <div
      onClick={clearActionError}
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 56px)",
        left: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(20, 4, 4, 0.96)",
        border: "1px solid rgba(255, 60, 60, 0.38)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,60,60,0.10)",
        backdropFilter: "blur(16px)",
        cursor: "pointer",
        animation: "toastSlideDown 0.28s cubic-bezier(.175,.885,.32,1.275) both",
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,120,120,0.92)", lineHeight: 1.4, flex: 1 }}>
        {actionError}
      </span>
      <span style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>tap to dismiss</span>
      <style>{`
        @keyframes toastSlideDown {
          0%   { opacity: 0; transform: translateY(-12px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
}
