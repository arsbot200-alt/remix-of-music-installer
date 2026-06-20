import type { ImgHTMLAttributes } from "react";

type FastImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "loading"> & {
  src: string | null | undefined;
  eager?: boolean;
};

/**
 * Aggressively rewrite YouTube/Google image URLs to much smaller variants.
 * - googleusercontent: =w226-h226 for tiles (was w1080-h1080) → ~90% smaller
 * - i.ytimg.com: /mqdefault.jpg (320×180, ~15KB) instead of hqdefault (480×360, ~40KB)
 */
const optimizeUrl = (src: string, size: number) => {
  // Google User Content (album art, artist images)
  if (/yt3\.(googleusercontent|ggpht)\.com/.test(src)) {
    return src.replace(/=[^/?&#]+(?=$|[?&#])/i, `=w${size}-h${size}-l90-rj`);
  }
  // YouTube video thumbnails
  if (/i\.ytimg\.com\/vi\//.test(src)) {
    // mqdefault = 320×180 (~15KB), good enough for grid tiles
    return src.replace(/\/(maxresdefault|hqdefault|sddefault|default)\.jpg/i, "/mqdefault.jpg");
  }
  // lh3.googleusercontent.com (playlist covers, etc.)
  if (/lh3\.googleusercontent\.com/.test(src)) {
    return src.replace(/=[^/?&#]+(?=$|[?&#])/i, `=w${size}-h${size}-l90-rj`);
  }
  return src;
};

export function FastImage({ src, alt = "", eager = false, sizes = "144px", className, ...props }: FastImageProps) {
  if (!src) return null;

  const baseSrc = optimizeUrl(src, 226);
  const isYT = /yt3\.(googleusercontent|ggpht)\.com|i\.ytimg\.com\/vi\/|lh3\.googleusercontent\.com/.test(src);
  const srcSet = isYT
    ? `${optimizeUrl(src, 120)} 120w, ${optimizeUrl(src, 226)} 226w, ${optimizeUrl(src, 320)} 320w, ${optimizeUrl(src, 480)} 480w`
    : undefined;

  return (
    <img
      src={baseSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`object-cover ${className ?? ""}`}
      {...({ fetchPriority: eager ? "high" : "auto" } as any)}
      {...props}
    />
  );
}