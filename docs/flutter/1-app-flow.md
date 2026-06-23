# ARS Music — App Flow (Flutter Native)

## 1. Launch & Splash
- Cold start shows native Flutter splash (`flutter_native_splash`) with app logo on dark background (#0A0A0A).
- While splash is visible, app:
  - Initializes Hive boxes (downloads, recents, liked, queue, settings).
  - Restores last playback state (queue + index + position) from Hive.
  - Boots `just_audio` + `audio_service` background isolate.
  - Restores Supabase session from secure storage.
- Splash dismisses → routes to **Home** (or last visited tab).

## 2. Authentication Flow
- If no Supabase session → push `AuthScreen` (email magic link + Google sign-in).
- After auth → personalization onboarding (pick 5+ artists / languages) → persisted as `taste_profile` in Supabase.
- Authenticated users land on **Home / For You**.

## 3. Primary Navigation (Bottom Nav)
Tabs (persistent, with `IndexedStack` so each keeps state):
1. **Home** – curated rows, recents, quick picks.
2. **Search** – text + voice search across songs, artists, albums, playlists.
3. **Library** – liked, downloads, playlists, recently played, stats.
4. **For You** – personalized mixes, daily picks, new releases.
5. **Profile** – account, settings, downloads manager.

Mini player sits above the bottom nav whenever a track is loaded.

## 4. Discovery → Playback Flow
1. User taps a song card anywhere (Home / Search / Artist / Album / Playlist / Mix).
2. App builds a queue from the surrounding context (e.g. all songs in that album).
3. `PlayerService.playQueue(queue, index)` → `just_audio` loads the stream URL fetched from the backend Innertube proxy.
4. Mini player slides up; tapping it opens **Full Player** with hero animation on artwork.

## 5. Full Player Flow
- Swipe down to dismiss back to mini player.
- Controls: play/pause, next, prev, seek, shuffle, repeat, like, add to playlist, download, share, queue, lyrics.
- Swipe left/right on artwork → next/prev track.
- Queue sheet (bottom sheet) shows upcoming + history, drag to reorder.

## 6. Artist Page Flow
- Tap artist anywhere → `ArtistScreen(id)`.
- Loader runs in parallel: artist meta, top songs, albums, singles, related artists.
- "Songs" list = strictly artist's own catalog. A separate "Featured On" section holds tracks where they are a collaborator only.

## 7. Album / Playlist / Mix Flow
- Same skeleton: header (cover, title, owner, play/shuffle buttons), then track list.
- "Play" starts queue from index 0; "Shuffle" enables shuffle mode.
- Download icon triggers batch download via `DownloadManager`.

## 8. Download / Offline Flow
- Tap download on a song / album / playlist → enqueued in `DownloadManager` (isolate-backed).
- Files written to app-private storage (`getApplicationDocumentsDirectory()/audio/<videoId>.m4a`) + metadata to Hive.
- Offline tab in Library shows downloaded content; player automatically prefers local file when present.

## 9. Background Playback Flow
- `audio_service` runs a foreground service (Android) / background audio (iOS) with media notification + lockscreen controls.
- Closing the app keeps audio running; killing the app from recents stops the service gracefully and persists state.

## 10. Back Button & Navigation Stack
- Android hardware back: pops current route; on root tab, double-tap to exit.
- Full player back gesture collapses to mini player instead of popping the underlying tab.

## 11. Error / Offline States
- No network → cached UI from Hive + offline-only library mode.
- Stream URL expired (403/410) → silent refetch + retry once before surfacing error toast.