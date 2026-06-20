import { Innertube, UniversalCache } from "youtubei.js";

let cached: Promise<Innertube> | null = null;

// Bound fetch — youtubei.js on Cloudflare Workers throws
// "Illegal invocation" if the global fetch is called without `this`.
const boundFetch: typeof fetch = (input, init) => fetch(input as any, init);

export function getInnertube(): Promise<Innertube> {
  if (!cached) {
    cached = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      retrieve_player: true,
      fetch: boundFetch,
    }).catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
