# ARS Music — Technical Aspects (Flutter)

## 1. Stack Overview
- **Framework:** Flutter 3.24+ (Dart 3.5+).
- **State:** Riverpod 2 (+ riverpod_generator, freezed for models).
- **Routing:** go_router.
- **HTTP:** dio + dio_cache_interceptor (Hive store).
- **Local storage:** Hive (key-value, fast) + flutter_secure_storage (tokens).
- **Audio:** just_audio + audio_service + just_audio_background.
- **Downloads:** background_downloader (isolate-backed, resumable).
- **Images:** cached_network_image.
- **Auth/DB:** supabase_flutter.
- **Voice:** speech_to_text.
- **Crash:** sentry_flutter.

## 2. Data Sources
### 2.1 Catalog (YouTube Music via Innertube)
- We do NOT call Innertube directly from the client. A backend proxy (Supabase Edge Function or our existing TanStack server, kept as the API layer) exposes:
  - `GET /catalog/home` → home rows
  - `GET /catalog/search?q=&type=`
  - `GET /catalog/artist/:id`
  - `GET /catalog/album/:id`
  - `GET /catalog/playlist/:id`
  - `GET /catalog/mix/:id`
  - `GET /catalog/song/:id`
  - `GET /stream/:videoId?quality=` → returns `{ url, expiresAt, mimeType, bitrate }`
- Why proxy: keeps Innertube headers/client params + visitor-data server-side, lets us cache stream URLs, and rotates them when expired.

### 2.2 User Data (Supabase / Postgres)
- Auth (Supabase Auth).
- `profiles`, `taste_profile`, `liked_songs`, `playlists`, `playlist_items`, `recently_played`, `listening_events`.

### 2.3 Local Cache (Hive boxes)
- `kv_cache` — JSON responses keyed by URL with TTL.
- `downloads` — DownloadedTrack metadata.
- `library` — liked songs + playlists offline mirror.
- `queue_state` — last queue + index + position.
- `settings` — user prefs.

## 3. Song Playback Pipeline
1. User taps a song → repo builds `Queue(List<Song>, startIndex)`.
2. `PlayerService.setQueue(queue, index)`:
   - For each item: create a `MediaItem` (id=videoId, title, artist, artUri, extras={ context, videoId }).
   - Build a `ConcatenatingAudioSource` of `LockCachingAudioSource(resolvedUri)` for streamed tracks, and `AudioSource.uri(File(...))` for downloaded ones.
   - Resolved URI fetched lazily via a custom `StreamAudioSource` so we only hit `/stream/:id` for the *current* + *next* item (preload-1).
3. `just_audio_background` keeps the player alive via `audio_service`'s foreground service. Notification + lockscreen controls auto-wired from MediaItems.
4. On URI expiry (HTTP 403/410), the `StreamAudioSource` catches the error, calls `/stream/:id?force=true`, and resumes from `position`.
5. Gapless playback: enabled via `ConcatenatingAudioSource` with crossfade off; preload buffer 2s.

### 3.1 Background Audio
- `just_audio_background.init()` in `main()` with channelId `com.arsmusic.audio`.
- `audio_service` config: `androidNotificationOngoing: true`, `androidStopForegroundOnPause: false`, `androidNotificationIcon: 'mipmap/ic_stat_music_note'`.
- Headset/Bluetooth events handled in `MediaSession` callbacks (`onPlay`, `onPause`, `onSkipToNext`, `onSkipToPrevious`, `onSeek`).

### 3.2 Audio Quality
- Quality enum: `low (96k opus)`, `normal (128k m4a)`, `high (256k m4a)`.
- Sent as `?quality=` to `/stream/:id`; backend picks the best matching itag from Innertube `streamingData.adaptiveFormats`.

## 4. Stream URL Cache (server)
- Redis (or KV) keyed by `videoId:quality`, TTL = `expiresAt - 60s`.
- On miss → resolve via Innertube `player` endpoint, decipher signatureCipher if present (n-param transform via cached player.js).

## 5. Downloads
- `background_downloader` enqueues HTTP GET against `/stream/:id?quality=high` and writes to `applicationDocumentsDirectory/audio/<videoId>.m4a`.
- Metadata saved to `downloads` Hive box: `{ videoId, title, artist, album, artUri (local copy), duration, bytes, quality, downloadedAt }`.
- Cover art also downloaded and cached locally.
- Player resolves `videoId` → local path first; falls back to streaming if missing.

## 6. Recommendation Engine
### 6.1 Inputs
- `taste_profile` (artists/genres chosen at onboarding).
- `listening_events` (videoId, durationListened, completed, timestamp).
- `liked_songs`.
- Time-of-day, recency, device locale.

### 6.2 Pipeline
- **Server-side worker** (cron every 6h per user) computes:
  - **Top artists** = weighted sum of listens (completion weight 1.0, skip weight 0.2) decayed by recency (`exp(-Δdays/14)`).
  - **Seed pool** = top 25 artists + top 50 tracks + liked songs.
  - **Daily Mixes** = cluster seeds by artist similarity (precomputed embedding table sourced from YT Music "related artists" graph). Each mix = 1 cluster.
  - **"Because you liked X"** = for each high-affinity track, fetch YT Music radio (`mix/RDAMVM<videoId>`), filter out already-heard.
  - **Discover Weekly** = round-robin from "related artists of top artists" minus listened set, capped at 30 tracks, rebuilt Mondays.
  - **New for you** = new releases from followed/top artists in the last 30 days.
- Stored in `recommendation_feed` table keyed by user with `generated_at`. Client polls or subscribes via Supabase realtime.

### 6.3 Client-side ranking
- For "Quick picks" on Home: re-rank server feed using current time-of-day and last-played artist to surface contextually relevant items.

## 7. Caching Strategy
- All `GET /catalog/*` responses cached in Hive via dio interceptor: stale-while-revalidate, TTL = 6h, fresh on pull-to-refresh.
- Images cached by `cached_network_image` (default 7 days).
- Stream URLs never cached on device (server-side only).

## 8. Performance
- Pre-resolve next track's stream URL when current track crosses 50% playback.
- Use `const` widgets aggressively; `RepaintBoundary` around mini player.
- Tree-shake icons; use vector drawable for notification icon.
- Defer Sentry + analytics init until after first frame (`SchedulerBinding.addPostFrameCallback`).

## 9. Testing
- Unit: repos, recommendation scorer, queue logic.
- Widget: SongTile, MiniPlayer, FullPlayer controls.
- Integration: search → play → background → resume.

## 10. Observability
- Sentry for crashes + performance traces.
- Server logs structured JSON for stream resolution latency.