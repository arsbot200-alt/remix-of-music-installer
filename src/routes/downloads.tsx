import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { usePlayer } from "@/context/PlayerContext";
import { FastImage } from "@/components/FastImage";
import { ChevronLeft, Trash2, Shuffle } from "lucide-react";
import { SongMenu } from "@/components/SongMenu";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads · ArsMusic" },
      { name: "description", content: "Your downloaded songs." },
    ],
  }),
  component: Downloads,
});

function Downloads() {
  const router = useRouter();
  const { downloads, play, removeDownload } = usePlayer();
  const downloadedList = Object.values(downloads)
    .filter((d) => d.status === "completed")
    .map((d) => d.track);

  const handleShufflePlay = () => {
    if (downloadedList.length === 0) return;
    const shuffled = [...downloadedList].sort(() => Math.random() - 0.5);
    play(shuffled[0], shuffled);
  };

  const handleDeleteAll = () => {
    if (confirm("Are you sure you want to delete all downloaded songs?")) {
      downloadedList.forEach(t => removeDownload(t.id));
    }
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.history.back()} className="grid h-9 w-9 place-items-center rounded-full bg-surface/60 hover:bg-surface-2 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-extrabold">Downloads</h1>
        </div>
        {downloadedList.length > 0 && (
          <button onClick={handleDeleteAll} aria-label="Delete All" className="grid h-9 w-9 place-items-center rounded-full bg-surface/60 text-destructive hover:bg-destructive/20 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <section className="px-5 pb-[calc(env(safe-area-inset-bottom)+80px)]">
        {downloadedList.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="font-semibold">No downloads yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Songs you download will appear here for offline playback.
            </p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
              Download Songs
            </Link>
          </div>
        ) : (
          <>
            <button
              onClick={handleShufflePlay}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-bold text-background transition-transform active:scale-95"
            >
              <Shuffle className="h-5 w-5" /> Shuffle Play All
            </button>
            <ul className="space-y-1">
              {downloadedList.map((t) => (
                <li key={t.id} className="group flex items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-2 transition-colors">
                  <button onClick={() => play(t, downloadedList)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2 shadow-card">
                      {t.thumbnail ? (
                        <FastImage src={t.thumbnail} alt="" sizes="48px" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                    </div>
                  </button>
                  <SongMenu track={t} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </AppShell>
  );
}
