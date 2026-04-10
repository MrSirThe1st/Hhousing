create table tasks (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date not null,
  status text not null check (status in ('open', 'in_progress', 'done', 'cancelled')),
  source text not null check (source in ('manual', 'system')),
  system_code text check (system_code in ('maintenance_follow_up', 'rent_overdue_follow_up', 'lease_renewal')),
  system_key text,
  assigned_user_id text,
  related_entity_type text check (related_entity_type in ('organization', 'property', 'unit', 'lease', 'tenant', 'payment', 'maintenance_request', 'task', 'custom')),
  related_entity_id text,
  property_id text references properties(id) on delete set null,
  unit_id text references units(id) on delete set null,
  lease_id text references leases(id) on delete set null,
  tenant_id text references tenants(id) on delete set null,
  payment_id text references payments(id) on delete set null,
  maintenance_request_id text references maintenance_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint tasks_system_key_required check (
    (source = 'system' and system_key is not null and system_code is not null)
    or (source = 'manual' and system_key is null)
  )
);

create unique index idx_tasks_system_key on tasks(system_key) where system_key is not null;
create index idx_tasks_org_due_date on tasks(organization_id, due_date asc, status);
create index idx_tasks_org_source on tasks(organization_id, source, status);
create index idx_tasks_property on tasks(property_id) where property_id is not null;
create index idx_tasks_unit on tasks(unit_id) where unit_id is not null;
create index idx_tasks_lease on tasks(lease_id) where lease_id is not null;
create index idx_tasks_tenant on tasks(tenant_id) where tenant_id is not null;

create table calendar_events (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  event_type text not null check (event_type in ('lease', 'rent', 'maintenance', 'custom', 'inspection', 'reminder', 'task')),
  status text not null check (status in ('scheduled', 'in_progress', 'done', 'cancelled')),
  assigned_user_id text,
  related_entity_type text check (related_entity_type in ('organization', 'property', 'unit', 'lease', 'tenant', 'payment', 'maintenance_request', 'task', 'custom')),
  related_entity_id text,
  property_id text references properties(id) on delete set null,
  unit_id text references units(id) on delete set null,
  lease_id text references leases(id) on delete set null,
  tenant_id text references tenants(id) on delete set null,
  payment_id text references payments(id) on delete set null,
  maintenance_request_id text references maintenance_requests(id) on delete set null,
  task_id text references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_end_after_start check (end_at is null or end_at >= start_at)
);

create index idx_calendar_events_org_start on calendar_events(organization_id, start_at asc);
create index idx_calendar_events_org_type on calendar_events(organization_id, event_type, status);
create index idx_calendar_events_property on calendar_events(property_id) where property_id is not null;
create index idx_calendar_events_unit on calendar_events(unit_id) where unit_id is not null;
create index idx_calendar_events_lease on calendar_events(lease_id) where lease_id is not null;
create index idx_calendar_events_tenant on calendar_events(tenant_id) where tenant_id is not null;