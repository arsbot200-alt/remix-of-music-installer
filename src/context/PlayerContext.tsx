import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ytRelated } from "@/lib/innertube/personal.functions";
import { downloadManager, type DownloadEntry } from "@/lib/downloadManager";

export type Track = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string | null;
};

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
};

type PlayerState = {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  loading: boolean;
  position: number;
  duration: number;
  liked: Record<string, Track>;
  recent: Track[];
  history: Track[];
  minutesListened: number;
  error: string | null;
  upNext: Track[];
};

type PlayerApi = PlayerState & {
  play: (track: Track, queue?: Track[]) => Promise<void>;
  toggle: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (sec: number) => void;
  toggleLike: (t?: Track) => void;
  isLiked: (id: string) => boolean;
  loopMode: "off" | "one" | "all";
  toggleLoop: () => void;
  sleepTimer: number | null;
  setSleepTimer: (timestamp: number | null) => void;
  addToQueue: (track: Track) => void;
  playlists: Playlist[];
  createPlaylist: (name: string) => Playlist;
  addToPlaylist: (playlistId: string, track: Track) => void;
  // Downloads
  downloads: Record<string, DownloadEntry>;
  downloadTrack: (track: Track) => void;
  removeDownload: (id: string) => void;
  isDownloaded: (id: string) => boolean;
  clear: () => void;
  // Volume
  volume: number;
  setVolume: (v: number) => void;
  // Not Interested
  notInterested: string[];
  addNotInterested: (idOrName: string) => void;
  isNotInterested: (id: string, artist: string) => boolean;
};

const Ctx = createContext<PlayerApi | null>(null);

