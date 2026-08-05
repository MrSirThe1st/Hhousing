-- Admin slice 2: support tickets for platform ops.
-- Product analytics stay in PostHog; tickets are control-plane only.

create table if not exists support_tickets (
  id text primary key,
  subject text not null,
  description text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  organization_id text references organizations(id) on delete set null,
  related_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_status_created
  on support_tickets (status, created_at desc);

create index if not exists idx_support_tickets_organization
  on support_tickets (organization_id, created_at desc)
  where organization_id is not null;

create index if not exists idx_support_tickets_assigned
  on support_tickets (assigned_to_user_id, status)
  where assigned_to_user_id is not null;

alter table if exists public.support_tickets enable row level security;

drop policy if exists "deny_all_support_tickets" on public.support_tickets;
create policy "deny_all_support_tickets" on public.support_tickets
  as restrictive for all to public
  using (false)
  with check (false);
