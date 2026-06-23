# ARS Music — Features, Elements, Interface & Structure (Flutter)

## Project Structure
```
lib/
  main.dart
  app.dart                       # MaterialApp.router + theme
  core/
    theme/                       # colors, typography, theme data
    routing/                     # GoRouter config
    constants.dart
    haptics.dart
  data/
    models/                      # Song, Album, Artist, Playlist, Mix, User
    repositories/                # CatalogRepo, LibraryRepo, DownloadRepo, AuthRepo
    sources/
      remote/                    # Dio clients for backend (Innertube proxy, Supabase)
      local/                     # Hive boxes, file storage
  features/
    home/        (screen + widgets + controller)
    search/
    library/
    foryou/
    profile/
    artist/
    album/
    playlist/
    mix/
    player/      (full + mini + queue sheet + lyrics)
    downloads/
    auth/
    onboarding/
  services/
    player_service.dart          # audio_service handler
    download_service.dart        # background isolate
    recommendation_service.dart
    connectivity_service.dart
    notification_service.dart
  shared/
    widgets/                     # SongTile, SongCard, SectionHeader, Shimmer, FastImage
    extensions/
state/
  providers.dart                 # Riverpod providers (DI + state)
```

## Feature → Screen → Widget Map

### Home
- Screen: `HomeScreen` (CustomScrollView).
- Widgets: `GreetingHeader`, `QuickPicksGrid`, `HorizontalRail(SongCard)`, `ArtistAvatarRow`.
- Data: `homeFeedProvider` (Riverpod FutureProvider) → CatalogRepo.getHomeFeed().

### Search
- Screen: `SearchScreen` with `SearchAppBar` (mic + text).
- Widgets: `TrendingChips`, `CategoryGrid`, `ResultsTabs` (TabBarView).
- Voice: `speech_to_text` package.

### Library
- Screen: `LibraryScreen` with chips controlling `IndexedStack`.
- Sub-views: `LikedSongs`, `Playlists`, `Albums`, `Artists`, `DownloadsList`.

### For You
- Screen: `ForYouScreen` with `DailyMixCarousel`, `BecauseYouLikedRow`, `DiscoverWeeklyCard`.

### Profile
- Screen: `ProfileScreen` → `SettingsScreen`, `StatsScreen`, `AboutScreen`.

### Artist
- Screen: `ArtistScreen(id)` with `SliverAppBar` + sections.
- Sections: `TopSongsList`, `AlbumsRail`, `SinglesRail`, `FeaturedOnRail`, `RelatedArtistsRail`, `AboutCard`.
- Filter logic: songs where `primaryArtistId == artist.id` go in "Songs"; the rest go in "Featured on".

### Album / Playlist / Mix
- Shared widget: `CollectionScreen(header, tracks, actions)`.
- Header: `CollectionHeader(cover, title, subtitle, ctaRow)`.

### Player
- `MiniPlayer` (persistent in `AppShell`).
- `FullPlayerScreen` — `PageView` for swipe-between-tracks.
- `QueueSheet` — `DraggableScrollableSheet` with `ReorderableListView`.
- `LyricsSheet` — synced lyrics if available (LRC), else plain text.

### Downloads
- `DownloadsScreen` with `ActiveDownloadsList` (StreamProvider on DownloadManager) + `CompletedDownloadsList`.

## Interface Elements (Reusable)
- `FastImage` — wraps `CachedNetworkImage` w/ shimmer + low-res placeholder.
- `PlayBadge` — circular play overlay on covers.
- `LikeButton` — animated heart.
- `SongMenuSheet` — bottom sheet with: Play next, Add to queue, Add to playlist, Go to artist, Go to album, Download, Share, Remove.
- `EqualizerIcon` — 3-bar animated indicator on currently-playing tile.
- `Snack` — themed snackbar above mini player.

## State Management
- **Riverpod 2.x** with code-gen (`riverpod_generator`).
- One provider file per feature; repos exposed as `Provider`, async data as `FutureProvider`/`StreamProvider`, mutable UI state as `NotifierProvider`.
- Player state exposed via `playerStateProvider` (StreamProvider listening to audio_service).

## Navigation
- `go_router` with shell route for bottom nav (keeps tabs alive).
- Deep links: `arsmusic://song/<id>`, `arsmusic://artist/<id>`, etc.

## Permissions
- Android: `INTERNET`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS`, `WAKE_LOCK`, `RECORD_AUDIO` (voice search).
- iOS: `NSMicrophoneUsageDescription`, background audio mode in Info.plist.