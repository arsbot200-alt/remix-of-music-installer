import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { FastImage } from "@/components/FastImage";
import { DownloadButton } from "@/components/DownloadIndicator";
import {
  ChevronDown,
  Heart,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Moon,
  AlignLeft,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";

export const Route = createFileRoute("/player")({
  head: () => ({
    meta: [
      { title: "Now Playing · ArsMusic" },
      { name: "description", content: "Now playing on ArsMusic." },
    ],
  }),
  component: Player,
  errorComponent: ({ error }) => <div className="p-6">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const SLEEP_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];

function Player() {
  const router = useRouter();
  const { current, isPlaying, loading, position, duration, toggle, next, prev, seek, toggleLike, isLiked, error, upNext, play, loopMode, toggleLoop, sleepTimer, setSleepTimer, downloads, downloadTrack, removeDownload, clear, volume, setVolume } = usePlayer();
  const [sleepOpen, setSleepOpen] = useState(false);

  if (!current) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-muted-foreground">Nothing's playing yet.</p>
          <button onClick={() => router.history.back()} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const sleepMinsLeft = sleepTimer ? Math.max(0, Math.round((sleepTimer - Date.now()) / 60000)) : null;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: current.thumbnail
          ? `linear-gradient(180deg, color-mix(in oklab, var(--background) 30%, transparent), var(--background) 70%), url(${current.thumbnail}) center/cover`
          : undefined,
      }}
    >
      <div className="absolute inset-0 backdrop-blur-2xl bg-background/40" />
      <div className="relative flex min-h-screen flex-col px-6 pb-10 pt-[max(env(safe-area-inset-top),1rem)]">
        <header className="flex items-center justify-between">
          <button onClick={() => router.history.back()} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface/60">
            <ChevronDown className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Playing from</p>
            <p className="text-sm font-semibold">ArsMusic</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSleepOpen(true)}
              aria-label="Sleep Timer"
              className={`relative grid h-9 w-9 place-items-center rounded-full bg-surface/60 ${sleepTimer ? "text-primary" : ""}`}
            >
              <Moon className="h-5 w-5" />
              {sleepTimer && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-primary">{sleepMinsLeft}m</span>}
            </button>
            <button
              onClick={() => { clear(); router.history.back(); }}
              aria-label="Cancel Playback"
              className="grid h-9 w-9 place-items-center rounded-full bg-surface/60 hover:bg-destructive/20 hover:text-destructive transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="mt-8 flex justify-center">
          <div className="aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-surface shadow-glow">
            <FastImage src={current.thumbnail} alt="" eager sizes="320px" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="mt-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold">{current.title}</h1>
            <p className="truncate text-sm text-muted-foreground">{current.artist}</p>
          </div>
          <button onClick={() => toggleLike()} aria-label="Like" className="shrink-0 p-2">
            <Heart className={`h-7 w-7 ${isLiked(current.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>

        <div className="mt-6">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={position}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{fmt(position)}</span>
            <span>-{fmt((duration || 0) - position)}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button aria-label="Shuffle" className="text-muted-foreground"><Shuffle className="h-5 w-5" /></button>
          <button onClick={prev} aria-label="Previous"><SkipBack className="h-7 w-7 fill-foreground" /></button>
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-16 w-16 place-items-center rounded-full bg-foreground text-background shadow-glow"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-[2px]" />}
          </button>
          <button onClick={next} aria-label="Next"><SkipForward className="h-7 w-7 fill-foreground" /></button>
          <button onClick={toggleLoop} aria-label="Repeat" className={`relative ${loopMode !== "off" ? "text-primary" : "text-muted-foreground"}`}>
            <Repeat className="h-5 w-5" />
            {loopMode === "one" && <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold">1</span>}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="mt-8 flex items-center gap-3">
          <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-muted-foreground">
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-full flex-1 appearance-none rounded-full bg-surface-2 accent-primary"
            style={{
              background: `linear-gradient(to right, var(--primary) ${volume * 100}%, var(--surface-2) ${volume * 100}%)`
            }}
          />
        </div>

        <div className="mt-8 flex justify-around text-xs text-muted-foreground">
          <DownloadButton
            status={downloads[current.id]?.status || "idle"}
            progress={downloads[current.id]?.progress || 0}
            onClick={() => {
              if (downloads[current.id]?.status === "completed") {
                removeDownload(current.id);
              } else if (downloads[current.id]?.status !== "downloading") {
                downloadTrack(current);
              }
            }}
          />
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: current.title,
                  text: `Listen to ${current.title} by ${current.artist} on ArsMusic`,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.href);
              }
            }}
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            onClick={() => alert("Lyrics are not available for this track.")}
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <AlignLeft className="h-4 w-4" /> Lyrics
          </button>
        </div>

        {error && <p className="mt-6 rounded-xl bg-destructive/20 p-3 text-center text-xs text-destructive-foreground">{error}</p>}

        {upNext.length > 0 && (
          <section className="mt-8 pb-4">
            <h2 className="mb-3 text-sm font-bold">Up next</h2>
            <ul className="space-y-1">
              {upNext.slice(0, 10).map((track) => (
                <li key={track.id}>
                  <button onClick={() => play(track)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface/70">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface">
                      <FastImage src={track.thumbnail} alt="" sizes="44px" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{track.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Sleep Timer Bottom Sheet */}
      {sleepOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={() => setSleepOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md animate-in slide-in-from-bottom duration-200">
            <div className="rounded-t-3xl border-t border-border bg-surface p-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-bold">Sleep Timer</h3>
                </div>
                <button onClick={() => setSleepOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {sleepTimer ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Timer active — pausing in</p>
                  <p className="mt-1 font-display text-3xl font-extrabold text-primary">{sleepMinsLeft} min</p>
                  <button
                    onClick={() => { setSleepTimer(null); setSleepOpen(false); }}
                    className="mt-4 w-full rounded-full bg-destructive py-3 text-sm font-bold text-destructive-foreground"
                  >
                    Cancel Timer
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {SLEEP_OPTIONS.map((opt) => (
                    <button
                      key={opt.minutes}
                      onClick={() => { setSleepTimer(Date.now() + opt.minutes * 60000); setSleepOpen(false); }}
                      className="rounded-xl bg-surface-2 py-3.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

