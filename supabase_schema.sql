create table saved_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  memo text default '',
  companions text[] default '{}',
  category text default '기타',
  created_at timestamptz default now()
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  origin_name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_name text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  created_at timestamptz default now()
);

create table location_shares (
  id uuid primary key default gen_random_uuid(),
  share_code text unique not null,
  lat double precision not null,
  lng double precision not null,
  label text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table saved_places enable row level security;
alter table routes enable row level security;
alter table location_shares enable row level security;

create policy "public access" on saved_places for all using (true) with check (true);
create policy "public access" on routes for all using (true) with check (true);
create policy "public access" on location_shares for all using (true) with check (true);
