import { useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, ListPlus, Heart, Share2, Plus, Music, X, Download, CheckCircle2, Trash2, Loader2, Ban } from "lucide-react";
import { usePlayer, type Track } from "@/context/PlayerContext";

export function SongMenu({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const { addToQueue, toggleLike, isLiked, playlists, createPlaylist, addToPlaylist, downloads, downloadTrack, removeDownload, addNotInterested } = usePlayer();

  const dlEntry = downloads[track.id];
  const dlStatus = dlEntry?.status || "idle";

  const close = () => { setOpen(false); setShowPlaylistPicker(false); setNewPlaylistName(""); };

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 text-muted-foreground hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Bottom Sheet Overlay */}
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); close(); }} />
          <div className="fixed inset-x-0 bottom-0 z-[100] mx-auto max-w-md animate-in slide-in-from-bottom duration-200">
            <div className="rounded-t-3xl border-t border-border bg-surface p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              {/* Song Info Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2 shadow-card">
                  {track.thumbnail && <img referrerPolicy="no-referrer" src={track.thumbnail} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); close(); }} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 hover:bg-surface-2/80">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!showPlaylistPicker ? (
                <div className="space-y-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); addToQueue(track); close(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors"
                  >
                    <ListPlus className="h-5 w-5 text-muted-foreground" /> Add to Queue
                  </button>
                  {dlStatus === "completed" ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeDownload(track.id); close(); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors"
                    >
                      <Trash2 className="h-5 w-5 text-destructive" /> Remove Download
                    </button>
                  ) : dlStatus === "downloading" ? (
                    <div className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" /> Downloading {dlEntry?.progress ?? 0}%
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadTrack(track); close(); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors"
                    >
                      <Download className="h-5 w-5 text-muted-foreground" /> Download
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPlaylistPicker(true); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors"
                  >
                    <Music className="h-5 w-5 text-muted-foreground" /> Add to Playlist
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(track); close(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors"
                  >
                    <Heart className={`h-5 w-5 ${isLiked(track.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    {isLiked(track.id) ? "Remove from Liked" : "Add to Liked Songs"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.share) {
                        navigator.share({
                          title: track.title,
                          text: `Listen to ${track.title} by ${track.artist}`,
                          url: `https://music.youtube.com/watch?v=${track.id}`,
                        }).catch(() => {});
                      }
                      close();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors"
                  >
                    <Share2 className="h-5 w-5 text-muted-foreground" /> Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to see less of this?")) {
                        addNotInterested(track.id);
                        if (track.artist) addNotInterested(track.artist);
                      }
                      close();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors text-destructive"
                  >
                    <Ban className="h-5 w-5" /> Not interested
                  </button>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-sm font-bold">Choose a playlist</p>

                  {/* Create new playlist */}
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="New playlist name…"
                      className="flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (newPlaylistName.trim()) {
                          const pl = createPlaylist(newPlaylistName.trim());
                          addToPlaylist(pl.id, track);
                          close();
                        }
                      }}
                      disabled={!newPlaylistName.trim()}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  {playlists.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">No playlists yet. Create one above.</p>
                  ) : (
                    <ul className="max-h-48 space-y-1 overflow-y-auto no-scrollbar">
                      {playlists.map((pl) => (
                        <li key={pl.id}>
                          <button
                            onClick={(e) => { e.stopPropagation(); addToPlaylist(pl.id, track); close(); }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface-2 transition-colors"
                          >
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary text-background">
                              <Music className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="truncate text-sm font-medium">{pl.name}</p>
                              <p className="text-xs text-muted-foreground">{pl.tracks.length} songs</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
