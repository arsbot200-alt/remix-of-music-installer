import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Play, Shuffle, ArrowLeft } from "lucide-react";
import { ytPlaylist } from "@/lib/innertube/detail.functions";
import { usePlayer, type Track } from "@/context/PlayerContext";
import { AppShell } from "@/components/AppShell";
import { Equalizer } from "@/components/Equalizer";
import { SongMenu } from "@/components/SongMenu";

const playlistQuery = (id: string) =>
  queryOptions({
    queryKey: ["yt", "playlist", id],
    queryFn: async () => {
      if (id.startsWith("pl-")) {
        return { title: "Local Playlist", thumbnail: null, subtitle: "Local", tracks: [] };
      }
      return ytPlaylist({ data: { id } });
    },
    staleTime: 1000 * 60 * 30,
  });

export const Route = createFileRoute("/playlist/$id")({
  head: ({ loaderData }) => ({
    meta: [
      { title: `${(loaderData as any)?.title ?? "Playlist"} · ArsMusic` },
    ],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(playlistQuery(params.id)),
  component: PlaylistPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm">Couldn't load: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function PlaylistPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(playlistQuery(id));
  const { play, current, isPlaying, playlists } = usePlayer();
  
  const localPl = id.startsWith("pl-") ? playlists.find(p => p.id === id) : null;
  const displayData = localPl 
    ? {
        title: localPl.name,
        subtitle: `${localPl.tracks.length} songs`,
        thumbnail: localPl.tracks[0]?.thumbnail || null,
        tracks: localPl.tracks,
      }
    : data;

  const queue: Track[] = displayData.tracks.map((s) => ({
    id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail,
  }));

  return (
    <AppShell>
      <div className="relative h-72 w-full overflow-hidden">
        {displayData.thumbnail ? (
          <img referrerPolicy="no-referrer" src={displayData.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <Link to="/" className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] grid h-9 w-9 place-items-center rounded-full bg-background/40 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="absolute inset-x-5 bottom-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Playlist</p>
          <h1 className="font-display text-3xl font-extrabold">{displayData.title}</h1>
          {displayData.subtitle && <p className="text-sm text-muted-foreground">{displayData.subtitle}</p>}
        </div>
      </div>

      <div className="relative z-10 -mt-2 flex gap-3 px-5">
        <button
          onClick={() => queue[0] && play(queue[0], queue)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          <Play className="h-4 w-4 fill-current" /> Play
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

      <section className="mt-6 px-5 pb-8">
        <ul className="space-y-1">
          {displayData.tracks.map((s) => {
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
                    {isCur && <Equalizer active={isPlaying} />}
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
    </AppShell>
  );
}
