import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Play, Shuffle, ArrowLeft } from "lucide-react";
import { ytAlbum } from "@/lib/innertube/detail.functions";
import { usePlayer, type Track } from "@/context/PlayerContext";
import { AppShell } from "@/components/AppShell";
import { Equalizer } from "@/components/Equalizer";
import { SongMenu } from "@/components/SongMenu";

const albumQuery = (id: string) =>
  queryOptions({
    queryKey: ["yt", "album", id],
    queryFn: () => ytAlbum({ data: { id } }),
    staleTime: 1000 * 60 * 30,
  });

export const Route = createFileRoute("/album/$id")({
  head: ({ loaderData }) => ({
    meta: [
      { title: `${(loaderData as any)?.title ?? "Album"} · ArsMusic` },
      { name: "description", content: `Album by ${(loaderData as any)?.artist ?? ""}` },
    ],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(albumQuery(params.id)),
  component: AlbumPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm">Couldn't load: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function AlbumPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(albumQuery(id));
  const { play, current, isPlaying } = usePlayer();
  const queue: Track[] = data.tracks.map((s) => ({
    id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail,
  }));

  return (
    <AppShell>
      <div className="relative px-5 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link to="/" className="mb-3 inline-grid h-9 w-9 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-col items-center text-center">
          <div className="h-48 w-48 overflow-hidden rounded-2xl bg-surface shadow-card">
            {data.thumbnail && <img referrerPolicy="no-referrer" src={data.thumbnail} alt="" className="h-full w-full object-cover" />}
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">{data.title}</h1>
          <p className="text-sm text-muted-foreground">{data.artist}{data.year ? ` · ${data.year}` : ""}</p>
        </div>
      </div>

      <div className="flex gap-3 px-5">
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
          {data.tracks.map((s, i) => {
            const isCur = current?.id === s.id;
            return (
              <li key={s.id}>
                <div className="flex w-full items-center gap-2 rounded-xl hover:bg-surface">
                  <button
                    onClick={() => play({ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail }, queue)}
                    className="flex flex-1 items-center gap-3 p-2 text-left"
                  >
                    <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
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
    </AppShell>
  );
}
