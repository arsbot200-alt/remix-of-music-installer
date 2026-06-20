const CACHE_TTL_MS = 25 * 60 * 1000;

type CachedStream = {
  url: string;
  contentType: string;
  expiresAt: number;
};

const streamCache = new Map<string, CachedStream>();
type StreamPreference = "webm" | "mp4" | "progressive";

const cacheKey = (videoId: string, preference?: StreamPreference) => `${preference ?? "auto"}:${videoId}`;

const qualityScore = (format: any, preference?: StreamPreference) => {
  const mime = String(format?.mime_type ?? "");
  const preferenceBoost =
    preference === "webm" && mime.includes("webm") ? 1_000_000 :
    preference === "mp4" && mime.includes("mp4") ? 1_000_000 :
    preference === "progressive" && mime.includes("mp4") ? 1_000_000 :
    0;
  const codecBoost = mime.includes("opus") ? 20_000 : mime.includes("mp4") ? 10_000 : 0;
  return Number(format?.bitrate ?? format?.average_bitrate ?? 0) + preferenceBoost + codecBoost;
};

export function getCachedStream(videoId: string, preference?: StreamPreference): CachedStream | null {
  const cached = streamCache.get(cacheKey(videoId, preference));
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    streamCache.delete(cacheKey(videoId, preference));
    return null;
  }
  return cached;
}

export function setCachedStream(videoId: string, stream: Omit<CachedStream, "expiresAt">, preference?: StreamPreference) {
  streamCache.set(cacheKey(videoId, preference), { ...stream, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCachedStream(videoId: string) {
  streamCache.delete(cacheKey(videoId));
  streamCache.delete(cacheKey(videoId, "webm"));
  streamCache.delete(cacheKey(videoId, "mp4"));
}

export function isTrustedAudioUrl(raw: string | null): raw is string {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && /(^|\.)(googlevideo\.com|youtube\.com)$/.test(url.hostname);
  } catch {
    return false;
  }
}

export async function resolveAudioStream(videoId: string, options?: { refresh?: boolean; preference?: StreamPreference }): Promise<CachedStream> {
  const cached = options?.refresh ? null : getCachedStream(videoId, options?.preference);
  if (cached) return cached;

  const { getInnertube } = await import("./client");
  const yt = await getInnertube();
  const clients = options?.preference === "progressive" ? ["ANDROID", "WEB", "IOS"] as const : options?.preference === "mp4" ? ["IOS", "ANDROID", "WEB"] as const : ["WEB", "ANDROID", "IOS"] as const;

  for (const client of clients) {
    try {
      const info: any = await yt.getBasicInfo(videoId, { client } as any);
      const pool = options?.preference === "progressive"
        ? (info?.streaming_data?.formats ?? [])
        : (info?.streaming_data?.adaptive_formats ?? []);
      const formats = pool
        .filter((f: any) => options?.preference === "progressive" ? String(f?.mime_type ?? "").startsWith("video/mp4") : String(f?.mime_type ?? "").startsWith("audio/"))
        .sort((a: any, b: any) => qualityScore(b, options?.preference) - qualityScore(a, options?.preference));

      for (const format of formats) {
        let url: unknown = format?.url;
        if (typeof format?.decipher === "function") {
          try {
            url = await Promise.resolve(format.decipher(yt.session.player));
          } catch {
            // Some clients expose formats without a raw URL; try the next format/client.
          }
        }
        if (typeof url !== "string" || !url.startsWith("http")) continue;
        const probe = await fetch(url, {
          headers: {
            range: "bytes=0-1023",
            "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          },
        });
        if (!probe.ok && probe.status !== 206) continue;
        await probe.body?.cancel();
        const stream = {
          url,
          contentType: String(format?.mime_type ?? "audio/mp4").split(";")[0] || "audio/mp4",
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
        streamCache.set(cacheKey(videoId, options?.preference), stream);
        return stream;
      }
    } catch {
      // Try the next client.
    }
  }

  throw new Error("No audio stream available");
}