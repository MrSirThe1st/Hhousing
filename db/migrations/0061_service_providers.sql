-- Service provider directory (Prestataires): categories, providers, property assignment.

create table if not exists service_provider_categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_provider_categories_sort
  on service_provider_categories (sort_order, name);

create table if not exists service_providers (
  id text primary key,
  organization_id text references organizations(id) on delete cascade,
  category_id text not null references service_provider_categories(id) on delete restrict,
  name text not null,
  phone text not null,
  whatsapp_phone text,
  description text,
  coverage_area text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  is_verified boolean not null default false,
  created_by_organization_id text references organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_providers_org
  on service_providers (organization_id, status, name);

create index if not exists idx_service_providers_platform
  on service_providers (status, name)
  where organization_id is null;

create index if not exists idx_service_providers_category
  on service_providers (category_id);

create index if not exists idx_service_providers_created_by_org
  on service_providers (created_by_organization_id)
  where created_by_organization_id is not null;

create table if not exists property_service_providers (
  property_id text not null references properties(id) on delete cascade,
  service_provider_id text not null references service_providers(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (property_id, service_provider_id)
);

create index if not exists idx_property_service_providers_org
  on property_service_providers (organization_id, property_id);

create index if not exists idx_property_service_providers_provider
  on property_service_providers (service_provider_id);

-- Seed default FR categories for MVP usability.
insert into service_provider_categories (id, name, slug, sort_order)
values
  ('spc_plomberie', 'Plomberie', 'plomberie', 10),
  ('spc_electricite', 'Électricité', 'electricite', 20),
  ('spc_securite', 'Sécurité', 'securite', 30),
  ('spc_automatisme', 'Automatisme', 'automatisme', 40),
  ('spc_peinture', 'Peinture', 'peinture', 50),
  ('spc_autre', 'Autre', 'autre', 100)
on conflict (id) do nothing;

alter table if exists public.service_provider_categories enable row level security;
alter table if exists public.service_providers enable row level security;
alter table if exists public.property_service_providers enable row level security;

-- Server Postgres (service role / direct) bypasses RLS. Deny client Data API access.
drop policy if exists "deny_all_service_provider_categories" on public.service_provider_categories;
create policy "deny_all_service_provider_categories" on public.service_provider_categories
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_all_service_providers" on public.service_providers;
create policy "deny_all_service_providers" on public.service_providers
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_all_property_service_providers" on public.property_service_providers;
create policy "deny_all_property_service_providers" on public.property_service_providers
  as restrictive for all to public
  using (false)
  with check (false);
