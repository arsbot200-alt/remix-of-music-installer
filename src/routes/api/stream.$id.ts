import { createFileRoute } from "@tanstack/react-router";

// Audio proxy: streams YouTube audio through this origin so the browser
// never hits googlevideo.com directly (CORS / bot blocks). Two strategies:
//   1. Resolve a deciphered URL via youtubei.js and re-fetch with Range
//      passthrough (best for seeking).
//   2. Fallback to yt.download() which returns a ReadableStream.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "Range, Content-Type",
  "access-control-expose-headers":
    "content-type, content-length, content-range, accept-ranges",
  "access-control-max-age": "86400",
} as const;

export const Route = createFileRoute("/api/stream/$id")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params, request }) => {
        try {
          const { streamAudioResponse } = await import("@/lib/innertube/stream-response.server");
          return await streamAudioResponse(params.id, request);
        } catch (err: any) {
          console.error("[stream proxy] failed", err?.message ?? err);
          return new Response(
            "Stream error: " + (err?.message ?? "unknown"),
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});
