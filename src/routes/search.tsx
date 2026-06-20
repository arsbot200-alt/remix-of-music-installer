import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useDeferredValue, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { ytSearch } from "@/lib/innertube/yt.functions";
import { usePlayer, type Track } from "@/context/PlayerContext";
import { AppShell } from "@/components/AppShell";
import { Equalizer } from "@/components/Equalizer";
import { SongMenu } from "@/components/SongMenu";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · ArsMusic" },
      { name: "description", content: "Search every song, artist, and album in the YouTube Music catalog." },
    ],
  }),
  component: SearchPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm">Search broke: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const TRENDING = ["Drake", "Taylor Swift", "Lo-fi beats", "Billie Eilish", "K-Pop", "Workout", "Chill", "Anime OST"];
const MOODS = [
  { label: "Happy", color: "tile-7" },
  { label: "Chill", color: "tile-6" },
  { label: "Focus", color: "tile-2" },
  { label: "Workout", color: "tile-3" },
  { label: "Sleep", color: "tile-4" },
  { label: "Drive", color: "tile-8" },
  { label: "Romance", color: "tile-5" },
  { label: "Party", color: "tile-1" },
];
const GENRES = [
  { label: "Pop", color: "tile-1" },
  { label: "Hip-Hop", color: "tile-3" },
  { label: "Rock", color: "tile-7" },
  { label: "EDM", color: "tile-8" },
  { label: "R&B", color: "tile-5" },
  { label: "Indie", color: "tile-4" },
  { label: "Jazz", color: "tile-6" },
  { label: "Classical", color: "tile-2" },
];

function SearchPage() {
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q);
  const { play, current, isPlaying } = usePlayer();

  const { data, isFetching } = useQuery({
    queryKey: ["yt", "search", deferred],
    queryFn: () => ytSearch({ data: { query: deferred } }),
    enabled: deferred.trim().length > 1,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const el = document.getElementById("search-input");
    if (el) (el as HTMLInputElement).focus();
  }, []);

  return (
    <AppShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="font-display text-2xl font-extrabold">Search</h1>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-surface px-4 py-3">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            id="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Songs, artists, albums…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
      </header>

      {deferred.trim().length < 2 ? (
        <BrowseAll onPick={setQ} />
      ) : (
        <Results data={data} play={play} current={current} isPlaying={isPlaying} />
      )}
    </AppShell>
  );
}

function BrowseAll({ onPick }: { onPick: (q: string) => void }) {
  return (
    <>
      <section className="mt-2 px-5">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Trending</h2>
        <div className="flex flex-wrap gap-2">
          {TRENDING.map((t) => (
            <button key={t} onClick={() => onPick(t)} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium">
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7 px-5">
        <h2 className="mb-3 text-base font-bold">Mood</h2>
        <div className="grid grid-cols-2 gap-3">
          {MOODS.map((m) => (
            <button
              key={m.label}
              onClick={() => onPick(m.label)}
              className="relative h-20 overflow-hidden rounded-xl p-3 text-left font-display text-lg font-extrabold"
              style={{ backgroundColor: `var(--${m.color})` }}
            >
              <span className="relative z-10 text-background drop-shadow">{m.label}</span>
              <span className="absolute -bottom-3 -right-3 h-16 w-16 rotate-12 rounded-lg bg-background/15" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7 px-5">
        <h2 className="mb-3 text-base font-bold">Genres</h2>
        <div className="grid grid-cols-2 gap-3">
          {GENRES.map((g) => (
            <button
              key={g.label}
              onClick={() => onPick(g.label)}
              className="relative h-24 overflow-hidden rounded-xl p-3 text-left font-display text-xl font-extrabold"
              style={{ backgroundColor: `var(--${g.color})` }}
            >
              <span className="relative z-10 text-background drop-shadow">{g.label}</span>
              <span className="absolute -bottom-4 -right-4 h-20 w-20 rotate-12 rounded-2xl bg-background/15" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function Results({
  data,
  play,
  current,
  isPlaying,
}: {
  data: Awaited<ReturnType<typeof ytSearch>> | undefined;
  play: (t: Track, q?: Track[]) => void;
  current: Track | null;
  isPlaying: boolean;
}) {
  if (!data) {
    return <div className="px-5 py-10 text-center text-sm text-muted-foreground">Searching…</div>;
  }
  const { songs, artists, albums } = data;
  if (songs.length + artists.length + albums.length === 0) {
    return <div className="px-5 py-10 text-center text-sm text-muted-foreground">No results.</div>;
  }
  const queue: Track[] = songs.map((s) => ({ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail }));

  return (
    <div className="mt-2 space-y-7 pb-6">
      {artists.length > 0 && (
        <section className="px-5">
          <h2 className="mb-3 text-base font-bold">Artists</h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5">
            {artists.map((a) => (
              <Link key={a.id} to="/artist/$id" params={{ id: a.id }} className="w-20 shrink-0 text-center">
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-surface">
                  {a.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={a.thumbnail} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-medium">{a.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {songs.length > 0 && (
        <section className="px-5">
          <h2 className="mb-3 text-base font-bold">Songs</h2>
          <ul className="space-y-1">
            {songs.map((s) => {
              const isCur = current?.id === s.id;
              return (
                <li key={s.id}>
                  <div className="flex w-full items-center gap-2 rounded-xl hover:bg-surface">
                    <button
                      onClick={() => play({ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail }, queue)}
                      className="flex flex-1 items-center gap-3 p-2 text-left"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                        {s.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={s.thumbnail} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${isCur ? "text-primary" : ""}`}>{s.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.artist}</p>
                      </div>
                      {isCur ? <Equalizer active={isPlaying} /> : s.duration && (
                        <span className="text-xs text-muted-foreground">{s.duration}</span>
                      )}
                    </button>
                    <div className="pr-2">
                      <SongMenu track={{ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {albums.length > 0 && (
        <section className="px-5">
          <h2 className="mb-3 text-base font-bold">Albums</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {albums.map((al) => (
              <Link key={al.id} to="/album/$id" params={{ id: al.id }} className="w-32 shrink-0">
                <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                  {al.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={al.thumbnail} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold">{al.title}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">{al.artist}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
