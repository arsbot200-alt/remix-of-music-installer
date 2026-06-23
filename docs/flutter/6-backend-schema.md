# ARS Music — Backend Schema (Supabase / Postgres)

## Conventions
- All tables in `public` schema with explicit GRANTs.
- Every user-owned table has RLS scoped to `auth.uid()`.
- Timestamps default to `now()`, UUIDs default to `gen_random_uuid()`.

## Enums
```sql
create type public.app_role as enum ('user', 'admin');
create type public.audio_quality as enum ('low', 'normal', 'high');
create type public.repeat_mode as enum ('off', 'all', 'one');
create type public.collection_kind as enum ('album', 'playlist', 'mix', 'single');
```

## Tables

### profiles
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### user_roles
```sql
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
```

### taste_profile
```sql
create table public.taste_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  artist_ids text[] not null default '{}',
  genres text[] not null default '{}',
  languages text[] not null default '{}',
  updated_at timestamptz default now()
);
```

### liked_songs
```sql
create table public.liked_songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  title text not null,
  artist text,
  album text,
  duration_sec int,
  art_url text,
  liked_at timestamptz default now(),
  primary key (user_id, video_id)
);
create index on public.liked_songs (user_id, liked_at desc);
```

### playlists
```sql
create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### playlist_items
```sql
create table public.playlist_items (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  position int not null,
  video_id text not null,
  title text not null,
  artist text,
  album text,
  duration_sec int,
  art_url text,
  added_at timestamptz default now(),
  primary key (playlist_id, position)
);
create index on public.playlist_items (playlist_id);
```

### recently_played
```sql
create table public.recently_played (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  played_at timestamptz default now(),
  context_kind collection_kind,
  context_id text,
  primary key (user_id, played_at, video_id)
);
create index on public.recently_played (user_id, played_at desc);
```

### listening_events  (raw signal for recommendations)
```sql
create table public.listening_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  artist_ids text[] default '{}',
  duration_listened_sec int not null,
  completed boolean not null,
  skipped boolean not null,
  context_kind collection_kind,
  context_id text,
  created_at timestamptz default now()
);
create index on public.listening_events (user_id, created_at desc);
```

### recommendation_feed  (server-generated)
```sql
create table public.recommendation_feed (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,    -- { dailyMixes:[], discoverWeekly:[], becauseYouLiked:[], newForYou:[] }
  generated_at timestamptz default now()
);
```

### download_records  (client-mirrored for sync)
```sql
create table public.download_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  quality audio_quality not null,
  size_bytes bigint,
  downloaded_at timestamptz default now(),
  primary key (user_id, video_id)
);
```

### stream_cache  (server only — Redis preferred, table as fallback)
```sql
create table public.stream_cache (
  video_id text not null,
  quality audio_quality not null,
  url text not null,
  mime_type text,
  bitrate int,
  expires_at timestamptz not null,
  primary key (video_id, quality)
);
```

## GRANTs
```sql
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.taste_profile, public.liked_songs,
      public.playlists, public.playlist_items, public.recently_played,
      public.listening_events, public.download_records to authenticated;
grant select on public.recommendation_feed to authenticated;
grant all on all tables in schema public to service_role;
```

## Security Definer
```sql
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role);
$$;
```

## RLS Policies (representative)
```sql
alter table public.liked_songs enable row level security;
create policy "own liked read"  on public.liked_songs for select to authenticated using (user_id = auth.uid());
create policy "own liked write" on public.liked_songs for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.playlists enable row level security;
create policy "own or public read" on public.playlists for select to authenticated using (owner_id = auth.uid() or is_public);
create policy "own write"          on public.playlists for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.playlist_items enable row level security;
create policy "items via playlist" on public.playlist_items for all to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and (p.owner_id = auth.uid() or p.is_public)))
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid()));

alter table public.recently_played    enable row level security;
alter table public.listening_events   enable row level security;
alter table public.taste_profile      enable row level security;
alter table public.download_records   enable row level security;
alter table public.recommendation_feed enable row level security;

create policy "own rp"  on public.recently_played    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own le"  on public.listening_events   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tp"  on public.taste_profile      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own dl"  on public.download_records   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rec" on public.recommendation_feed for select to authenticated using (user_id = auth.uid());
```

## Edge Functions / Server Endpoints
- `catalog-home`, `catalog-search`, `catalog-artist`, `catalog-album`, `catalog-playlist`, `catalog-mix`, `catalog-song` — read-through cached Innertube wrappers.
- `stream-resolve` — resolves `videoId` + quality → signed URL; writes to `stream_cache`.
- `recommend-build` — pg_cron every 6h per active user; writes `recommendation_feed.payload`.
- `events-ingest` — batches `listening_events` inserts (POST array).

## Storage Buckets
- `playlist-covers` (public read, owner write).
- `avatars` (public read, owner write).