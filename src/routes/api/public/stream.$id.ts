import { createFileRoute } from "@tanstack/react-router";

const STREAM_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "Range, Content-Type",
  "access-control-expose-headers":
    "content-type, content-length, content-range, accept-ranges",
  "access-control-max-age": "86400",
} as const;

export const Route = createFileRoute("/api/public/stream/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: STREAM_CORS }),
      GET: async ({ params, request }) => {
        try {
          const { streamAudioResponse } = await import("@/lib/innertube/stream-response.server");
          return await streamAudioResponse(params.id, request);
        } catch (err: any) {
          console.error("[public stream] failed", err?.message ?? err);
          return new Response("Stream error: " + (err?.message ?? "unknown"), {
            status: 500,
            headers: STREAM_CORS,
          });
        }
      },
      HEAD: async ({ params, request }) => {
        try {
          const { streamAudioResponse } = await import("@/lib/innertube/stream-response.server");
          const response = await streamAudioResponse(params.id, request);
          return new Response(null, { status: response.status, headers: response.headers });
        } catch (err: any) {
          return new Response(null, { status: 500, headers: STREAM_CORS });
        }
      },
    },
  },
});