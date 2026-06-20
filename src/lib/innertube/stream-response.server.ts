export const STREAM_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "Range, Content-Type",
  "access-control-expose-headers":
    "content-type, content-length, content-range, accept-ranges",
  "access-control-max-age": "86400",
} as const;

export async function streamAudioResponse(videoId: string, request: Request): Promise<Response> {
  const { clearCachedStream, getCachedStream, isTrustedAudioUrl, resolveAudioStream } = await import("./stream-cache.server");
  const requestUrl = new URL(request.url);
  const hintedUrl = requestUrl.searchParams.get("u");
  const fmt = requestUrl.searchParams.get("fmt");
  const preference = fmt === "progressive" ? "progressive" : fmt === "mp4" ? "mp4" : fmt === "webm" ? "webm" : undefined;
  const cached = getCachedStream(videoId, preference);
  let upstreamUrl = isTrustedAudioUrl(hintedUrl) ? hintedUrl : cached?.url ?? null;
  let contentType = cached?.contentType ?? "audio/mp4";

  if (!upstreamUrl) {
    const resolved = await resolveAudioStream(videoId, { preference });
    upstreamUrl = resolved.url;
    contentType = resolved.contentType;
  }

  const requestedRange = request.headers.get("range") ?? undefined;
  const openRange = requestedRange?.match(/^bytes=(\d+)-$/);
  const range = preference === "progressive" && openRange?.[1] === "0"
    ? undefined
    : openRange
      ? `bytes=${openRange[1]}-${Number(openRange[1]) + 1_048_575}`
      : requestedRange;
  let upstream = await fetch(upstreamUrl, {
    headers: {
      ...(range ? { range } : {}),
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    },
  });

  if (upstream.status === 403) {
    clearCachedStream(videoId);
    const refreshed = await resolveAudioStream(videoId, { refresh: true, preference });
    contentType = refreshed.contentType;
    upstream = await fetch(refreshed.url, {
      headers: {
        ...(range ? { range } : {}),
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });
  }

  if (!upstream.ok && upstream.status !== 206) {
    console.warn(`[stream] upstream ${upstream.status}; using download fallback`);
    const { getInnertube } = await import("./client");
    const yt = await getInnertube();
    const body: ReadableStream = await yt.download(videoId, {
      type: "audio",
      quality: "best",
      client: "IOS",
    } as any);
    const fallbackHeaders = new Headers(STREAM_CORS);
    fallbackHeaders.set("content-type", contentType);
    fallbackHeaders.set("cache-control", "public, max-age=900");
    return new Response(body as any, { status: 200, headers: fallbackHeaders });
  }

  const headers = new Headers(STREAM_CORS);
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("content-type")) headers.set("content-type", contentType);
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=3600");

  return new Response(upstream.body, { status: upstream.status, headers });
}