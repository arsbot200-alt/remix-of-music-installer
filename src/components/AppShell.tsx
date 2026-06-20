import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "./MiniPlayer";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="relative mx-auto min-h-screen max-w-md overflow-x-hidden pb-40">
      {/* Re-mount per path so the fade replays on every navigation */}
      <div key={location.pathname} className="route-fade">
        {children}
      </div>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
