import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type { HomeSection, SearchResults, Song, StreamData } from "./types";

// Normalize a YouTube/Google thumbnail URL to ~300px for fast loading.
const normalizeThumb = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    // googleusercontent / ytimg "=w1080-h1080..." → "=w320-h320"
    if (/yt3\.(googleusercontent|ggpht)\.com/.test(url)) {
      return url.replace(/=[^/?&#]+(?=$|[?&#])/i, "=w320-h320-l90-rj");
    }
    // Return the original verified YouTube thumbnail URL
    return url;
  } catch {
    return url;
  }
};

const pickThumb = (thumbs: unknown): string | null => {
  if (!Array.isArray(thumbs) || thumbs.length === 0) return null;
  // Prefer a moderate size (~300-500px) for grid tiles
  const withW = thumbs.filter((t: any) => typeof t?.width === "number");
  const sorted = [...withW].sort((a: any, b: any) => a.width - b.width);
  const pick =
    sorted.find((t: any) => t.width >= 300) ??
    sorted[sorted.length - 1] ??
    (thumbs[0] as any);
  return normalizeThumb(pick?.url ?? null);
};

const safeArtists = (artists: unknown): string => {
  if (!Array.isArray(artists)) return "";
  return artists
    .map((a: any) => a?.name)
    .filter(Boolean)
    .join(", ");
};

const textOf = (value: any): string =>
  String(value?.text ?? value?.title?.text ?? value?.title ?? value?.name ?? "");

const payloadOf = (item: any): any =>
  item?.endpoint?.payload ??
  item?.title?.endpoint?.payload ??
  item?.flex_columns?.[0]?.title?.endpoint?.payload ??
  item?.flex_columns?.[0]?.title?.runs?.[0]?.endpoint?.payload ??
  item?.menu?.items?.find((m: any) => m?.endpoint?.payload?.videoId)?.endpoint?.payload ??
  {};

const pageTypeOf = (item: any): string =>
  payloadOf(item)?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType ?? "";

const flattenSearchContents = (contents: any[] | undefined): any[] =>
  (contents ?? []).flatMap((item: any) => item?.contents ?? [item]);

const subtitleRuns = (item: any): any[] =>
  item?.flex_columns?.[1]?.title?.runs ?? item?.subtitle?.runs ?? [];

const subtitleText = (item: any): string => {
  const col = item?.flex_columns?.[1]?.title;
  return String(col?.text ?? col?.runs?.map((r: any) => r.text).join("") ?? item?.subtitle?.text ?? "");
};

const toSong = (item: any): Song => {
  const payload = payloadOf(item);
  const runs = subtitleRuns(item).filter((r: any) => r?.text && r.text !== " • ");
  const fallbackParts = subtitleText(item).split(" • ").filter(Boolean);
  const duration = [...runs].reverse().find((r: any) => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(r.text))?.text ?? null;
  return {
    id: String(item?.id ?? payload?.videoId ?? ""),
    title: textOf(item?.flex_columns?.[0]?.title ?? item),
    artist: safeArtists(item?.artists ?? item?.authors) || runs[0]?.text || fallbackParts[0] || "",
    album: item?.album?.name ?? runs.find((r: any) => r?.endpoint?.payload?.browseId?.startsWith("MPRE"))?.text ?? null,
    thumbnail: pickThumb(item?.thumbnail?.contents) ?? pickThumb(item?.thumbnails),
    duration,
  };
};

const toArtist = (item: any) => ({
  id: String(item?.id ?? payloadOf(item)?.browseId ?? ""),
  name: textOf(item?.flex_columns?.[0]?.title ?? item),
  thumbnail: pickThumb(item?.thumbnail?.contents) ?? pickThumb(item?.thumbnails),
});

const toAlbum = (item: any) => {
  const runs = subtitleRuns(item).filter((r: any) => r?.text && r.text !== " • ");
  return {
    id: String(item?.id ?? payloadOf(item)?.browseId ?? ""),
    title: textOf(item?.flex_columns?.[0]?.title ?? item),
    artist: safeArtists(item?.artists ?? item?.authors) || runs[0]?.text || "",
    thumbnail: pickThumb(item?.thumbnail?.contents) ?? pickThumb(item?.thumbnails),
  };
};

async function getTrendingBollywoodPlaylists(yt: any): Promise<HomeSection> {
  try {
    const res = await yt.music.search("Bollywood Pop Dance Hits", { type: "playlist" });
    const playlists = (res?.playlists?.contents ?? []).map((p: any) => {
      return {
        id: String(p.id ?? p.endpoint?.payload?.playlistId ?? ""),
        title: String(p.title ?? ""),
        subtitle: String(p.author?.name ?? p.subtitle ?? "Bollywood Mix"),
        thumbnail: pickThumb(p.thumbnail?.contents) ?? pickThumb(p.thumbnails),
        type: "playlist" as const
      };
    }).filter((p: any) => p.id && p.title);
    return {
      title: "Trending community playlists",
      items: playlists.slice(0, 12)
    };
  } catch (err) {
    console.error("Failed to fetch trending Bollywood playlists", err);
    return { title: "Trending community playlists", items: [] };
  }
}

