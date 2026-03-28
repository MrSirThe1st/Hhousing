-- Slice 4: Maintenance Requests
-- Submitted by tenants or managers against a specific unit.
-- Priority and status drive triage; resolved_at is set when status=resolved.

create table maintenance_requests (
  id              text        primary key,
  organization_id text        not null references organizations(id),
  unit_id         text        not null references units(id),
  tenant_id       text        references tenants(id),  -- null if opened by manager
  title           text        not null,
  description     text        not null,
  priority        text        not null default 'medium'
                              check (priority in ('low','medium','high','urgent')),
  status          text        not null default 'open'
                              check (status in ('open','in_progress','resolved','cancelled')),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_maintenance_requests_organization_id on maintenance_requests(organization_id);
create index idx_maintenance_requests_unit_id         on maintenance_requests(unit_id);
create index idx_maintenance_requests_tenant_id       on maintenance_requests(tenant_id) where tenant_id is not null;
create index idx_maintenance_requests_status          on maintenance_requests(status);
