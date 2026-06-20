import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSuspenseQuery, queryOptions, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { ytHome } from "@/lib/innertube/yt.functions";
import { ytMoreRecommendations, ytPersonal } from "@/lib/innertube/personal.functions";
import { usePlayer, type Track } from "@/context/PlayerContext";
import { AppShell } from "@/components/AppShell";
import { Equalizer } from "@/components/Equalizer";
import { FastImage } from "@/components/FastImage";
import { SongMenu } from "@/components/SongMenu";
import type { HomeItem } from "@/lib/innertube/types";
import type { Song } from "@/lib/innertube/types";
import logoUrl from "@/assets/logu.png";

const homeQuery = queryOptions({
  queryKey: ["yt", "home"],
  queryFn: () => ytHome(),
  staleTime: 1000 * 60 * 10,
});

const personalQuery = (historySeedId?: string) => queryOptions({
  queryKey: ["yt", "personal", historySeedId ?? "default"],
  queryFn: () => ytPersonal({ data: { historySeedId } }),
  staleTime: 1000 * 60 * 5,
});

export const Route = createFileRoute("/")(  {
  head: () => ({
    meta: [
      { title: "ArsMusic — Home" },
      { name: "description", content: "Your personal feed of new music, mixes, and recommendations." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(homeQuery);
    context.queryClient.prefetchQuery(personalQuery());
  },
  component: Home,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-muted-foreground">Couldn't load home: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const itemToTrack = (it: HomeItem): Track => ({
  id: it.id,
  title: it.title,
  artist: it.subtitle,
  thumbnail: it.thumbnail,
});

const songToTrack = (s: Song): Track => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  thumbnail: s.thumbnail,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const MIX_GRADIENTS = [
  "linear-gradient(135deg, oklch(0.65 0.22 280), oklch(0.55 0.24 200))",
  "linear-gradient(135deg, oklch(0.70 0.20 30), oklch(0.55 0.22 350))",
  "linear-gradient(135deg, oklch(0.65 0.20 150), oklch(0.50 0.22 260))",
];

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  const { play, recent, current, isPlaying, isNotInterested } = usePlayer();
  const historySeedId = recent[0]?.id;
  const { data: personal } = useQuery(personalQuery(historySeedId));
  const [filter, setFilter] = useState("All");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const pullYRef = useRef(0); // mirror for native listener

  const [phrase, setPhrase] = useState({ text: "What sounds", highlight: "tonight?" });
  useEffect(() => {
    const options = [
      { text: "What sounds", highlight: "tonight?" },
      { text: "Ready to", highlight: "vibe?" },
      { text: "Discover your", highlight: "rhythm." },
      { text: "Play the", highlight: "unplayed." },
      { text: "Your daily", highlight: "soundtrack." },
      { text: "Let the music", highlight: "play." }
    ];
    setPhrase(options[Math.floor(Math.random() * options.length)]);
  }, []);

  const more = useInfiniteQuery({
    queryKey: ["yt", "more-recommendations"],
    queryFn: ({ pageParam }) => ytMoreRecommendations({ data: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: (_last, pages) => (pages.length < 20 ? pages.length + 1 : undefined),
    staleTime: 1000 * 60 * 20,
  });

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && more.hasNextPage && !more.isFetchingNextPage) {
        void more.fetchNextPage();
      }
    }, { rootMargin: "900px" });
    obs.observe(node);
    return () => obs.disconnect();
  }, [more.hasNextPage, more.isFetchingNextPage, more.fetchNextPage]);

  // Native DOM pull-to-refresh — passive:false lets us preventDefault
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // Only activate if we're scrolled to the very top
      if (window.scrollY <= 2) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 0) {
        // Prevent the browser's own pull/bounce
        e.preventDefault();
        const clamped = Math.min(diff * 0.4, 120);
        pullYRef.current = clamped;
        setPullY(clamped);
      } else {
        isPulling.current = false;
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    const handleTouchEnd = async () => {
      isPulling.current = false;
      const py = pullYRef.current;
      if (py >= 65 && !refreshing) {
        setRefreshing(true);
        setPullY(65); // lock at threshold height
        try {
          await ytHome({ data: { refresh: true } });
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["yt", "home"] }),
            queryClient.invalidateQueries({ queryKey: ["yt", "personal"] }),
          ]);
        } finally {
          setRefreshing(false);
          pullYRef.current = 0;
          setPullY(0);
        }
      } else {
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [refreshing, queryClient]);

  let sectionIdx = 0;
  const sectionDelay = () => `${Math.min(sectionIdx++ * 0.08, 0.6)}s`;

  return (
    <AppShell>
      <div ref={wrapperRef}>
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            height: pullY > 0 || refreshing ? `${Math.max(pullY, refreshing ? 52 : 0)}px` : '0px',
            opacity: pullY > 10 || refreshing ? 1 : 0,
            transition: isPulling.current ? 'none' : 'height 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className={`h-7 w-7 rounded-full border-[2.5px] border-primary border-t-transparent ${refreshing ? 'pull-spinner' : ''}`}
              style={{ transform: refreshing ? undefined : `rotate(${pullY * 3.5}deg)`, transition: refreshing ? undefined : 'none' }}
            />
            <span className="text-[10px] font-medium text-muted-foreground">
              {refreshing ? 'Refreshing…' : pullY >= 65 ? 'Release to refresh' : 'Pull down'}
            </span>
          </div>
        </div>

        <div
          style={{
            transform: pullY > 0 && !refreshing ? `translateY(${pullY * 0.15}px)` : undefined,
            transition: isPulling.current ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
        <header className="flex items-center justify-between px-5 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <Link to="/" className="flex items-center gap-2.5">
            <img referrerPolicy="no-referrer" src={logoUrl} alt="ArsMusic" className="h-10 w-10 rounded-xl shadow-glow" />
            <span className="font-display text-xl font-extrabold tracking-tight text-gradient">ArsMusic</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="h-9 w-9 overflow-hidden rounded-full shadow-glow ring-2 ring-primary/30">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=ArsMusicUser" alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </Link>
          </div>
        </header>

        <section className="px-5 section-animate" style={{ animationDelay: sectionDelay() }}>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight">
            {phrase.text} <span className="text-gradient">{phrase.highlight}</span>
          </h1>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto px-5 no-scrollbar section-animate" style={{ animationDelay: sectionDelay() }}>
          {["All", "Music", "Playlists", "Podcasts", "New", "For you"].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                filter === c
                  ? "bg-foreground text-background chip-active shadow-glow"
                  : "bg-surface text-foreground hover:bg-surface-2"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {(filter === "All" || filter === "Music") && recent.length > 0 && (
          <section className="mt-7 px-5 section-animate" style={{ animationDelay: sectionDelay() }}>
            <h2 className="mb-3 text-base font-bold">Jump back in</h2>
            <div className="grid grid-cols-2 gap-2">
              {recent.slice(0, 6).map((t) => {
                const isCur = current?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => play(t, recent)}
                    className="group flex items-center gap-2 overflow-hidden rounded-xl bg-surface pr-2 text-left transition-all duration-200 hover:bg-surface-2 card-interactive"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden bg-surface-2">
                      <FastImage src={t.thumbnail} alt="" sizes="48px" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{t.title}</p>
                    </div>
                    {isCur && <Equalizer active={isPlaying} />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== Personalized: For You ===== */}
        {(filter === "All" || filter === "For you" || filter === "Music") && personal && personal.forYou.length > 0 && (
          <section className="mt-8 px-5 section-animate" style={{ animationDelay: sectionDelay() }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Made for you</h2>
              <Link to="/foryou" className="flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                See all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {personal.forYou.filter(s => !isNotInterested(s.id, s.artist)).slice(0, 12).map((s) => {
                const isCur = current?.id === s.id;
                const track = songToTrack(s);
                return (
                  <div key={s.id} className="w-36 shrink-0 text-left group">
                    <button
                      onClick={() => play(track, personal.forYou.map(songToTrack))}
                      className="w-full text-left"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface shadow-card card-interactive">
                        {s.thumbnail ? (
                          <FastImage src={s.thumbnail} alt="" sizes="144px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full bg-gradient-primary" />
                        )}
                        {isCur && (
                          <div className="absolute inset-0 grid place-items-center bg-background/40">
                            <Equalizer active={isPlaying} />
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="mt-2 flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{s.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{s.artist}</p>
                      </div>
                      <SongMenu track={track} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== Daily Mixes ===== */}
        {(filter === "All" || filter === "For you" || filter === "Playlists") && personal && personal.dailyMixes.length > 0 && (
          <section className="mt-8 px-5 section-animate" style={{ animationDelay: sectionDelay() }}>
            <h2 className="mb-3 text-base font-bold">Your daily mixes</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {personal.dailyMixes.map((mix, i) => (
                <Link
                  key={mix.id}
                  to="/mix/$id"
                  params={{ id: mix.id }}
                  className="w-40 shrink-0 text-left group"
                >
                  <div
                    className="relative aspect-square overflow-hidden rounded-xl shadow-card card-interactive"
                    style={{ background: MIX_GRADIENTS[i % MIX_GRADIENTS.length] }}
                  >
                    <div className="absolute inset-0 grid grid-cols-2 gap-0.5 p-1 opacity-90">
                      {mix.songs.slice(0, 4).map((s) =>
                        s.thumbnail ? (
                          <FastImage key={s.id} src={s.thumbnail} alt="" sizes="80px" className="h-full w-full object-cover rounded-sm" />
                        ) : (
                          <div key={s.id} className="bg-background/20 rounded-sm" />
                        ),
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                      <p className="font-display text-sm font-extrabold text-foreground">{mix.title}</p>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{mix.subtitle}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== Stations / Radios ===== */}
        {(filter === "All" || filter === "For you" || filter === "Music") && personal && personal.radios.length > 0 && (
          <section className="mt-8 px-5 section-animate" style={{ animationDelay: sectionDelay() }}>
            <h2 className="mb-3 text-base font-bold">Stations for you</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {personal.radios.filter(r => r.songs[0] && !isNotInterested(r.songs[0].id, r.songs[0].artist)).map((r) => (
                <button
                  key={r.id}
                  onClick={() => r.songs[0] && play(songToTrack(r.songs[0]), r.songs.map(songToTrack))}
                  className="w-36 shrink-0 text-left group"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-surface shadow-card card-interactive">
                    {r.songs[0]?.thumbnail ? (
                      <FastImage src={r.songs[0].thumbnail} alt="" sizes="144px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-gradient-primary" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold">{r.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{r.subtitle}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== Your artists ===== */}
        {(filter === "All" || filter === "For you") && personal && personal.topArtists.length > 0 && (
          <section className="mt-8 px-5 section-animate" style={{ animationDelay: sectionDelay() }}>
            <h2 className="mb-3 text-base font-bold">Your top artists</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {personal.topArtists.filter(a => !isNotInterested(a.id || "", a.name)).map((a) => {
                const inner = (
                  <>
                    <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-surface ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/60 group-hover:shadow-glow">
                      {a.thumbnail ? (
                        <FastImage src={a.thumbnail} alt="" sizes="80px" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-primary font-display text-xl font-extrabold text-background">
                          {a.name[0]}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-medium">{a.name}</p>
                  </>
                );
                return a.id ? (
                  <Link key={a.name} to="/artist/$id" params={{ id: a.id }} className="w-20 shrink-0 text-center block group">
                    {inner}
                  </Link>
                ) : (
                  <div key={a.name} className="w-20 shrink-0 text-center group">
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== Home Feed Sections ===== */}
        {(filter === "All" || filter === "Music" || filter === "New" || filter === "Playlists") && personal && (
          data.sections.length === 0 ? (
            filter === "All" && <EmptyHome />
          ) : (
            data.sections
              .map(section => ({
                ...section,
                items: section.items.filter(i => {
                  const track = itemToTrack(i);
                  return !isNotInterested(track.id, track.artist);
                })
              }))
              .filter(section => section.items.length > 0)
              .filter((section) => {
                if (filter === "All" || filter === "New") return true;
                if (filter === "Music") return section.items.some((i) => i.type === "song" || i.type === "video" || i.type === "album");
                if (filter === "Playlists") return section.items.some((i) => i.type === "playlist");
                return true;
              })
              .map((section, idx) => (
                <section key={section.title + idx} className="mt-8 px-5 section-animate" style={{ animationDelay: sectionDelay() }}>
                  <h2 className="mb-3 text-base font-bold">{section.title}</h2>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
                    {section.items.map((item) => {
                      const track = itemToTrack(item);
                      const isSong = item.type === "song" || item.type === "video";
                      const tile = (
                        <>
                          <div className="aspect-square overflow-hidden rounded-xl bg-surface shadow-card card-interactive">
                            {item.thumbnail ? (
                              <FastImage src={item.thumbnail} alt="" sizes="144px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            ) : (
                              <div className="h-full w-full bg-gradient-primary" />
                            )}
                          </div>
                        </>
                      );
                      const cls = "w-36 shrink-0 text-left group";

                      if (item.type === "album") {
                        return (
                          <Link key={item.id} to="/album/$id" params={{ id: item.id }} className={cls}>
                            {tile}
                            <p className="mt-2 line-clamp-2 text-sm font-semibold">{item.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
                          </Link>
                        );
                      }
                      if (item.type === "playlist") {
                        return (
                          <Link key={item.id} to="/playlist/$id" params={{ id: item.id }} className={cls}>
                            {tile}
                            <p className="mt-2 line-clamp-2 text-sm font-semibold">{item.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
                          </Link>
                        );
                      }
                      if (item.type === "artist") {
                        return (
                          <Link key={item.id} to="/artist/$id" params={{ id: item.id }} className={cls}>
                            {tile}
                            <p className="mt-2 line-clamp-2 text-sm font-semibold">{item.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
                          </Link>
                        );
                      }
                      // Song / Video — add three-dot menu
                      return (
                        <div key={item.id} className={cls}>
                          <button
                            onClick={() => play(track, section.items.filter((i) => i.type === "song" || i.type === "video").map(itemToTrack))}
                            className="w-full text-left"
                          >
                            {tile}
                          </button>
                          <div className="mt-2 flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
                            </div>
                            {isSong && <SongMenu track={track} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
          )
        )}

        {(filter === "All" || filter === "Music" || filter === "New") && more.data?.pages.map((page, pageIdx) => (
          <section key={`${page.title}-${pageIdx}`} className="mt-8 px-5 section-animate" style={{ animationDelay: '0.1s' }}>
            <h2 className="mb-3 text-base font-bold">{page.title}</h2>
            <div className="grid grid-cols-2 gap-3">
              {page.songs.filter(s => !isNotInterested(s.id, s.artist)).map((song) => {
                const track = songToTrack(song);
                return (
                  <div key={`${pageIdx}-${song.id}`} className="min-w-0 text-left group">
                    <button
                      onClick={() => play(track, page.songs.map(songToTrack))}
                      className="w-full text-left"
                    >
                      <div className="aspect-square overflow-hidden rounded-xl bg-surface shadow-card card-interactive">
                        <FastImage src={song.thumbnail} alt="" sizes="180px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    </button>
                    <div className="mt-2 flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{song.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{song.artist}</p>
                      </div>
                      <SongMenu track={track} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div ref={loadMoreRef} className="h-20 px-5 pt-6 text-center text-xs text-muted-foreground">
          {more.isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent pull-spinner" />
              <span>Loading more…</span>
            </div>
          )}
        </div>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyHome() {
  return (
    <div className="mx-5 mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
      <p className="font-semibold">Loading the world's music…</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap Search to look up any song, artist, or album. ArsMusic streams millions of tracks.
      </p>
      <Link to="/search" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
        Open Search
      </Link>
    </div>
  );
}
