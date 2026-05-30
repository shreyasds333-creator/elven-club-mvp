"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/authStore";

// Routes that don't require a session
const PUBLIC = new Set(["/", "/welcome", "/auth"]);

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user && !PUBLIC.has(pathname)) {
      router.replace("/auth");
    }
  }, [user, isLoading, pathname, router]);

  // Black screen while checking — prevents flash of protected content
  if (isLoading) {
    return <div style={{ position: "fixed", inset: 0, background: "#000" }} />;
  }

  return <>{children}</>;
}
