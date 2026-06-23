# ARS Music — UI / UX Design & Layout (Flutter)

## Design Language
- **Theme:** Dark-first, Spotify/YT Music inspired, no skeuomorphism, no purple gradients.
- **Background:** `#0A0A0A` base, `#141414` surface, `#1C1C1C` elevated cards.
- **Primary accent:** `#FF2E63` (ARS pink/red) — used sparingly for play buttons + active states.
- **Text:** `#FFFFFF` primary, `#A0A0A0` secondary, `#6B6B6B` tertiary.
- **Typography:** `Inter` for body/UI, `Inter Display` (or `SF Pro` fallback) for big headers. Sizes via `theme.textTheme`.
- **Radius:** 12dp cards, 16dp sheets, 999dp pills, 8dp images for square thumbs, 4dp for tight rows.
- **Motion:** 200–280ms `Curves.easeOutCubic`; hero animations for cover art mini→full; subtle scale (0.96) on tap.
- **No glow, no heavy blur**, light frosted only for mini player (`BackdropFilter(sigmaX:18,sigmaY:18)` over surface @ 92% opacity).

## Global Components
- **AppShell** — `Scaffold` with `IndexedStack` body, `MiniPlayer` + `BottomNavigationBar` stacked.
- **MiniPlayer** — 64dp tall, cover (48), title/artist, play/pause, next. Tap → opens full player with hero.
- **BottomNav** — 5 items, label always shown, no shifting animation.
- **SongTile** — 56dp row: cover, title (1 line), artist · meta, trailing menu (`…`).
- **SongCard** (grid/horizontal scroll) — 140–160dp wide, square cover, 2-line caption.
- **SectionHeader** — title + optional "See all" → pushes list screen.

## Screens & Positions

### Home (`/`)
```
┌───────────────────────────────┐
│ Greeting + avatar       (top) │
│ Quick picks grid (2×4)        │
│ Recently played (h-scroll)    │
│ Made for you (h-scroll)       │
│ Trending now (h-scroll)       │
│ New releases (h-scroll)       │
│ Top artists (circular avatars)│
└───────────────────────────────┘
```

### Search (`/search`)
- Sticky search bar (top) with mic icon → speech_to_text.
- Empty state: trending searches + browse categories grid (mood/genre tiles).
- Result tabs: All / Songs / Artists / Albums / Playlists (segmented control).

### Library (`/library`)
- Chips row: Playlists · Songs · Albums · Artists · Downloads.
- Sort/filter top right.
- Grid (2 cols) for collections, list for songs.

### For You (`/foryou`)
- Daily mix cards (large), New for you, Because you liked X, Discover weekly.

### Profile (`/profile`)
- Avatar, name, stats (minutes listened, top artist).
- Settings: audio quality, downloads quality, theme, clear cache, sign out.

### Artist (`/artist/:id`)
- Collapsing `SliverAppBar` with artist image + gradient scrim.
- Big "Play" + "Shuffle" pills under header.
- Sections (in order): Popular songs (top 5, expand), Albums (h-scroll), Singles & EPs, Featured on, Related artists, About.

### Album / Playlist / Mix
- Header: square cover (240dp), title, owner, year, total duration.
- Sticky action bar (Play, Shuffle, Download, More).
- Track list with index numbers.

### Full Player (`/player`)
- Top: down-chevron + "Playing from <context>" + menu.
- Center: hero cover art (square, 88% screen width), rounded 16dp.
- Title + artist (marquee if overflow).
- Seek bar with current/remaining time.
- Primary controls row: shuffle · prev · **play/pause (64dp filled circle)** · next · repeat.
- Secondary row: like · download · add to playlist · queue · share.
- Swipe-up sheet: Lyrics / Up Next / Related.

### Downloads (`/downloads`)
- Active downloads with progress bars at top.
- Completed list below, total storage usage chip.

## UX Rules
- Every list is lazy (`ListView.builder` / `SliverList`).
- Images via `cached_network_image` with low-res placeholder (`thumbnails[0].url`) → swap to high-res.
- Skeleton shimmer (`shimmer` package) for first paint, never spinners on content screens.
- Haptic light tap on play/pause and like.
- Pull-to-refresh on Home, Library, For You.
- Snackbars at bottom above mini player, never overlap.