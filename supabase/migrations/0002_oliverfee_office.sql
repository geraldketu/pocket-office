-- OliverFee 360 Member Office (merged from Felicia's v30 app).
-- Her app keeps each carrier's office as one JSON "workspace", with files,
-- quote versions and an audit trail beside it. Every request goes through
-- the server (/api/...), which checks membership, so these tables have RLS
-- turned on with no policies: only the server's service-role key can reach them.

-- Who can open which carrier office, and in what role.
create table public.carrier_members (
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  role text not null check (role in ('owner', 'office', 'driver')),
  person_id text,
  created_at timestamptz not null default now(),
  primary key (carrier_id, email)
);
create index carrier_members_user_idx on public.carrier_members (user_id);

-- The office itself: records, people, onboarding answers, plan choices, etc.
create table public.workspaces (
  carrier_id uuid primary key references public.carriers (id) on delete cascade,
  state jsonb not null,
  revision int not null default 0
);

-- Uploaded files (stored in the private carrier-files bucket under <carrier_id>/office/<id>).
create table public.office_files (
  id text primary key,
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  person_id text,
  record_id text,
  purpose text,
  name text not null,
  mime text not null,
  size int not null,
  expires_on date,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index office_files_carrier_idx on public.office_files (carrier_id);

create table public.office_audit (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  user_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

-- Signed, versioned quotes.
create table public.quote_reviews (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers (id) on delete cascade,
  snapshot jsonb not null,
  selection jsonb not null,
  input_hash text not null,
  status text not null,
  signature text,
  signed_at timestamptz,
  signed_by uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  checkout_session text,
  paid_cents int not null default 0
);
create index quote_reviews_carrier_idx on public.quote_reviews (carrier_id);

create table public.stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- One posted national diesel price, used by the bid calculator.
create table public.national_diesel_rate (
  id int primary key check (id = 1),
  price numeric(6, 3) not null check (price > 0),
  rate_date date not null
);

alter table public.carrier_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.office_files enable row level security;
alter table public.office_audit enable row level security;
alter table public.quote_reviews enable row level security;
alter table public.stripe_events enable row level security;
alter table public.national_diesel_rate enable row level security;

-- Give every existing carrier an office, and turn existing carrier logins into owners.
insert into public.workspaces (carrier_id, state)
select c.id, jsonb_build_object(
  'records', '[]'::jsonb, 'people', '[]'::jsonb, 'docs', '[]'::jsonb, 'listings', '[]'::jsonb,
  'jobs', '[]'::jsonb, 'orders', '[]'::jsonb, 'notices', '[]'::jsonb, 'audit', '[]'::jsonb,
  'requests', '[]'::jsonb, 'plan', 'Basic', 'broker', '', 'onboard', null,
  'profile', jsonb_build_object('name', coalesce(c.dba, c.legal_name), 'logo', ''))
from public.carriers c
on conflict (carrier_id) do nothing;

insert into public.carrier_members (carrier_id, email, user_id, role)
select p.carrier_id, lower(p.email), p.id, 'owner'
from public.profiles p
where p.carrier_id is not null and p.role <> 'admin'
on conflict do nothing;
