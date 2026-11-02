-- Pocket Office: initial schema
-- Run this once in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Carriers (the trucking companies)
-- ---------------------------------------------------------------------------
create table public.carriers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba text,
  usdot text,
  mc text,
  phone text,
  email text,
  address text,
  tier text,
  status text not null default 'active' check (status in ('onboarding', 'active', 'paused', 'cancelled')),
  slug text unique,
  consortium text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: one row per login (the "users" table from CLAUDE.md).
-- Linked 1:1 to Supabase's auth.users.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'carrier' check (role in ('admin', 'carrier', 'driver')),
  carrier_id uuid references public.carriers (id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Every new auth user gets a profile. Role/carrier are set by the server
-- afterwards (never from user-supplied metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers used by row-level security policies.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_carrier_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select carrier_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Leads (from DOT notices and the website contact form)
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  usdot text,
  phone text,
  email text,
  source text not null default 'manual',
  status text not null default 'new' check (status in ('new', 'called', 'quoted', 'paid', 'active', 'lost')),
  quoted_price numeric(10, 2),
  notes text,
  message text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Document types + documents (the vault)
-- ---------------------------------------------------------------------------
create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'General',
  renews_every_months int,
  required boolean not null default false,
  sort_order int not null default 100
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  type_id uuid not null references public.document_types (id),
  file_path text not null,
  file_name text,
  mime_type text,
  issued_on date,
  expires_on date,
  status text not null default 'active' check (status in ('active', 'superseded', 'rejected')),
  notes text,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index documents_carrier_idx on public.documents (carrier_id);
create index documents_expires_idx on public.documents (expires_on);

-- ---------------------------------------------------------------------------
-- IFTA: fuel receipts + mileage
-- ---------------------------------------------------------------------------
create table public.fuel_receipts (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  image_path text not null,
  date date,
  station text,
  city text,
  state text,
  gallons numeric(10, 3),
  price_per_gallon numeric(10, 3),
  total numeric(10, 2),
  tax numeric(10, 2),
  extracted_json jsonb,
  created_at timestamptz not null default now()
);
create index fuel_receipts_carrier_idx on public.fuel_receipts (carrier_id, date);

create table public.mileage_entries (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  date date not null,
  state text not null,
  miles numeric(10, 1) not null check (miles >= 0),
  truck_unit text,
  trip_note text,
  created_at timestamptz not null default now()
);
create index mileage_entries_carrier_idx on public.mileage_entries (carrier_id, date);

-- ---------------------------------------------------------------------------
-- Drug & alcohol testing records
-- ---------------------------------------------------------------------------
create table public.dat_records (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  consortium text,
  test_type text not null check (test_type in (
    'enrollment', 'pre_employment', 'random', 'post_accident',
    'reasonable_suspicion', 'return_to_duty', 'follow_up',
    'clearinghouse_pre_employment', 'clearinghouse_annual'
  )),
  date date,
  result text,
  file_path text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid references public.carriers (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  amount numeric(10, 2) not null,
  tier text,
  description text,
  stripe_id text,
  paid_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- Admin sees everything. A carrier user sees only rows for their own carrier.
-- Leads and payments are admin-only.
-- ---------------------------------------------------------------------------
alter table public.carriers enable row level security;
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.document_types enable row level security;
alter table public.documents enable row level security;
alter table public.fuel_receipts enable row level security;
alter table public.mileage_entries enable row level security;
alter table public.dat_records enable row level security;
alter table public.payments enable row level security;

-- profiles: read your own; admin reads/updates all. No self-updates (role can't be changed by the user).
create policy "profiles: self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: admin write" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- carriers
create policy "carriers: read own" on public.carriers for select using (id = public.my_carrier_id() or public.is_admin());
create policy "carriers: admin all" on public.carriers for all using (public.is_admin()) with check (public.is_admin());

-- leads + payments: admin only
create policy "leads: admin all" on public.leads for all using (public.is_admin()) with check (public.is_admin());
create policy "payments: admin all" on public.payments for all using (public.is_admin()) with check (public.is_admin());

-- document types: anyone signed in can read, admin edits
create policy "document_types: read" on public.document_types for select using (auth.uid() is not null);
create policy "document_types: admin all" on public.document_types for all using (public.is_admin()) with check (public.is_admin());

-- Carrier-owned tables: same rule for each.
create policy "documents: own or admin" on public.documents for all
  using (carrier_id = public.my_carrier_id() or public.is_admin())
  with check (carrier_id = public.my_carrier_id() or public.is_admin());
create policy "fuel_receipts: own or admin" on public.fuel_receipts for all
  using (carrier_id = public.my_carrier_id() or public.is_admin())
  with check (carrier_id = public.my_carrier_id() or public.is_admin());
create policy "mileage_entries: own or admin" on public.mileage_entries for all
  using (carrier_id = public.my_carrier_id() or public.is_admin())
  with check (carrier_id = public.my_carrier_id() or public.is_admin());
create policy "dat_records: own or admin" on public.dat_records for all
  using (carrier_id = public.my_carrier_id() or public.is_admin())
  with check (carrier_id = public.my_carrier_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- File storage: one private bucket. Files live under "<carrier_id>/...",
-- so the first folder in the path decides who may touch the file.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('carrier-files', 'carrier-files', false, 26214400) -- 25 MB
on conflict (id) do nothing;

create policy "carrier-files: read own or admin" on storage.objects for select
  using (bucket_id = 'carrier-files' and (
    (storage.foldername(name))[1] = public.my_carrier_id()::text or public.is_admin()));
create policy "carrier-files: upload own or admin" on storage.objects for insert
  with check (bucket_id = 'carrier-files' and (
    (storage.foldername(name))[1] = public.my_carrier_id()::text or public.is_admin()));
create policy "carrier-files: delete own or admin" on storage.objects for delete
  using (bucket_id = 'carrier-files' and (
    (storage.foldername(name))[1] = public.my_carrier_id()::text or public.is_admin()));

-- ---------------------------------------------------------------------------
-- Seed: starter document types
-- ---------------------------------------------------------------------------
insert into public.document_types (name, category, renews_every_months, required, sort_order) values
  ('USDOT number / MCS-150',               'Authority',   24,   true,  10),
  ('MC number / operating authority',      'Authority',   null, true,  20),
  ('BOC-3 (process agent filing)',         'Authority',   null, true,  30),
  ('UCR (Unified Carrier Registration)',   'Authority',   12,   true,  40),
  ('Insurance certificate (COI)',          'Insurance',   12,   true,  50),
  ('CDL',                                  'Driver',      null, true,  60),
  ('DOT medical card',                     'Driver',      24,   true,  70),
  ('Driver Qualification (DQ) file item',  'Driver',      null, false, 80),
  ('IFTA license',                         'Fuel tax',    12,   true,  90),
  ('IFTA quarterly return',                'Fuel tax',    3,    false, 100),
  ('IRP apportioned registration / cab card', 'Vehicle',  12,   true,  110),
  ('Form 2290 (Heavy Vehicle Use Tax)',    'Vehicle',     12,   true,  120),
  ('Annual vehicle inspection',            'Vehicle',     12,   true,  130),
  ('NY HUT permit',                        'State permits', null, false, 140),
  ('KY KYU permit',                        'State permits', null, false, 150),
  ('Oregon weight-mile permit',            'State permits', null, false, 160),
  ('New Mexico weight-distance permit',    'State permits', null, false, 170),
  ('Drug & alcohol consortium enrollment', 'Drug & alcohol', 12, true,  180),
  ('Drug & alcohol test result',           'Drug & alcohol', null, false, 190),
  ('FMCSA Clearinghouse query',            'Drug & alcohol', 12, true,  200),
  ('Trailer interchange agreement',        'Other',       null, false, 210),
  ('Lease agreement',                      'Other',       null, false, 220),
  ('Misc. permit',                         'Other',       null, false, 230);
