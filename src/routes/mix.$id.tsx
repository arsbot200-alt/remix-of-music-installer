import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Shuffle } from "lucide-react";
import { ytPersonal } from "@/lib/innertube/personal.functions";
import { AppShell } from "@/components/AppShell";
import { Equalizer } from "@/components/Equalizer";
import { FastImage } from "@/components/FastImage";
import { usePlayer, type Track } from "@/context/PlayerContext";

const personalQuery = queryOptions({
  queryKey: ["yt", "personal"],
  queryFn: () => ytPersonal(),
  staleTime: 1000 * 60 * 30,
});

export const Route = createFileRoute("/mix/$id")({
  head: () => ({ meta: [{ title: "Daily Mix · ArsMusic" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(personalQuery),
  component: MixPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm">Couldn't load mix: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const toTrack = (s: { id: string; title: string; artist: string; thumbnail: string | null }): Track => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  thumbnail: s.thumbnail,
});

function MixPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(personalQuery);
  const mix = data.dailyMixes.find((m) => m.id === id) ?? data.dailyMixes[0];
  const { play, current, isPlaying } = usePlayer();
  const queue = (mix?.songs ?? []).map(toTrack);

  if (!mix) {
    return <AppShell><div className="p-6 text-sm text-muted-foreground">Mix unavailable.</div></AppShell>;
  }

  return (
    <AppShell>
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="mt-6 grid grid-cols-2 gap-1 overflow-hidden rounded-xl bg-surface">
          {mix.songs.slice(0, 4).map((song) => (
            <div key={song.id} className="aspect-square bg-surface-2">
              <FastImage src={song.thumbnail} alt="" eager sizes="180px" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs uppercase text-muted-foreground">Daily Mix</p>
        <h1 className="font-display text-3xl font-extrabold">{mix.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mix.subtitle}</p>
      </header>

      <div className="mt-5 flex gap-3 px-5">
        <button onClick={() => queue[0] && play(queue[0], queue)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground">
          <Play className="h-4 w-4 fill-current" /> Play
        </button>
        <button
          onClick={() => {
            const shuffled = [...queue].sort(() => Math.random() - 0.5);
            if (shuffled[0]) void play(shuffled[0], shuffled);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-bold"
        >
          <Shuffle className="h-4 w-4" /> Shuffle
        </button>
      </div>

      <section className="mt-6 px-5 pb-8">
        <ul className="space-y-1">
          {mix.songs.map((song) => {
            const isCur = current?.id === song.id;
            return (
              <li key={song.id}>
                <button onClick={() => play(toTrack(song), queue)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                    <FastImage src={song.thumbnail} alt="" sizes="48px" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${isCur ? "text-primary" : ""}`}>{song.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                  </div>
                  {isCur && <Equalizer active={isPlaying} />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}