"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authStore";

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      // Active session — go straight to app
      router.replace("/challenges");
      return;
    }

    // No session — check whether they've seen onboarding
    const onboarded = localStorage.getItem("elvn_onboarding") === "1";
    router.replace(onboarded ? "/auth" : "/welcome");
  }, [user, isLoading, router]);

  return <div style={{ position: "fixed", inset: 0, background: "#000" }} />;
}
