import { Link } from "@tanstack/react-router";
import { Pause, Play, Loader2, Heart, Moon, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { FastImage } from "./FastImage";

export function MiniPlayer() {
  const { current, isPlaying, loading, toggle, position, duration, toggleLike, isLiked, sleepTimer, loopMode, clear } = usePlayer();
  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  const sleepMinsLeft = sleepTimer ? Math.max(0, Math.round((sleepTimer - Date.now()) / 60000)) : null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+58px)] z-30 px-3 miniplayer-enter">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl glass shadow-card border border-border/50">
        {/* Animated progress bar */}
        <div className="h-[3px] bg-surface-2">
          <div
            className="h-full bg-gradient-primary transition-[width] duration-300 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 p-2.5">
          <Link to="/player" className="flex flex-1 items-center gap-3 min-w-0">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2 shadow-card">
              {current.thumbnail ? (
                <FastImage src={current.thumbnail} alt="" eager sizes="44px" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{current.title}</p>
              <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
            </div>
          </Link>
          {sleepTimer && (
            <div className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
              <Moon className="h-3 w-3" />
              {sleepMinsLeft}m
            </div>
          )}
          {loopMode !== "off" && (
            <span className="text-[10px] font-bold text-primary">{loopMode === "one" ? "1×" : "∞"}</span>
          )}
          <button
            onClick={() => toggleLike()}
            aria-label="Like"
            className="p-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart className={`h-5 w-5 transition-all duration-200 ${isLiked(current.id) ? "fill-primary text-primary scale-110" : ""}`} />
          </button>
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>
          <button
            onClick={clear}
            aria-label="Close Player"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
