// Server-only: never imported from client code.
// Loads the user's derived taste profile from the bundled Takeout export.
// Only aggregate signals (top artists, seed IDs) leave this module.
import profile from "@/data/taste-profile.json";

export type LibrarySong = {
  id: string;
  title: string;
  album: string;
  artists: string[];
};

export type PlaylistCluster = {
  title: string;
  id: string;
  videoIds: string[];
};

export type TasteProfile = {
  library: LibrarySong[];
  playlists: PlaylistCluster[];
  seedVideoIds: string[];
  topArtists: string[];
  artistWeights: Record<string, number>;
};

export function getTasteProfile(): TasteProfile {
  return profile as TasteProfile;
}

// Pick N items deterministically-ish (rotate by current day so it feels fresh)
export function rotatePick<T>(arr: T[], n: number, seedOffset = 0): T[] {
  if (arr.length === 0) return [];
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const start = (day + seedOffset) % arr.length;
  const out: T[] = [];
  for (let i = 0; i < Math.min(n, arr.length); i++) {
    out.push(arr[(start + i) % arr.length]);
  }
  return out;
}