async function getDancingOnYourOwnSongs(yt: any): Promise<HomeSection> {
  try {
    const userArtists = [
      "Talha Anjum", "Umer Anjum", "Bella Indian Rapper", "Straight Outta Srinagar SOS", "Seedhe Maut", "Eminem", 
      "Raftaar", "Siyaahi", "Naam Sujal", "Vichaar", "Taimour Baig", "Farhan Khan", "Yungsta Indian Rapper",
      "Saiyaara", "Main Yahaan Hoon", "Jeene Laga Hoon", "Bekhayali",
      "Slowed Reverb Bollywood Songs"
    ];
    const randomQuery = userArtists[Math.floor(Math.random() * userArtists.length)];
    const res = await yt.music.search(randomQuery + " songs", { type: "song" });
    const rawSongs = (res?.songs?.contents ?? []).map((s: any) => {
      const lowerTitle = String(s.title ?? "").toLowerCase();
      if (lowerTitle.includes("karaoke") || lowerTitle.includes("cover")) return null;
      return {
        id: String(s.id ?? s.endpoint?.payload?.videoId ?? ""),
        title: String(s.title ?? ""),
        subtitle: String(safeArtists(s.artists) || s.author?.name || ""),
        thumbnail: pickThumb(s.thumbnail?.contents) ?? pickThumb(s.thumbnails),
        type: "song" as const
      };
    }).filter((s: any) => s && s.id && s.title);
    
    const unique = [];
    const seen = new Set();
    for (const s of rawSongs) {
      const key = s.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    return {
      title: "Dancing on your own",
      items: unique.slice(0, 12)
    };
  } catch (err) {
    console.error("Failed to fetch Dancing on your own songs", err);
    return { title: "Dancing on your own", items: [] };
  }
}

async function getHelloSummerSongs(yt: any): Promise<HomeSection> {
  try {
    const userBollywood = [
      "Saiyaara", "Main Yahaan Hoon", "Jeene Laga Hoon", "Bekhayali",
      "Tera Zikr", "Ek Raat Vilen", "Main Hoon Na"
    ];
    const randomQuery = userBollywood[Math.floor(Math.random() * userBollywood.length)];
    const res = await yt.music.search(randomQuery + " songs", { type: "song" });
    const rawSongs = (res?.songs?.contents ?? []).map((s: any) => {
      const lowerTitle = String(s.title ?? "").toLowerCase();
      if (lowerTitle.includes("karaoke") || lowerTitle.includes("cover")) return null;
      return {
        id: String(s.id ?? s.endpoint?.payload?.videoId ?? ""),
        title: String(s.title ?? ""),
        subtitle: String(safeArtists(s.artists) || s.author?.name || ""),
        thumbnail: pickThumb(s.thumbnail?.contents) ?? pickThumb(s.thumbnails),
        type: "song" as const
      };
    }).filter((s: any) => s && s.id && s.title);

    const unique = [];
    const seen = new Set();
    for (const s of rawSongs) {
      const key = s.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    return {
      title: "Hello Summer",
      items: unique.slice(0, 12)
    };
  } catch (err) {
    console.error("Failed to fetch Hello Summer songs", err);
    return { title: "Hello Summer", items: [] };
  }
}

export const ytHome = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ refresh: z.boolean().optional() }).optional().parse(d))
  .handler(async () => {

    const { getInnertube } = await import("./client");
  const yt = await getInnertube();
  try {
    const [home, trendingPlaylists, dancingSongs, helloSummer] = await Promise.all([
      yt.music.getHomeFeed(),
      getTrendingBollywoodPlaylists(yt),
      getDancingOnYourOwnSongs(yt),
      getHelloSummerSongs(yt)
    ]);

    const rawSections: any[] = home?.sections ?? (home as any)?.contents ?? [];
    const feedSections: HomeSection[] = rawSections
      .map((sec: any): HomeSection => {
        const items = (sec?.contents ?? [])
          .map((it: any) => {
            const id =
              it?.id ??
              it?.endpoint?.payload?.videoId ??
              it?.endpoint?.payload?.browseId ??
              it?.endpoint?.payload?.playlistId ??
              "";
            const title = it?.title?.text ?? it?.title ?? "";
            const subtitle =
              it?.subtitle?.text ??
              safeArtists(it?.authors ?? it?.artists) ??
              it?.author?.name ??
              "";
            const thumbnail =
              pickThumb(it?.thumbnail?.contents) ??
              pickThumb(it?.thumbnails) ??
              null;
            return {
              id: String(id),
              title: String(title),
              subtitle: String(subtitle),
              thumbnail,
              type: (it?.item_type as any) ?? "song",
            };
          })
          .filter((i: any) => i.id && i.title);
        return {
          title:
            sec?.header?.title?.text ??
            sec?.title?.text ??
            sec?.title ??
            "Recommended",
          items: items.slice(0, 12),
        };
      })
      .filter((s) => {
        const t = s.title.toLowerCase();

        // Remove sections where most items are missing thumbnails (looks empty)
        const itemsWithThumbs = s.items.filter((i) => i.thumbnail != null).length;
        if (s.items.length > 0 && itemsWithThumbs / s.items.length < 0.5) return false;

        return s.items.length > 0 &&
          s.title !== "Trending community playlists" &&
          s.title !== "Dancing on your own" &&
          !t.includes("india's biggest hits") &&
          !t.includes("india biggest hits") &&
          !t.includes("hello, summer") &&
          !t.includes("hello summer") &&
          !t.includes("hindi hits") &&
          !t.includes("brb, being nostalgic") &&
          !t.includes("brb being nostalgic");
      });

    const sections: HomeSection[] = [];
    if (helloSummer.items.length > 0) sections.push(helloSummer);
    if (dancingSongs.items.length > 0) sections.push(dancingSongs);
    if (trendingPlaylists.items.length > 0) sections.push(trendingPlaylists);
    
    const shuffledFeed = [...feedSections].sort(() => Math.random() - 0.5).slice(0, 8);
    sections.push(...shuffledFeed);

    return { sections };
  } catch (err) {
    console.error("[ytHome] failed", err);
    return { sections: [] as HomeSection[] };
  }
});

