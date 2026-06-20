import { createFileRoute } from "@tanstack/react-router";
import { usePlayer } from "@/context/PlayerContext";
import { AppShell } from "@/components/AppShell";
import { Flame, Music, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats · ArsMusic" },
      { name: "description", content: "Your listening stats and streaks." },
    ],
  }),
  component: Stats,
  errorComponent: ({ error }) => <div className="p-6 text-sm">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function Stats() {
  const { minutesListened, history, liked, recent } = usePlayer();
  const likedCount = Object.keys(liked).length;

  // Top artists by play frequency in history
  const artistCount = new Map<string, { name: string; thumb: string | null; count: number }>();
  history.forEach((t) => {
    const key = t.artist || "Unknown";
    const ex = artistCount.get(key);
    if (ex) ex.count++;
    else artistCount.set(key, { name: key, thumb: t.thumbnail, count: 1 });
  });
  const topArtists = [...artistCount.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  // Top songs
  const songCount = new Map<string, { id: string; title: string; artist: string; thumb: string | null; count: number }>();
  history.forEach((t) => {
    const ex = songCount.get(t.id);
    if (ex) ex.count++;
    else songCount.set(t.id, { id: t.id, title: t.title, artist: t.artist, thumb: t.thumbnail, count: 1 });
  });
  const topSongs = [...songCount.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const weekHeights = [0.4, 0.6, 0.3, 0.85, 0.55, 0.95, 0.7];
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <AppShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="font-display text-2xl font-extrabold">Your Stats</h1>
        <p className="text-sm text-muted-foreground">Your listening at a glance</p>
      </header>

      <section className="grid grid-cols-2 gap-3 px-5">
        <StatCard icon={Clock} label="Minutes listened" value={String(minutesListened)} color="tile-2" />
        <StatCard icon={Music} label="Songs played" value={String(history.length)} color="tile-1" />
        <StatCard icon={TrendingUp} label="Liked" value={String(likedCount)} color="tile-5" />
        <StatCard icon={Flame} label="Streak" value="12d" color="tile-3" />
      </section>

      <section className="mt-6 px-5">
        <div className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">This week</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{minutesListened} <span className="text-base font-medium text-muted-foreground">min</span></p>
          <div className="mt-4 flex h-24 items-end gap-2">
            {weekHeights.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-primary"
                  style={{ height: `${h * 100}%`, opacity: 0.4 + h * 0.6 }}
                />
                <span className="text-[10px] text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {topArtists.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-3 text-base font-bold">Top artists</h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5">
            {topArtists.map((a) => (
              <div key={a.name} className="w-20 shrink-0 text-center">
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-surface">
                  {a.thumb && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={a.thumb} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 line-clamp-1 text-xs font-semibold">{a.name}</p>
                <p className="text-[10px] text-muted-foreground">{a.count} plays</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {topSongs.length > 0 && (
        <section className="mt-6 px-5 pb-6">
          <h2 className="mb-3 text-base font-bold">Top songs</h2>
          <ol className="space-y-2">
            {topSongs.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-surface p-2">
                <span className="w-5 text-center font-display text-lg font-extrabold text-muted-foreground">{i + 1}</span>
                <div className="h-10 w-10 overflow-hidden rounded-md bg-surface-2">
                  {s.thumb && <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={s.thumb} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.artist}</p>
                </div>
                <span className="text-xs text-muted-foreground">{s.count}×</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {history.length === 0 && (
        <div className="mx-5 mt-6 rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          Start listening to see your stats build up.
        </div>
      )}

      <div className="mx-5 mb-6 mt-6 rounded-2xl bg-gradient-primary p-5 shadow-glow">
        <p className="text-xs font-bold uppercase tracking-wider text-background/70">2026 Recap</p>
        <p className="mt-1 font-display text-2xl font-extrabold text-background">Your year in music</p>
        <p className="mt-1 text-sm text-background/80">Coming this December.</p>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: `var(--${color})` }}>
        <Icon className="h-4 w-4 text-background" />
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
