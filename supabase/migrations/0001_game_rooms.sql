-- Party Arena: game room storage
-- Applied to Supabase project uzwuznmrrggoobfdaaue

create table if not exists public.game_rooms (
  code        text primary key,
  game        text not null check (game in ('bingo', 'dots', 'papergun')),
  state       jsonb not null,
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists game_rooms_updated_at_idx on public.game_rooms (updated_at);

-- Lock the table down completely for direct browser queries.
-- Room state contains secrets (Bingo cards, Paper Gun shields), so ONLY the
-- Next.js server (using either SUPABASE_SERVICE_ROLE_KEY or the secret
-- x-party-server-key header) may read/write it.
alter table public.game_rooms enable row level security;

grant select, insert, update, delete on table public.game_rooms to anon, authenticated;

create policy "server_only_access" on public.game_rooms
  for all
  to anon, authenticated
  using (
    coalesce(((select current_setting('request.headers', true))::json ->> 'x-party-server-key'), '')
    = 'party_srv_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a'
  )
  with check (
    coalesce(((select current_setting('request.headers', true))::json ->> 'x-party-server-key'), '')
    = 'party_srv_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a'
  );
