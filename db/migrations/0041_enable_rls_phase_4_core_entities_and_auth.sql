-- Phase 4: core entity graph + org/auth source of truth
-- Keep this last because it has the highest breakage risk.

alter table if exists public.owners enable row level security;
alter table if exists public.tenants enable row level security;
alter table if exists public.leases enable row level security;
alter table if exists public.units enable row level security;
alter table if exists public.properties enable row level security;
alter table if exists public.organizations enable row level security;
alter table if exists public.organization_memberships enable row level security;
