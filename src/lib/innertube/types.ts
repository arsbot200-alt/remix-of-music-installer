export type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  thumbnail: string | null;
  duration?: string | null;
};

export type HomeItem = {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string | null;
  type: "song" | "album" | "playlist" | "artist" | "video";
};

export type HomeSection = {
  title: string;
  items: HomeItem[];
};

export type SearchResults = {
  songs: Song[];
  artists: { id: string; name: string; thumbnail: string | null }[];
  albums: { id: string; title: string; artist: string; thumbnail: string | null }[];
};

export type StreamData = {
  url: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string | null;
};
