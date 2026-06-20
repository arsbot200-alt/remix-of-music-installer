import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ChevronLeft, Play, Shuffle } from "lucide-react";
import { ytPersonal, ytMoreRecommendations } from "@/lib/innertube/personal.functions";
import { AppShell } from "@/components/AppShell";
import { usePlayer, type Track } from "@/context/PlayerContext";
import type { Song } from "@/lib/innertube/types";
import { Equalizer } from "@/components/Equalizer";
import { SongMenu } from "@/components/SongMenu";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const personalQuery = queryOptions({
  queryKey: ["yt", "personal"],
  queryFn: () => ytPersonal(),
  staleTime: 1000 * 60 * 30,
});

export const Route = createFileRoute("/foryou")({
  head: () => ({
    meta: [
      { title: "For You · ArsMusic" },
      { name: "description", content: "Personalized mixes, stations and recommendations based on your taste." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(personalQuery),
  component: ForYou,
});

const songToTrack = (s: Song): Track => ({ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail });

function ForYou() {
  const { data } = useSuspenseQuery(personalQuery);
  const { play, current, isPlaying } = usePlayer();
  const queue = data.forYou.map(songToTrack);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const more = useInfiniteQuery({
    queryKey: ["yt", "more"],
    queryFn: ({ pageParam }) => ytMoreRecommendations({ data: { page: pageParam as number } }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.songs.length > 0 ? allPages.length + 1 : undefined),
  });

  useEffect(() => {
    if (!more.hasNextPage || more.isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) more.fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [more.hasNextPage, more.isFetchingNextPage, more.fetchNextPage]);

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-5 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link to="/" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full bg-surface">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Personalized</p>
          <h1 className="font-display text-2xl font-extrabold">For You</h1>
        </div>
      </header>

      <div className="mx-5 flex gap-2">
        <button
          onClick={() => data.forYou[0] && play(songToTrack(data.forYou[0]), queue)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          <Play className="h-4 w-4" /> Play
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

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold">Recommended songs</h2>
        <ul className="space-y-1">
          {data.forYou.map((s) => {
            const isCur = current?.id === s.id;
            return (
              <li key={s.id}>
                <div className="flex w-full items-center gap-2 rounded-xl hover:bg-surface">
                  <button
                    onClick={() => play(songToTrack(s), queue)}
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
                    <SongMenu track={songToTrack(s)} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {data.dailyMixes.map((mix) => (
        <section key={mix.id} className="mt-8 px-5">
          <h2 className="mb-1 text-base font-bold">{mix.title}</h2>
          <p className="mb-3 text-xs text-muted-foreground">{mix.subtitle}</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {mix.songs.map((s) => (
              <button
                key={s.id}
                onClick={() => play(songToTrack(s), mix.songs.map(songToTrack))}
                className="w-32 shrink-0 text-left"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                  {s.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={s.thumbnail} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold">{s.title}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">{s.artist}</p>
              </button>
            ))}
          </div>
        </section>
      ))}

      {data.radios.map((r) => (
        <section key={r.id} className="mt-8 px-5">
          <h2 className="mb-1 text-base font-bold">{r.title}</h2>
          <p className="mb-3 text-xs text-muted-foreground">Radio · {r.subtitle}</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {r.songs.map((s) => (
              <button
                key={s.id}
                onClick={() => play(songToTrack(s), r.songs.map(songToTrack))}
                className="w-32 shrink-0 text-left"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                  {s.thumbnail && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={s.thumbnail} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold">{s.title}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">{s.artist}</p>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* Endless scroll section */}
      {more.data?.pages.map((page, i) => (
        <section key={i} className="mt-8 px-5">
          <h2 className="mb-3 text-base font-bold">{page.title}</h2>
          <ul className="space-y-1">
            {page.songs.map((s) => {
              const isCur = current?.id === s.id;
              const pageQueue = page.songs.map(songToTrack);
              return (
                <li key={s.id}>
                  <div className="flex w-full items-center gap-2 rounded-xl hover:bg-surface">
                    <button
                      onClick={() => play(songToTrack(s), pageQueue)}
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
                      <SongMenu track={songToTrack(s)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div ref={loadMoreRef} className="h-20 w-full" />
    </AppShell>
  );
}
