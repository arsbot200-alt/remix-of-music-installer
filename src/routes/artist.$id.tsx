import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQuery } from "@tanstack/react-query";
import { Play, Shuffle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { ytArtist } from "@/lib/innertube/detail.functions";
import { ytSearch } from "@/lib/innertube/yt.functions";
import { usePlayer, type Track } from "@/context/PlayerContext";
import { AppShell } from "@/components/AppShell";
import { Equalizer } from "@/components/Equalizer";
import { Link } from "@tanstack/react-router";
import { SongMenu } from "@/components/SongMenu";
import { useState } from "react";

const artistQuery = (id: string) =>
  queryOptions({
    queryKey: ["yt", "artist", id],
    queryFn: () => ytArtist({ data: { id } }),
    staleTime: 1000 * 60 * 30,
  });

export const Route = createFileRoute("/artist/$id")({
  head: ({ loaderData }) => ({
    meta: [
      { title: `${(loaderData as any)?.name ?? "Artist"} · ArsMusic` },
      { name: "description", content: `Top songs and albums by ${(loaderData as any)?.name ?? "this artist"}.` },
    ],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(artistQuery(params.id)),
  component: ArtistPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm">Couldn't load: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function SongRow({ s, queue, isCur, isPlaying, play }: {
  s: { id: string; title: string; artist: string; album?: string | null; thumbnail: string | null };
  queue: Track[];
  isCur: boolean;
  isPlaying: boolean;
  play: (t: Track, q?: Track[]) => void;
}) {
  return (
    <li>
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
            <p className="truncate text-xs text-muted-foreground">{s.album ?? s.artist}</p>
          </div>
          {isCur && <Equalizer active={isPlaying} />}
        </button>
        <div className="pr-2">
          <SongMenu track={{ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail }} />
        </div>
      </div>
    </li>
  );
}

function ArtistPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(artistQuery(id));
  const { play, current, isPlaying } = usePlayer();
  const [showAllTopSongs, setShowAllTopSongs] = useState(false);

  const queue: Track[] = data.songs.map((s) => ({
    id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail,
  }));

  // Fetch ALL songs by searching the artist name
  const allSongsQuery = useQuery({
    queryKey: ["yt", "artist-all-songs", data.name],
    queryFn: () => ytSearch({ data: { query: data.name } }),
    staleTime: 1000 * 60 * 30,
    enabled: !!data.name && data.name !== "Artist",
  });

  const allSongs = allSongsQuery.data?.songs ?? [];
  const allSongsQueue: Track[] = allSongs.map((s) => ({
    id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail,
  }));

  const topSongsVisible = showAllTopSongs ? data.songs : data.songs.slice(0, 5);

  return (
    <AppShell>
      {/* Compact artist header with overlay buttons */}
      <div className="relative w-full overflow-hidden">
        <div className="relative h-56 w-full overflow-hidden">
          {data.thumbnail ? (
            <img referrerPolicy="no-referrer" src={data.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <Link to="/" className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] grid h-9 w-9 place-items-center rounded-full bg-background/40 backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        {/* Name + buttons overlapping the bottom of the hero */}
        <div className="-mt-16 relative z-10 px-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Artist</p>
          <h1 className="font-display text-3xl font-extrabold">{data.name}</h1>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => queue[0] && play(queue[0], queue)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              <Play className="h-4 w-4 fill-current" /> Play All
            </button>
            <button
              onClick={() => {
                const shuffled = [...queue].sort(() => Math.random() - 0.5);
                if (shuffled[0]) play(shuffled[0], shuffled);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-bold"
            >
              <Shuffle className="h-4 w-4" /> Shuffle
            </button>
          </div>
        </div>
      </div>

      {/* Top Songs */}
      {data.songs.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 text-base font-bold">Top Songs</h2>
          <ul className="space-y-1">
            {topSongsVisible.map((s) => (
              <SongRow
                key={s.id}
                s={s}
                queue={queue}
                isCur={current?.id === s.id}
                isPlaying={isPlaying}
                play={play}
              />
            ))}
          </ul>
          {data.songs.length > 5 && (
            <button
              onClick={() => setShowAllTopSongs(!showAllTopSongs)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showAllTopSongs ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> See all {data.songs.length} songs</>}
            </button>
          )}
        </section>
      )}

      {/* Latest Releases */}
      {data.releases?.length > 0 && (
        <section className="mt-7 px-5">
          <h2 className="mb-3 text-base font-bold">Latest Releases</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {data.releases.map((al: { id: string; title: string; year: string | null; thumbnail: string | null; isSong: boolean }) => (
              al.isSong ? (
                <button
                  key={al.id}
                  onClick={() => play({ id: al.id, title: al.title, artist: data.name, thumbnail: al.thumbnail }, queue)}
                  className="w-32 shrink-0 text-left"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-surface relative group">
                    {al.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={al.thumbnail} alt="" className="h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold">{al.title}</p>
                  <p className="text-[11px] text-muted-foreground">{al.year ? `${al.year} • Song` : 'Song'}</p>
                </button>
              ) : (
                <Link key={al.id} to="/album/$id" params={{ id: al.id }} className="w-32 shrink-0 text-left">
                  <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                    {al.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={al.thumbnail} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold">{al.title}</p>
                  {al.year && <p className="text-[11px] text-muted-foreground">{al.year}</p>}
                </Link>
              )
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {data.albums.length > 0 && (
        <section className="mt-7 px-5">
          <h2 className="mb-3 text-base font-bold">Albums</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {data.albums.map((al: { id: string; title: string; year: string | null; thumbnail: string | null }) => (
              <Link key={al.id} to="/album/$id" params={{ id: al.id }} className="w-32 shrink-0">
                <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                  {al.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={al.thumbnail} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold">{al.title}</p>
                {al.year && <p className="text-[11px] text-muted-foreground">{al.year}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Singles & EPs */}
      {data.singles?.length > 0 && (
        <section className="mt-7 px-5">
          <h2 className="mb-3 text-base font-bold">Singles & EPs</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {data.singles.map((al: { id: string; title: string; year: string | null; thumbnail: string | null }) => (
              <Link key={al.id} to="/album/$id" params={{ id: al.id }} className="w-32 shrink-0">
                <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                  {al.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={al.thumbnail} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold">{al.title}</p>
                {al.year && <p className="text-[11px] text-muted-foreground">{al.year}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Songs (from search) */}
      <section className="mt-7 px-5 pb-8">
        <h2 className="mb-2 text-base font-bold">All Songs</h2>
        {allSongsQuery.isLoading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading all songs…</p>
        ) : allSongs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No additional songs found.</p>
        ) : (
          <ul className="space-y-1">
            {allSongs.map((s) => (
              <SongRow
                key={s.id}
                s={s}
                queue={allSongsQueue}
                isCur={current?.id === s.id}
                isPlaying={isPlaying}
                play={play}
              />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
