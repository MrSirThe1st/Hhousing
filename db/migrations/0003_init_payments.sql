-- Slice 3: Payments
-- Tracks rent payments against a specific lease.
-- due_date drives overdue detection; paid_date is set when status=paid.

create table payments (
  id              text          primary key,
  organization_id text          not null references organizations(id),
  lease_id        text          not null references leases(id),
  tenant_id       text          not null references tenants(id),
  amount          numeric(12,2) not null,
  currency_code   text          not null default 'USD',
  due_date        date          not null,
  paid_date       date,                       -- null until status=paid
  status          text          not null default 'pending'
                                check (status in ('pending','paid','overdue','cancelled')),
  note            text,
  created_at      timestamptz   not null default now()
);

create index idx_payments_organization_id on payments(organization_id);
create index idx_payments_lease_id        on payments(lease_id);
create index idx_payments_tenant_id       on payments(tenant_id);
create index idx_payments_due_date        on payments(due_date);
create index idx_payments_status          on payments(status);
