-- Kör detta i Supabase SQL Editor (Database → SQL Editor → New query)

create table if not exists kunder (
  id text primary key,
  typ text not null default 'foretag',
  namn text not null,
  kontakt text default '',
  telefon text default '',
  epost text default '',
  adress text default '',
  ort text default '',
  created_at timestamptz default now()
);

create table if not exists objekt (
  id text primary key,
  typ text not null,
  namn text not null,
  kund text default '',
  kund_typ text default 'foretag',
  fabrikat text default '',
  ar integer,
  adress text default '',
  senaste text default '',
  nasta text default '',
  intervall_procent integer default 0,
  dager_forsenad integer default 0,
  status text default 'ny',
  protokoll text default '',
  punkter integer default 0,
  historik jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists arenden (
  id text primary key,
  nr text default '',
  typ text default 'felanmalan',
  namn text not null,
  kund text default '',
  feltyp text default '',
  beskrivning text default '',
  kontakt text default '',
  datum text default '',
  status text default 'ny',
  prioritet text default 'normal',
  tekniker text,
  besok text,
  created_at timestamptz default now()
);

create table if not exists tekniker (
  id serial primary key,
  namn text not null unique,
  created_at timestamptz default now()
);

create table if not exists bokningar (
  id serial primary key,
  datum text not null,
  tid text default '',
  typ text default 'service',
  namn text not null,
  kund text default '',
  tek text default '',
  arende_id text,
  created_at timestamptz default now()
);

-- Tillåt läsning och skrivning med anon-nyckeln (internt verktyg)
alter table kunder enable row level security;
create policy "Tillåt allt" on kunder for all using (true) with check (true);

alter table objekt enable row level security;
create policy "Tillåt allt" on objekt for all using (true) with check (true);

alter table arenden enable row level security;
create policy "Tillåt allt" on arenden for all using (true) with check (true);

alter table tekniker enable row level security;
create policy "Tillåt allt" on tekniker for all using (true) with check (true);

alter table bokningar enable row level security;
create policy "Tillåt allt" on bokningar for all using (true) with check (true);
