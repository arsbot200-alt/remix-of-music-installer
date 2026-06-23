# ARS Music — Flutter Implementation Plan

## Phase 0 — Foundations (Week 1)
- Bootstrap Flutter project (`flutter create arsmusic --org com.arsmusic`).
- Add dependencies: flutter_riverpod, riverpod_generator, freezed, json_serializable, go_router, dio, dio_cache_interceptor_hive_store, hive, hive_flutter, cached_network_image, shimmer, just_audio, just_audio_background, audio_service, background_downloader, supabase_flutter, flutter_secure_storage, speech_to_text, sentry_flutter, flutter_native_splash, flutter_launcher_icons.
- Configure theme (dark colors, Inter font).
- Set up `go_router` shell route with 5 bottom-nav tabs (empty screens).
- Add native splash + launcher icons.
- Configure Android `AndroidManifest.xml` (permissions, audio service, notification icon) and iOS `Info.plist` (background modes: audio, mic).

**Exit criteria:** App boots to empty 5-tab shell on Android + iOS.

## Phase 1 — Backend & Auth (Week 2)
- Stand up Supabase project; run migrations from `6-backend-schema.md`.
- Port existing TanStack Innertube proxy endpoints to Supabase Edge Functions (or keep current backend and call it from Flutter). Endpoints listed in §2.1 of `5-technical-aspects.md`.
- Implement `AuthRepo` (email magic link + Google). Build `AuthScreen` + `OnboardingScreen` (taste profile).
- Persist session via `flutter_secure_storage`; auto-redirect on app launch.

**Exit criteria:** User can sign up, complete onboarding, and land on Home (empty).

## Phase 2 — Catalog & Browse (Week 3)
- Implement `CatalogRepo` (dio + cache interceptor) with all `/catalog/*` endpoints.
- Models with freezed: Song, Album, Artist, Playlist, Mix, ArtistPage, AlbumPage, etc.
- Build screens: Home, Search (text only), Artist, Album, Playlist, Mix.
- Shared widgets: SongTile, SongCard, SectionHeader, FastImage, Shimmer skeletons.
- Artist screen: separate "Songs" vs "Featured on" using `primaryArtistId` filter.

**Exit criteria:** Full browse experience works with cached data; no playback yet.

## Phase 3 — Player Core (Week 4)
- Implement `PlayerService` extending `BaseAudioHandler` from `audio_service`.
- Wire `just_audio_background.init()` in `main()`.
- Build `MiniPlayer` + `FullPlayerScreen` (hero animation, swipe controls).
- Implement custom `StreamAudioSource` that resolves URI via `/stream/:id` and refreshes on 403/410.
- Queue management, shuffle, repeat, seek.
- Persist queue + position to Hive; restore on launch.

**Exit criteria:** Tap song → plays; lockscreen + notification controls work on real Android device; resumes after kill.

## Phase 4 — Library & Personalization (Week 5)
- LibraryRepo + screens (Liked, Playlists, Recently Played, Top Artists).
- Like/unlike, create/edit/delete playlists, add/remove tracks.
- Listening event logging: emit on `processingState == completed`, on skip, on pause >30s.
- Batched POST to `events-ingest` every 60s or on app background.

**Exit criteria:** Like persists across devices; playlists round-trip via Supabase.

## Phase 5 — For You & Recommendations (Week 6)
- Implement `recommend-build` worker (pg_cron + edge function) per `5-technical-aspects.md` §6.
- Build `ForYouScreen` consuming `recommendation_feed`.
- Add Home "Quick picks" client-side reranker.

**Exit criteria:** Daily mixes + Discover Weekly appear and refresh on schedule.

## Phase 6 — Downloads & Offline (Week 7)
- Integrate `background_downloader`.
- `DownloadService`: enqueue, progress stream, completion → write Hive record + sync `download_records`.
- Downloads screen with active + completed lists.
- Player prefers local file when available.
- Offline mode: detect via `connectivity_plus`; restrict UI to downloaded content; show offline banner.

**Exit criteria:** Airplane-mode playback of downloaded album works end-to-end.

## Phase 7 — Native Polish (Week 8)
- Voice search (`speech_to_text`).
- Haptics on key actions.
- Skeleton shimmer everywhere; remove spinners.
- Hero transitions mini→full.
- Marquee for long titles.
- Pull-to-refresh on Home/Library/ForYou.
- Settings screen (audio quality, theme, clear cache, sign out).
- Stats screen (top artists/songs/minutes).
- Deep links (`arsmusic://`).

**Exit criteria:** App feels like a Spotify/YT Music tier native experience.

## Phase 8 — Hardening & Release (Week 9)
- Sentry integrated; perf traces for cold start, search, stream resolve.
- Unit + widget + integration tests for critical paths.
- Crash-free target verified on a 50-device beta (Firebase App Distribution / TestFlight).
- Play Store + App Store assets: screenshots, listing copy, privacy policy.
- Build signed release: `flutter build appbundle --release` + iOS archive.

**Exit criteria:** Internal beta with 99.5% crash-free sessions; submitted to stores.

## Cross-Cutting Workstreams
- **CI:** GitHub Actions running `flutter analyze`, `flutter test`, build artifacts on PR.
- **Code style:** `very_good_analysis` lints; `dart format` enforced.
- **Docs:** Keep these 7 docs in `docs/flutter/` updated as source of truth.

## Risks & Mitigations
- **Innertube format/cipher changes** → server-side n-param resolver auto-updates from latest `player.js`; daily smoke test.
- **iOS background audio review** → ensure `UIBackgroundModes: audio` justified in App Review notes.
- **YouTube ToS** → app positioned as personal listening client; no ad-skipping claims; no rehosting of audio.
- **Storage bloat from downloads** → settings shows usage + per-quality cap with auto-eviction LRU.