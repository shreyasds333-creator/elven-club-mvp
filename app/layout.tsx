import "./globals.css";
import BottomNav from "./components/BottomNav";
import CameraFAB from "./components/CameraFAB";
import TopBar from "./components/TopBar";
import SessionGate from "./components/SessionGate";
import WalkthroughOverlay from "./components/WalkthroughOverlay";
import { AppProvider } from "@/lib/appStore";
import { AuthProvider } from "@/lib/authStore";
import type { Viewport } from "next";

export const metadata = {
  title: "ELVN CLUB",
  description: "Fitness Accountability App — stake coins, prove daily, win prizes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ELVN",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppProvider>
            <SessionGate>
              <TopBar />
              <main className="main-content">
                {children}
              </main>
              <CameraFAB />
              <BottomNav />
              <WalkthroughOverlay />
            </SessionGate>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
