import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "./MiniPlayer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto min-h-screen max-w-md overflow-x-hidden pb-40">
      {children}
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
