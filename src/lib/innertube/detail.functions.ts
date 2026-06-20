import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type { Song } from "./types";

const pickThumb = (thumbs: unknown): string | null => {
  if (!Array.isArray(thumbs) || thumbs.length === 0) return null;
  const withW = thumbs.filter((t: any) => typeof t?.width === "number");
  const sorted = [...withW].sort((a: any, b: any) => a.width - b.width);
  const pick =
    sorted.find((t: any) => t.width >= 300) ??
    sorted[sorted.length - 1] ??
    (thumbs[0] as any);
  let url: string | null = pick?.url ?? null;
  if (url) {
    if (/yt3\.(googleusercontent|ggpht)\.com/.test(url)) {
      url = url.replace(/=[^/?&#]+(?=$|[?&#])/i, "=w480-h480-l90-rj");
    } else if (/i\.ytimg\.com\/vi\//.test(url)) {
      url = url.replace(/\/(maxresdefault|hqdefault|sddefault)\.jpg/, "/mqdefault.jpg");
    }
  }
  return url;
};

const safeArtists = (artists: unknown): string => {
  if (!Array.isArray(artists)) return "";
  return artists.map((a: any) => a?.name).filter(Boolean).join(", ");
};

const toSong = (s: any): Song | null => {
  const id = String(s?.id ?? s?.endpoint?.payload?.videoId ?? "");
  const title = s?.title?.text ?? s?.title ?? "";
  if (!id || !title) return null;

  const artistName = safeArtists(s?.artists ?? s?.authors) || s?.author?.name || s?.subtitle?.text || "";
  const lowerTitle = title.toLowerCase();
  const lowerArtist = artistName.toLowerCase();

  if (
    lowerTitle.includes("karaoke") || 
    lowerTitle.includes("cover") ||
    lowerArtist.includes("nanku") ||
    lowerArtist.includes("drv") ||
    lowerArtist.includes("byg smyle") ||
    lowerArtist.includes("byg smile")
  ) {
    return null;
  }

  return {
    id,
    title,
    artist: artistName,
    album: s?.album?.name ?? null,
    thumbnail: pickThumb(s?.thumbnail?.contents) ?? pickThumb(s?.thumbnails),
    duration: s?.duration?.text ?? null,
  };
};

export const ytArtist = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    try {
      const a: any = await yt.music.getArtist(data.id);
      const getThumb = (item: any) => pickThumb(item?.thumbnails) ?? pickThumb(item?.thumbnail?.contents) ?? pickThumb(item?.thumbnail) ?? pickThumb(item?.thumbnailDetails?.thumbnails) ?? null;
      
      const name = a?.header?.title?.text ?? a?.name ?? "Artist";
      const thumbnail = getThumb(a?.header) ?? null;
      const description =
        a?.header?.description?.text ?? a?.description?.text ?? null;

      const sections: any[] = a?.sections ?? [];
      const findSec = (key: string) =>
        sections.find((s: any) => {
          const title = s?.header?.title?.text ?? s?.title?.text ?? s?.title ?? "";
          return title.toLowerCase().includes(key);
        });
      const songsSec = findSec("song");
      const albumsSec = findSec("album");
      const singlesSec = findSec("single") || findSec("ep");
      const releasesSec = findSec("release");

      const songs: Song[] = (songsSec?.contents ?? [])
        .map(toSong)
        .filter((s: any) => {
          if (!s || !s.id || !s.title) return false;
          
          const tLower = s.title.toLowerCase();
          const aLower = s.artist.toLowerCase();
          const nameLower = name.toLowerCase();

          // Vigorously filter out Hispanic/African/generic artists grouped into "Bella"
          if (nameLower === "bella") {
             if (tLower.includes("enti ") || tLower.includes("lobo al") || tLower.includes("moi") || aLower === "cole" || aLower === "bella moi" || aLower.includes("trane") || tLower.includes("heer lig")) {
               return false;
             }
             if (aLower !== "bella" && !aLower.includes("bella,") && !aLower.includes(", bella") && !aLower.includes("bella ") && aLower !== "") {
               return false;
             }
          }
          return true;
        })
        .slice(0, 40);

      const filterGeneric = (a: any) => {
        if (!a.id || !a.title) return false;
        if (name.toLowerCase() === "bella") {
           const tLower = a.title.toLowerCase();
           if (tLower.includes("enti ") || tLower.includes("lobo al") || tLower.includes("moi") || tLower.includes("trane") || tLower.includes("heer lig")) return false;
        }
        return true;
      };

      const albums = (albumsSec?.contents ?? [])
        .map((al: any) => ({
          id: String(al?.id ?? ""),
          title: al?.title?.text ?? "",
          year: al?.year ?? null,
          thumbnail: getThumb(al),
        }))
        .filter(filterGeneric)
        .slice(0, 20);

      const singles = (singlesSec?.contents ?? [])
        .map((al: any) => ({
          id: String(al?.id ?? ""),
          title: al?.title?.text ?? "",
          year: al?.year ?? null,
          thumbnail: getThumb(al),
        }))
        .filter(filterGeneric)
        .slice(0, 20);

      let releases = (releasesSec?.contents ?? [])
        .map((al: any) => {
          const videoId = al?.endpoint?.payload?.videoId ?? al?.videoId;
          return {
            id: String(videoId ?? al?.id ?? ""),
            title: al?.title?.text ?? "",
            year: al?.year ?? null,
            thumbnail: getThumb(al),
            isSong: !!videoId,
          };
        })
        .filter(filterGeneric)
        .slice(0, 20);

      // Synthetic fallback for Latest Releases if YouTube Music doesn't provide one
      if (releases.length === 0) {
        const currentYear = new Date().getFullYear().toString();
        const recentSingles = singles.filter((s: any) => String(s.year) === currentYear).map((s: any) => ({ ...s, isSong: false }));
        const recentAlbums = albums.filter((a: any) => String(a.year) === currentYear).map((a: any) => ({ ...a, isSong: false }));
        releases = [...recentSingles, ...recentAlbums];

        if (releases.length === 0) {
          // If no releases this year, just grab the absolute newest single/album
          if (singles[0]) releases.push({ ...singles[0], isSong: false });
          else if (albums[0]) releases.push({ ...albums[0], isSong: false });
        }
      }

      return { name, thumbnail, description, songs, albums, singles, releases };
    } catch (err) {
      console.error("[ytArtist] failed", err);
      return {
        name: "Artist",
        thumbnail: null,
        description: null,
        songs: [] as Song[],
        albums: [] as { id: string; title: string; year: string | null; thumbnail: string | null }[],
        singles: [] as { id: string; title: string; year: string | null; thumbnail: string | null }[],
        releases: [] as { id: string; title: string; year: string | null; thumbnail: string | null; isSong: boolean }[],
      };
    }
  });