export const ytSearch = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<SearchResults> => {
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    try {
      const [songRes, videoRes, artistRes, albumRes]: any[] = await Promise.all([
        yt.music.search(data.query, { type: "song" } as any),
        yt.music.search(data.query, { type: "video" } as any),
        yt.music.search(data.query, { type: "artist" } as any),
        yt.music.search(data.query, { type: "album" } as any),
      ]);

      const allSongs: any[] = [
        ...flattenSearchContents(songRes?.contents),
        ...flattenSearchContents(videoRes?.contents),
      ];
      const songs: Song[] = allSongs
        .map(toSong)
        .filter((s) => s.id && s.title)
        .slice(0, 30);

      const artists = flattenSearchContents(artistRes?.contents)
        .filter((a: any) => pageTypeOf(a).includes("ARTIST") || subtitleText(a).toLowerCase().includes("artist"))
        .map(toArtist)
        .filter((a: any) => a.id && a.name)
        .slice(0, 10);

      const albums = flattenSearchContents(albumRes?.contents)
        .filter((al: any) => pageTypeOf(al).includes("ALBUM") || String(al?.id ?? payloadOf(al)?.browseId ?? "").startsWith("MPRE"))
        .map(toAlbum)
        .filter((a: any) => a.id && a.title)
        .slice(0, 10);

      return { songs, artists, albums };
    } catch (err) {
      console.error("[ytSearch] failed", err);
      return { songs: [], artists: [], albums: [] };
    }
  });

export const ytStream = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ videoId: z.string().min(5) }).parse(d))
  .handler(async ({ data }): Promise<StreamData> => {
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    const info: any = await yt.getBasicInfo(data.videoId, { client: "IOS" } as any);
    const format = info.chooseFormat({ type: "audio", quality: "best" });
    let url: string = format?.url ?? "";
    try {
      if (typeof format?.decipher === "function") {
        url = await Promise.resolve(format.decipher(yt.session.player));
      }
    } catch (e) {
      console.warn("[ytStream] decipher fallback", e);
    }
    if (!url) throw new Error("No audio stream available");
    return {
      url,
      title: info?.basic_info?.title ?? "",
      author: info?.basic_info?.author ?? "",
      duration: info?.basic_info?.duration ?? 0,
      thumbnail: pickThumb(info?.basic_info?.thumbnail) ?? null,
    };
  });

export const ytPrepareStream = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ videoId: z.string().min(5) }).parse(d))
  .handler(async ({ data }) => {
    const { resolveAudioStream } = await import("./stream-cache.server");
    const stream = await resolveAudioStream(data.videoId);
    return {
      url: `/api/public/stream/${encodeURIComponent(data.videoId)}`,
      contentType: stream.contentType,
    };
  });

export const ytSuggestions = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    try {
      const res: any = await yt.music.getSearchSuggestions(data.query);
      const list: string[] = [];
      for (const sec of res ?? []) {
        for (const item of sec?.contents ?? []) {
          const t = item?.suggestion?.text ?? item?.query ?? null;
          if (t) list.push(t);
        }
      }
      return { suggestions: list.slice(0, 10) };
    } catch {
      return { suggestions: [] as string[] };
    }
  });
