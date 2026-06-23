# ARS Music — Product Requirements Document (Flutter Native)

## 1. Vision
A fast, native Android/iOS music app that streams YouTube Music's catalog with a clean, Spotify-grade UX, full offline support, and true background playback. Built with Flutter for one codebase across mobile platforms.

## 2. Target Users
- Listeners who want YT Music's catalog with a lighter, faster, ad-free-feeling UI.
- Users in regions where premium subscriptions are expensive — offline downloads matter.
- Power users wanting fine queue control, lyrics, and stats.

## 3. Goals
- **Performance:** first frame < 1.2s on mid-tier Android; track tap → audio start < 800ms on Wi-Fi.
- **Reliability:** background playback survives app backgrounding, screen lock, and >1h sessions.
- **Offline:** any song/album/playlist downloadable; full offline browse of downloads.
- **Personalization:** recommendations improve with listening history.

## 4. Non-Goals
- Video playback (audio only).
- Social feed / sharing of listening activity.
- Podcasts (v1).

## 5. Core User Stories
1. As a user, I can search any song/artist and start playing in one tap.
2. As a user, I can browse an artist's page and see only their songs (with a separate "Featured on" section).
3. As a user, I can lock my screen and music keeps playing with notification controls.
4. As a user, I can download a playlist for offline listening on a flight.
5. As a user, I get a "For You" page with mixes tuned to my taste.
6. As a user, I can like songs, build playlists, and see my listening stats.
7. As a user, the app remembers my queue and resumes where I left off after a restart.

## 6. Functional Requirements
- Auth: email magic link, Google sign-in.
- Catalog access via Innertube (YouTube Music internal API) proxied through our backend.
- Streaming via direct audio URLs resolved server-side and cached.
- Player: queue, shuffle, repeat (off/all/one), seek, gapless where possible.
- Background: foreground service with media notification, lockscreen art, Bluetooth/headset controls.
- Library: liked songs, user playlists, recently played (last 100), top artists/songs.
- Downloads: per-song or batch; quality setting (low/normal/high).
- Recommendations: home rows + For You page driven by taste profile + listening history.
- Settings: audio quality, theme, clear cache, account, about.

## 7. Non-Functional Requirements
- Offline-first cache for all read endpoints (Hive TTL).
- Crash-free sessions > 99.5% (Sentry).
- All network calls timeout at 12s with retry+backoff.
- Accessibility: TalkBack/VoiceOver labels on all interactive elements; min tap target 44dp.
- Privacy: no third-party analytics beyond crash reporting; listening history stays in user's Supabase row.

## 8. Platforms
- Android 7.0+ (API 24+).
- iOS 13+.

## 9. Success Metrics
- D1 retention > 35%, D7 > 18%.
- Median session length > 15 min.
- Background playback failure rate < 1%.
- Crash-free users > 99.5%.

## 10. Out of Scope (v1)
Web build, desktop, CarPlay/Android Auto (planned v2), social, podcasts, video.