const LS_LIKED = "arsmusic.liked.v1";
const LS_RECENT = "arsmusic.recent.v1";
const LS_HISTORY = "arsmusic.history.v1";
const LS_MINUTES = "arsmusic.minutes.v1";
const LS_PLAYLISTS = "arsmusic.playlists.v1";
const LS_NOT_INTERESTED = "arsmusic.notinterested.v1";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLMediaElement | null>(null);
  const playTokenRef = useRef(0);
  const retryRef = useRef(0);
  const currentTrackRef = useRef<Track | null>(null);
  const playRef = useRef<((track: Track) => Promise<void>) | undefined>(undefined);
  const getRelated = ytRelated;

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [liked, setLiked] = useState<Record<string, Track>>({});
  const [recent, setRecent] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [minutesListened, setMinutes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loopMode, setLoopMode] = useState<"off" | "one" | "all">("off");
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [downloads, setDownloads] = useState<Record<string, DownloadEntry>>({});
  const [notInterested, setNotInterested] = useState<string[]>([]);

  const current = index >= 0 ? (queue[index] ?? null) : null;
  const upNext = index >= 0 ? queue.slice(index + 1, index + 21) : [];

  // Hydrate from localStorage on client
  useEffect(() => {
    setLiked(loadJSON(LS_LIKED, {} as Record<string, Track>));
    setRecent(loadJSON(LS_RECENT, [] as Track[]));
    setHistory(loadJSON(LS_HISTORY, [] as Track[]));
    setMinutes(loadJSON(LS_MINUTES, 0));
    setPlaylists(loadJSON(LS_PLAYLISTS, [] as Playlist[]));
    setNotInterested(loadJSON(LS_NOT_INTERESTED, [] as string[]));
    
    // Subscribe to download manager
    setDownloads(downloadManager.getRegistry());
    const unsub = downloadManager.subscribe((entries) => {
      setDownloads(entries);
    });
    return unsub;
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  }, []);

  // Persist
  useEffect(() => { localStorage.setItem(LS_LIKED, JSON.stringify(liked)); }, [liked]);
  useEffect(() => { localStorage.setItem(LS_RECENT, JSON.stringify(recent)); }, [recent]);
  useEffect(() => { localStorage.setItem(LS_HISTORY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(LS_MINUTES, JSON.stringify(minutesListened)); }, [minutesListened]);
  useEffect(() => { localStorage.setItem(LS_PLAYLISTS, JSON.stringify(playlists)); }, [playlists]);
  useEffect(() => { localStorage.setItem(LS_NOT_INTERESTED, JSON.stringify(notInterested)); }, [notInterested]);

  const loopRef = useRef(loopMode);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);

  // Init audio element
  useEffect(() => {
    const a = document.createElement("video");
    a.preload = "auto";
    a.playsInline = true;
    a.style.display = "none";
    document.body.appendChild(a);
    audioRef.current = a;
    const onTime = () => {
      setPosition(a.currentTime || 0);
      if ("mediaSession" in navigator && !isNaN(a.duration) && isFinite(a.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: a.duration,
            playbackRate: a.playbackRate,
            position: a.currentTime,
          });
        } catch { /* ignore */ }
      }
    };
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => { 
      if (loopRef.current === "one") {
        a.currentTime = 0;
        void a.play();
      } else {
        void nextRef.current?.(); 
      }
    };
    const onPlay = () => { 
      setPlaying(true); 
      setLoading(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    };
    const onCanPlay = () => setLoading(false);
    const onWaiting = () => { if (!a.paused) setLoading(true); };
    const onPause = () => {
      setPlaying(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    };
    const onErr = () => {
      setLoading(false);
      setPlaying(false);
      const track = currentTrackRef.current;
      if (track && retryRef.current < 2) {
        retryRef.current += 1;
        window.setTimeout(() => void playRef.current?.(track), 350);
      } else {
        setError("Couldn't keep this track loaded");
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlay);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("stalled", onWaiting);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onErr);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onPlay);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("stalled", onWaiting);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onErr);
      a.remove();
    };
  }, []);

  // Setup MediaSession handlers
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play().catch(console.error);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        void prevRef.current?.();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        void nextRef.current?.();
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    }
  }, []);

  // Count minutes (every 60s of play)
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setMinutes((m) => m + 1), 60_000);
    return () => clearInterval(t);
  }, [isPlaying]);

  // Sleep timer interval
  useEffect(() => {
    if (!sleepTimer) return;
    const t = setInterval(() => {
      if (Date.now() >= sleepTimer) {
        audioRef.current?.pause();
        setSleepTimer(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [sleepTimer]);

  const playIndex = useCallback(
    async (i: number, q: Track[]) => {
      const track = q[i];
      if (!track || !audioRef.current) return;
      const token = ++playTokenRef.current;
      if (currentTrackRef.current?.id !== track.id) retryRef.current = 0;
      currentTrackRef.current = track;
      setError(null);
      setLoading(true);
      setIndex(i);
      setQueue(q);
      setRecent((prev) => {
        const filtered = prev.filter((t) => t.id !== track.id);
        return [track, ...filtered].slice(0, 20);
      });
      setHistory((prev) => [track, ...prev].slice(0, 100));
      try {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        if (token !== playTokenRef.current || !audioRef.current) return;
        
        // Update MediaSession metadata
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: "ArsMusic",
            artwork: track.thumbnail ? [
              { src: track.thumbnail.replace(/=w\d+-h\d+/, "=w96-h96"), sizes: "96x96", type: "image/jpeg" },
              { src: track.thumbnail.replace(/=w\d+-h\d+/, "=w128-h128"), sizes: "128x128", type: "image/jpeg" },
              { src: track.thumbnail.replace(/=w\d+-h\d+/, "=w256-h256"), sizes: "256x256", type: "image/jpeg" },
              { src: track.thumbnail.replace(/=w\d+-h\d+/, "=w512-h512"), sizes: "512x512", type: "image/jpeg" },
            ] : [],
          });
        }

        audioRef.current.preload = "auto";
        
        // Check for downloaded blob
        let srcUrl = `/api/public/stream/${encodeURIComponent(track.id)}?fmt=progressive`;
        if (downloadManager.isDownloaded(track.id)) {
          try {
            const blobUrl = await downloadManager.getPlaybackUrl(track.id);
            if (blobUrl) srcUrl = blobUrl;
          } catch (err) {
            console.warn("Failed to load local blob, falling back to stream", err);
          }
        }
        
        audioRef.current.src = srcUrl;
        audioRef.current.load();
        await audioRef.current.play();
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Playback failed");
        setLoading(false);
        setPlaying(false);
      }
    },
    [],
  );

  const play = useCallback(
    async (track: Track, q?: Track[]) => {
      const list = q && q.length ? q : [track];
      const i = list.findIndex((t) => t.id === track.id);
      await playIndex(i >= 0 ? i : 0, list);
    },
    [playIndex],
  );

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) void a.play(); else a.pause();
  }, [current]);

  const next = useCallback(async () => {
    if (index < 0) return;
    if (index >= queue.length - 1) {
      if (loopMode === "all" && queue.length > 0) {
        await playIndex(0, queue);
        return;
      }
      const cur = queue[index];
      if (!cur) return;
      try {
        const { songs } = await getRelated({ data: { videoId: cur.id } });
        const extra: Track[] = songs
          .filter((s) => !queue.some((q) => q.id === s.id))
          .map((s) => ({ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail }));
        if (extra.length === 0) return;
        const newQ = [...queue, ...extra];
        await playIndex(index + 1, newQ);
      } catch (e) {
        console.warn("autoplay related failed", e);
      }
      return;
    }
    await playIndex(index + 1, queue);
  }, [index, queue, playIndex, getRelated, loopMode]);

  const toggleLoop = useCallback(() => {
    setLoopMode((prev) => (prev === "off" ? "one" : prev === "one" ? "all" : "off"));
  }, []);

  const addToQueue = useCallback((track: Track) => {
    if (index < 0) {
      void play(track);
      return;
    }
    setQueue((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, track);
      return copy;
    });
    alert(`Added "${track.title}" to queue`);
  }, [index, play]);

  const createPlaylist = useCallback((name: string): Playlist => {
    const pl: Playlist = { id: `pl-${Date.now()}`, name, tracks: [], createdAt: Date.now() };
    setPlaylists((prev) => [...prev, pl]);
    return pl;
  }, []);

  const addToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId && !pl.tracks.some((t) => t.id === track.id)
          ? { ...pl, tracks: [...pl.tracks, track] }
          : pl,
      ),
    );
  }, []);

  const prev = useCallback(async () => {
    if (index <= 0) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    await playIndex(index - 1, queue);
  }, [index, queue, playIndex]);

  const prevRef = useRef(prev);
  useEffect(() => { prevRef.current = prev; }, [prev]);
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);
  useEffect(() => { playRef.current = (track) => play(track, queue.length ? queue : [track]); }, [play, queue]);

  useEffect(() => {
    if (!current) return;
    if (queue.slice(index + 1).length >= 8) return;
    let cancelled = false;
    getRelated({ data: { videoId: current.id } })
      .then(({ songs }) => {
        if (cancelled) return;
        setQueue((prev) => {
          if (!prev.some((t) => t.id === current.id)) return prev;
          const extra = songs
            .filter((s) => !prev.some((q) => q.id === s.id))
            .map((s) => ({ id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail }));
          return extra.length ? [...prev, ...extra.slice(0, 16)] : prev;
        });
      })
      .catch((e) => console.warn("up next failed", e));
    return () => { cancelled = true; };
  }, [current?.id, index, queue, getRelated]);

  const seek = useCallback((sec: number) => {
    if (audioRef.current) audioRef.current.currentTime = sec;
  }, []);

  const toggleLike = useCallback((t?: Track) => {
    const target = t ?? current;
    if (!target) return;
    setLiked((prev) => {
      const copy = { ...prev };
      if (copy[target.id]) delete copy[target.id];
      else copy[target.id] = target;
      return copy;
    });
  }, [current]);

  const isLiked = useCallback((id: string) => Boolean(liked[id]), [liked]);

  const clear = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    setIndex(-1);
    setQueue([]);
    setPlaying(false);
  }, []);

  // Download APIs
  const downloadTrack = useCallback((track: Track) => {
    void downloadManager.downloadSong(track);
  }, []);
  const removeDownload = useCallback((id: string) => {
    void downloadManager.removeDownload(id);
  }, []);
  const isDownloaded = useCallback((id: string) => downloadManager.isDownloaded(id), []);

  const addNotInterested = useCallback((idOrName: string) => {
    setNotInterested((prev) => Array.from(new Set([...prev, idOrName.toLowerCase()])));
  }, []);

  const isNotInterested = useCallback((id: string, artist: string) => {
    const lowerId = id.toLowerCase();
    const lowerArtist = artist.toLowerCase();
    return notInterested.some(n => lowerId === n || lowerArtist.includes(n) || n.includes(lowerArtist));
  }, [notInterested]);

  const value = useMemo<PlayerApi>(
    () => ({
      queue, index, current, isPlaying, loading, position, duration,
      liked, recent, history, minutesListened, error, upNext,
      play, toggle, next, prev, seek, toggleLike, isLiked,
      loopMode, toggleLoop,
      sleepTimer, setSleepTimer,
      addToQueue,
      playlists, createPlaylist, addToPlaylist,
      downloads, downloadTrack, removeDownload, isDownloaded,
      clear, volume, setVolume,
      notInterested, addNotInterested, isNotInterested,
    }),
    [queue, index, current, isPlaying, loading, position, duration, liked, recent, history, minutesListened, error, upNext, play, toggle, next, prev, seek, toggleLike, isLiked, loopMode, toggleLoop, sleepTimer, setSleepTimer, addToQueue, playlists, createPlaylist, addToPlaylist, downloads, downloadTrack, removeDownload, isDownloaded, clear, volume, setVolume, notInterested, addNotInterested, isNotInterested],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return v;
}
