import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ListMusic, History, Download, Clock } from "lucide-react";
import { usePlayer, type Track } from "@/context/PlayerContext";
import { AppShell } from "@/components/AppShell";
import { Equalizer } from "@/components/Equalizer";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library · ArsMusic" },
      { name: "description", content: "Your liked songs, history, and recent plays." },
    ],
  }),
  component: Library,
  errorComponent: ({ error }) => <div className="p-6 text-sm">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function Library() {
  const { liked, recent, history, play, current, isPlaying, downloads, playlists } = usePlayer();
  const likedList = Object.values(liked);
  const downloadedList = Object.values(downloads).filter(d => d.status === "completed").map(d => d.track);
  const [tab, setTab] = useState<"all" | "liked" | "playlists" | "recent" | "history" | "offline">("all");

  const stats = [
    { icon: Heart, label: "Liked", count: likedList.length, color: "tile-5", id: "liked" },
    { icon: ListMusic, label: "Playlists", count: playlists.length, color: "tile-4", id: "playlists" },
    { icon: Download, label: "Offline", count: downloadedList.length, color: "tile-6", id: "offline" },
    { icon: Clock, label: "Recent", count: recent.length, color: "tile-2", id: "recent" },
  ];

  const showList = (() => {
    if (tab === "liked") return likedList;
    if (tab === "recent") return recent;
    if (tab === "history") return history;
    if (tab === "offline") return downloadedList;
    return [...likedList, ...recent, ...downloadedList].filter(
      (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i,
    );
  })();

  return (
    <AppShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="font-display text-2xl font-extrabold">Your Library</h1>
      </header>

      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {(["all", "liked", "playlists", "recent", "history", "offline"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-foreground text-background" : "bg-surface text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-3 grid grid-cols-2 gap-2 px-5">
        {stats.map(({ icon: Icon, label, count, color, id }) => (
          <button
            key={label}
            onClick={() => setTab(id as any)}
            className="flex items-center gap-3 rounded-xl bg-surface p-3 text-left hover:bg-surface-2 transition-colors"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `var(--${color})` }}>
              <Icon className="h-5 w-5 text-background" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {count} {count === 1 ? "song" : "songs"}
              </p>
            </div>
          </button>
        ))}
      </section>

      <section className="mt-6 px-5 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">
            {tab === "all" ? "All in library" : tab[0].toUpperCase() + tab.slice(1)}
          </h2>
          <ListMusic className="h-4 w-4 text-muted-foreground" />
        </div>
        {tab === "playlists" ? (
          playlists.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              You haven't created any playlists yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {playlists.map((pl) => (
                <Link
                  key={pl.id}
                  to="/playlist/$id"
                  params={{ id: pl.id }}
                  className="group flex flex-col text-left card-interactive"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-surface-2 shadow-card">
                    {pl.tracks[0]?.thumbnail ? (
                      <img src={pl.tracks[0].thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-primary">
                        <ListMusic className="h-10 w-10 text-background/80" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold">{pl.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{pl.tracks.length} songs</p>
                </Link>
              ))}
            </div>
          )
        ) : showList.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            Nothing here yet. Start exploring and tap the heart on any song.
          </div>
        ) : (
          <ul className="space-y-1">
            {showList.map((t: Track, idx: number) => {
              const isCur = current?.id === t.id;
              return (
                <li key={`${t.id}-${tab}-${idx}`}>
                  <button
                    onClick={() => play(t, showList)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {t.thumbnail ? (
                        <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${isCur ? "text-primary" : ""}`}>{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                    </div>
                    {isCur && <Equalizer active={isPlaying} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
