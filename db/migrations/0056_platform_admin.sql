-- Platform SaaS admin: global admins, account-level suspend, platform audit.
-- Source of truth for platform_admin access is platform_admins (not organization_memberships.role).

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_platform_admins_status
  on platform_admins (status, created_at desc);

create table if not exists platform_user_statuses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  reason text,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_platform_user_statuses_status
  on platform_user_statuses (status, updated_at desc);

create table if not exists platform_audit_logs (
  id text primary key,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_audit_logs_created
  on platform_audit_logs (created_at desc);

create index if not exists idx_platform_audit_logs_actor
  on platform_audit_logs (actor_user_id, created_at desc);

alter table if exists public.platform_admins enable row level security;
alter table if exists public.platform_user_statuses enable row level security;
alter table if exists public.platform_audit_logs enable row level security;

-- Middleware / SSR need to detect platform admin via the user JWT.
-- Writes stay denied by default (no insert/update/delete policies for authenticated).
drop policy if exists "users_read_own_platform_admin" on public.platform_admins;
create policy "users_read_own_platform_admin" on public.platform_admins
  as permissive for select to authenticated
  using (user_id = auth.uid());

-- Platform user statuses and audit logs: no client policies (server Postgres bypasses RLS).
drop policy if exists "deny_all_platform_user_statuses" on public.platform_user_statuses;
create policy "deny_all_platform_user_statuses" on public.platform_user_statuses
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_all_platform_audit_logs" on public.platform_audit_logs;
create policy "deny_all_platform_audit_logs" on public.platform_audit_logs
  as restrictive for all to public
  using (false)
  with check (false);
