import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { usePlayer } from "@/context/PlayerContext";
import { Settings, LogOut, ChevronRight, Heart, Download, Share2, Info, X, Music, Shield, Bell, Palette, HelpCircle } from "lucide-react";
import logoUrl from "@/assets/logu.png";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile · ArsMusic" },
      { name: "description", content: "Your ArsMusic profile and settings." },
    ],
  }),
  component: Profile,
  errorComponent: ({ error }) => <div className="p-6">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function Profile() {
  const { liked, history, minutesListened, downloads } = usePlayer();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const navigate = useNavigate();
  const downloadCount = Object.values(downloads).filter(d => d.status === "completed").length;

  const items: { icon: any; label: string; value?: number; action: () => void }[] = [
    { icon: Heart, label: "Liked songs", value: Object.keys(liked).length, action: () => setActiveSheet("liked") },
    { icon: Download, label: "Downloads", value: downloadCount, action: () => navigate({ to: "/downloads" }) },
    { icon: Share2, label: "Invite a friend", action: () => {
      if (navigator.share) {
        navigator.share({ title: "ArsMusic", text: "Check out ArsMusic — stream millions of songs for free!", url: window.location.origin }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(window.location.origin);
        alert("Link copied to clipboard!");
      }
    }},
    { icon: Settings, label: "Settings", action: () => setActiveSheet("settings") },
    { icon: Info, label: "About ArsMusic", action: () => setActiveSheet("about") },
  ];

  return (
    <AppShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="font-display text-2xl font-extrabold">Profile</h1>
      </header>

      <section className="px-5">
        <div className="rounded-3xl bg-surface p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-surface-2 shadow-glow">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=ArsMusicUser" alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <p className="font-display text-xl font-extrabold">ArsMusic Listener</p>
              <p className="text-sm text-muted-foreground">Free Plan · since 2026</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Mini value={String(minutesListened)} label="min" />
            <Mini value={String(history.length)} label="plays" />
            <Mini value={String(Object.keys(liked).length)} label="liked" />
          </div>
        </div>
      </section>

      <section className="mt-6 px-5">
        <ul className="overflow-hidden rounded-2xl bg-surface">
          {items.map(({ icon: Icon, label, value, action }) => (
            <li key={label}>
              <button onClick={action} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2 transition-colors">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{label}</span>
                {typeof value === "number" && (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 px-5 pb-6">
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          ArsMusic — Your A to Z music streaming experience.
        </p>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Developer{" "}
          <a
            href="https://www.instagram.com/arsdevs"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            @arsdevs
          </a>
        </p>
      </section>

      {/* ===== Bottom Sheets ===== */}
      {activeSheet && (
        <>
          <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={() => setActiveSheet(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md animate-in slide-in-from-bottom duration-200">
            <div className="max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">
                  {activeSheet === "about" && "About ArsMusic"}
                  {activeSheet === "settings" && "Settings"}
                  {activeSheet === "liked" && "Liked Songs"}
                </h3>
                <button onClick={() => setActiveSheet(null)} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activeSheet === "about" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <img referrerPolicy="no-referrer" src={logoUrl} alt="ArsMusic" className="h-14 w-14 rounded-2xl shadow-glow" />
                    <div>
                      <p className="font-display text-xl font-extrabold text-gradient">ArsMusic</p>
                      <p className="text-xs text-muted-foreground">Version 1.0.0</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    ArsMusic is a premium, independent music streaming application designed to deliver the best listening experience. 
                    Stream millions of songs, discover new artists, create playlists, and enjoy your music offline — all for free.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm"><Music className="h-4 w-4 text-primary" /> Millions of songs available</div>
                    <div className="flex items-center gap-2 text-sm"><Download className="h-4 w-4 text-primary" /> Offline downloads</div>
                    <div className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-primary" /> No ads, ever</div>
                    <div className="flex items-center gap-2 text-sm"><Heart className="h-4 w-4 text-primary" /> Personalized recommendations</div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Developed with ❤️ by <a href="https://www.instagram.com/arsdevs" target="_blank" rel="noreferrer" className="text-primary font-semibold">@arsdevs</a>
                  </p>
                </div>
              )}

              {activeSheet === "settings" && (
                <div className="space-y-1">
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors">
                    <Palette className="h-5 w-5 text-muted-foreground" /> Appearance
                    <span className="ml-auto text-xs text-muted-foreground">Dark</span>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors">
                    <Music className="h-5 w-5 text-muted-foreground" /> Audio Quality
                    <span className="ml-auto text-xs text-primary font-semibold">Highest</span>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors">
                    <Bell className="h-5 w-5 text-muted-foreground" /> Notifications
                    <span className="ml-auto text-xs text-muted-foreground">On</span>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors">
                    <Download className="h-5 w-5 text-muted-foreground" /> Download Quality
                    <span className="ml-auto text-xs text-primary font-semibold">Highest</span>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors">
                    <Shield className="h-5 w-5 text-muted-foreground" /> Privacy
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" /> Help & Feedback
                  </button>
                </div>
              )}

              {activeSheet === "liked" && (
                <div>
                  {Object.values(liked).length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No liked songs yet. Tap the heart on any song!</p>
                  ) : (
                    <ul className="space-y-1">
                      {Object.values(liked).map((t) => (
                        <li key={t.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2 transition-colors">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
                            {t.thumbnail && <img src={t.thumbnail} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{t.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}


            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <p className="font-display text-lg font-extrabold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
