import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type { Song } from "./types";

export const ytRelated = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ videoId: z.string().min(5) }).parse(d))
  .handler(async ({ data }): Promise<{ songs: Song[] }> => {
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    try {
      const up: any = await yt.music.getUpNext(data.videoId);
      const items: any[] = up?.contents ?? [];
      const songs = items
        .map(songFromResult)
        .filter((x): x is Song => !!x && x.id !== data.videoId)
        .slice(0, 20);
      return { songs };
    } catch {
      return { songs: [] };
    }
  });

const pickThumb = (thumbs: unknown): string | null => {
  if (!Array.isArray(thumbs) || thumbs.length === 0) return null;
  const sorted = [...thumbs].sort(
    (a: any, b: any) => (b?.width ?? 0) - (a?.width ?? 0),
  );
  const url = (sorted[0] as any)?.url ?? null;
  return typeof url === "string" && /yt3\.(googleusercontent|ggpht)\.com/.test(url)
    ? url.replace(/=[^/?&#]+(?=$|[?&#])/i, "=w320-h320-l90-rj")
    : url;
};

const safeArtists = (artists: unknown): string => {
  if (!Array.isArray(artists)) return "";
  return artists.map((a: any) => a?.name).filter(Boolean).join(", ");
};

const songFromResult = (s: any): Song | null => {
  const id = String(s?.id ?? "");
  const title = s?.title?.text ?? s?.title ?? "";
  if (!id || !title) return null;
  const lowerTitle = title.toLowerCase();
  const artistName = safeArtists(s?.artists ?? s?.authors) || s?.author?.name || "";
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

async function searchSongs(yt: any, query: string, limit = 6): Promise<Song[]> {
  try {
    const res: any = await yt.music.search(query, { type: "song" });
    const list: any[] = res?.songs?.contents ?? res?.contents ?? [];
    return list
      .map(songFromResult)
      .filter((x): x is Song => !!x)
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function relatedFromVideo(yt: any, videoId: string, limit = 12): Promise<Song[]> {
  try {
    const up: any = await yt.music.getUpNext(videoId);
    const items: any[] = up?.contents ?? [];
    return items
      .map(songFromResult)
      .filter((x): x is Song => !!x && x.id !== videoId)
      .slice(0, limit);
  } catch {
    return [];
  }
}

function dedupe(songs: Song[]): Song[] {
  const seen = new Set<string>();
  const out: Song[] = [];
  for (const s of songs) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type DailyMix = { id: string; title: string; subtitle: string; songs: Song[] };
export type Radio = { id: string; title: string; subtitle: string; seedId: string; songs: Song[] };
export type PersonalFeed = {
  forYou: Song[];
  dailyMixes: DailyMix[];
  radios: Radio[];
  topArtists: { id?: string; name: string; thumbnail: string | null }[];
};

let personalCache: Record<string, { feed: PersonalFeed; time: number }> = {};

export const ytPersonal = createServerFn({ method: "POST" })
  .validator((d: any) => {
    try {
      return z.object({ historySeedId: z.string().optional() }).parse(d);
    } catch {
      return { historySeedId: undefined };
    }
  })
  .handler(async ({ data }): Promise<PersonalFeed> => {
    const seed = data.historySeedId || "default";
    // Disabled cache to allow continuous random rotation of feed and top artists
    // if (personalCache[seed] && Date.now() - personalCache[seed].time < 1000 * 60 * 5) {
    //   return personalCache[seed].feed;
    // }

    const { getInnertube } = await import("./client");
    const { getTasteProfile, rotatePick } = await import("./taste.server");
    const yt = await getInnertube();
    const profile = getTasteProfile();

    const userArtistsOnly = [
      "Talha Anjum", "Umer Anjum", "Bella Indian Rapper", "Straight Outta Srinagar SOS", "Seedhe Maut", "Eminem", 
      "Raftaar", "Siyaahi", "Naam Sujal", "Vichaar", "Taimour Baig", "Farhan Khan", "Yungsta Indian Rapper"
    ];
    const userPrefs = [
      ...userArtistsOnly,
      "Saiyaara", "Main Yahaan Hoon", "Jeene Laga Hoon", "Bekhayali",
      "Slowed Reverb Bollywood Songs"
    ];

    const randomOffset = Math.floor(Math.random() * 1000);
    const topArtists = [
      userPrefs[(randomOffset) % userPrefs.length],
      userPrefs[(randomOffset + 1) % userPrefs.length],
      userPrefs[(randomOffset + 2) % userPrefs.length],
      userPrefs[(randomOffset + 3) % userPrefs.length],
    ];

  // Search each top artist in parallel (top songs)
  const artistResults = await Promise.all(
    topArtists.map(async (name) => ({
      name,
      songs: await searchSongs(yt, name, 4), // Reduced from 5 to 4
    })),
  );

  // For You: round-robin top 2 from each artist, then shuffle a bit
  const forYouRaw: Song[] = [];
  for (let i = 0; i < 4; i++) {
    for (const a of artistResults) {
      if (a.songs[i]) forYouRaw.push(a.songs[i]);
    }
  }
  const forYou = dedupe(forYouRaw).slice(0, 30);

  // Daily Mixes: cluster top artists into 3 groups of ~2-3
  const groupSize = Math.max(2, Math.ceil(topArtists.length / 3));
  const dailyMixes: DailyMix[] = [];
  for (let g = 0; g < 3; g++) {
    const group = artistResults.slice(g * groupSize, g * groupSize + groupSize);
    if (group.length === 0) continue;
    const songs = dedupe(group.flatMap((x) => x.songs)).slice(0, 20);
    if (songs.length === 0) continue;
    dailyMixes.push({
      id: `mix-${g + 1}`,
      title: `Daily Mix ${g + 1}`,
      subtitle: group.map((x) => x.name).join(" · "),
      songs: shuffle(songs),
    });
  }

  // Radios: pick 3 rotating seed tracks from library
  const seedLib = rotatePick(profile.library, 3, randomOffset);
  const radios: Radio[] = (
    await Promise.all(
      seedLib.map(async (seed): Promise<Radio | null> => {
        const related = await relatedFromVideo(yt, seed.id, 20);
        if (related.length < 3) return null;
        return {
          id: `radio-${seed.id}`,
          title: `${seed.title} Radio`,
          subtitle: seed.artists.slice(0, 2).join(", "),
          seedId: seed.id,
          songs: related,
        };
      }),
    )
  ).filter((r): r is Radio => !!r);

  // Top artist thumbnails (best effort from search results)
  const topArtistInfo = await Promise.all(
    [
      userArtistsOnly[(randomOffset + 4) % userArtistsOnly.length],
      userArtistsOnly[(randomOffset + 5) % userArtistsOnly.length],
      userArtistsOnly[(randomOffset + 6) % userArtistsOnly.length],
      userArtistsOnly[(randomOffset + 7) % userArtistsOnly.length],
      userArtistsOnly[(randomOffset + 8) % userArtistsOnly.length],
      userArtistsOnly[(randomOffset + 9) % userArtistsOnly.length],
    ].map(async (name) => {
      try {
        const res: any = await yt.music.search(name, { type: "artist" });
        const a = (res?.artists?.contents ?? [])[0];
        const aId = String(a?.browseId ?? a?.id ?? "");
        return {
          id: aId,
          name: name.replace(/Indian Rapper|Straight Outta Srinagar |Songs/gi, "").trim(),
          thumbnail: pickThumb(a?.thumbnail?.contents) ?? pickThumb(a?.thumbnails) ?? null,
        };
      } catch {
        return { id: "", name: name.replace(/Indian Rapper|Straight Outta Srinagar |Songs/gi, "").trim(), thumbnail: null };
      }
    }),
  );

  const feed = { forYou, dailyMixes, radios, topArtists: topArtistInfo };
  personalCache[seed] = { feed, time: Date.now() };
  return feed;
});

export const ytMoreRecommendations = createServerFn({ method: "POST" })
  .validator((d: any) => z.object({ page: z.number().int().min(1).max(50) }).parse(d))
  .handler(async ({ data }): Promise<{ title: string; songs: Song[] }> => {
    const { getInnertube } = await import("./client");
    const { getTasteProfile, rotatePick } = await import("./taste.server");
    const yt = await getInnertube();
    const profile = getTasteProfile();
    
    // Select a few seed artists and library tracks
    const artists = rotatePick(profile.topArtists, 3, data.page * 2);
    const seeds = rotatePick(profile.library, 2, data.page * 3);

    const userPrefs = [
      "Talha Anjum", "Umer Anjum", "Bella Indian Rapper", "Straight Outta Srinagar SOS", "Seedhe Maut", "Eminem", 
      "Raftaar", "Siyaahi", "Naam Sujal", "Vichaar", "Taimour Baig", "Farhan Khan", "Yungsta Indian Rapper",
      "Saiyaara", "Main Yahaan Hoon", "Jeene Laga Hoon", "Bekhayali",
      "Slowed Reverb Bollywood Songs"
    ];
    const searchQuery = userPrefs[(data.page - 1) % userPrefs.length] + " songs";

    const [artistSongs, relatedSongs, mixSongs] = await Promise.all([
      Promise.all(artists.map((name) => searchSongs(yt, name, 6))),
      Promise.all(seeds.map((seed) => relatedFromVideo(yt, seed.id, 6))),
      searchSongs(yt, searchQuery, 12)
    ]);

    const allSongs = [
      ...artistSongs.flat(),
      ...relatedSongs.flat(),
      ...mixSongs
    ];

    const songs = shuffle(dedupe(allSongs)).slice(0, 24);
    
    return { 
      title: "More songs for you", 
      songs 
    };
  });