export const ytAlbum = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    try {
      const al: any = await yt.music.getAlbum(data.id);
      const title = al?.header?.title?.text ?? al?.title ?? "Album";
      const artist =
        safeArtists(al?.header?.artists) ??
        al?.header?.author?.name ??
        al?.header?.subtitle?.text ??
        "";
      const year = al?.header?.year ?? null;
      const thumbnail =
        pickThumb(al?.header?.thumbnail?.contents) ??
        pickThumb(al?.header?.thumbnails);
      const tracks: Song[] = (al?.contents ?? [])
        .map((s: any) => ({
          id: String(s?.id ?? ""),
          title: s?.title?.text ?? s?.title ?? "",
          artist: safeArtists(s?.artists) || artist,
          album: title,
          thumbnail,
          duration: s?.duration?.text ?? null,
        }))
        .filter((s: any) => s && s.id && s.title);
      return { title, artist, year, thumbnail, tracks };
    } catch (err) {
      console.error("[ytAlbum] failed", err);
      return { title: "Album", artist: "", year: null, thumbnail: null, tracks: [] as Song[] };
    }
  });

export const ytPlaylist = createServerFn({ method: "POST" })
  .validator((d: any) => z.object({ id: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    try {
      const pl: any = await yt.music.getPlaylist(data.id);
      const title = pl?.header?.title?.text ?? pl?.title ?? "Playlist";
      const subtitle =
        pl?.header?.subtitle?.text ?? pl?.header?.description?.text ?? "";
      const thumbnail =
        pickThumb(pl?.header?.thumbnail?.contents) ??
        pickThumb(pl?.header?.thumbnails);
      const tracks: Song[] = (pl?.contents ?? pl?.items ?? [])
        .map(toSong)
        .filter((s: any) => s && s.id && s.title)
        .slice(0, 100);
      return { title, subtitle, thumbnail, tracks };
    } catch (err) {
      // Fallback for Radios and Mixes (e.g. Hello Summer, My Supermix) which fail getPlaylist
      try {
        const up: any = await yt.music.getUpNext(data.id);
        const tracks: Song[] = (up?.contents ?? [])
          .map(toSong)
          .filter((s: any) => s && s.id && s.title)
          .slice(0, 100);
        return { title: "Mix", subtitle: "Auto-generated Radio", thumbnail: null, tracks };
      } catch (innerErr) {
        console.error("[ytPlaylist] failed completely", innerErr);
        return { title: "Playlist", subtitle: "", thumbnail: null, tracks: [] as Song[] };
      }
    }
  });
