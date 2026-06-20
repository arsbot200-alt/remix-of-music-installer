import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export function PlayBadge({ trackId, size = 36 }: { trackId: string; size?: number }) {
  const { current, isPlaying } = usePlayer();
  const active = current?.id === trackId && isPlaying;
  return (
    <span
      className="grid place-items-center rounded-full bg-foreground text-background shadow-glow"
      style={{ width: size, height: size }}
    >
      {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
    </span>
  );
}
