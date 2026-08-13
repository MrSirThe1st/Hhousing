-- Marketplace seeker identity, favorites, marketing prefs, application linkage.
-- Viewing requests table supports Mes demandes (submit UI comes in Phase 1).

create table if not exists marketplace_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_profiles_created
  on marketplace_profiles (created_at desc);

create table if not exists user_marketing_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_new_listings boolean not null default false,
  email_haraka_news boolean not null default false,
  whatsapp_new_listings boolean not null default false,
  whatsapp_haraka_news boolean not null default false,
  whatsapp_phone text,
  email_opted_in_at timestamptz,
  email_opted_out_at timestamptz,
  whatsapp_opted_in_at timestamptz,
  whatsapp_opted_out_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists saved_listings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index if not exists idx_saved_listings_user
  on saved_listings (user_id, created_at desc);

create index if not exists idx_saved_listings_listing
  on saved_listings (listing_id);

alter table listing_applications
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_listing_applications_user
  on listing_applications (user_id, created_at desc)
  where user_id is not null;

create table if not exists viewing_requests (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  preferred_date text,
  message text,
  status text not null default 'submitted'
    check (status in ('submitted', 'contacted', 'scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_viewing_requests_user
  on viewing_requests (user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_viewing_requests_org
  on viewing_requests (organization_id, status, created_at desc);

create index if not exists idx_viewing_requests_listing
  on viewing_requests (listing_id, created_at desc);

alter table marketplace_profiles enable row level security;
alter table user_marketing_preferences enable row level security;
alter table saved_listings enable row level security;
alter table viewing_requests enable row level security;

-- Middleware / SSR detect marketplace profiles via the user JWT (select only).
-- Writes stay denied by default (no insert/update/delete policies for authenticated).
drop policy if exists "users_read_own_marketplace_profile" on marketplace_profiles;
create policy "users_read_own_marketplace_profile" on marketplace_profiles
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users_read_own_marketing_preferences" on user_marketing_preferences;
create policy "users_read_own_marketing_preferences" on user_marketing_preferences
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users_read_own_saved_listings" on saved_listings;
create policy "users_read_own_saved_listings" on saved_listings
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users_read_own_viewing_requests" on viewing_requests;
create policy "users_read_own_viewing_requests" on viewing_requests
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "members_read_org_viewing_requests" on viewing_requests;
create policy "members_read_org_viewing_requests" on viewing_requests
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

