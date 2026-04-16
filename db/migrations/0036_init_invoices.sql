-- Slice 36: Invoices
-- Introduces lease-scoped invoices, payment application tracking,
-- lease credit balances for overpayments, and async invoice email jobs.

create table invoices (
  id                text          primary key,
  organization_id   text          not null references organizations(id),
  lease_id          text          not null references leases(id),
  tenant_id         text          not null references tenants(id),
  property_id       text          not null references properties(id),
  unit_id           text          not null references units(id),
  invoice_year      integer       not null check (invoice_year between 2000 and 2200),
  invoice_sequence  integer       not null check (invoice_sequence > 0),
  invoice_number    text          not null,
  invoice_type      text          not null check (invoice_type in ('monthly', 'one_time')),
  period            text          check (period is null or period ~ '^\d{4}-(?:0[1-9]|1[0-2])$'),
  issue_date        date          not null,
  due_date          date          not null,
  currency_code     text          not null,
  total_amount      numeric(12,2) not null check (total_amount > 0),
  amount_paid       numeric(12,2) not null default 0 check (amount_paid >= 0 and amount_paid <= total_amount),
  status            text          not null default 'issued' check (status in ('issued', 'partial', 'paid', 'void')),
  paid_at           date,
  email_status      text          not null default 'not_sent' check (email_status in ('not_sent', 'queued', 'sent', 'failed')),
  email_sent_count  integer       not null default 0 check (email_sent_count >= 0),
  last_emailed_at   timestamptz,
  last_email_error  text,
  void_reason       text,
  voided_at         timestamptz,
  source_payment_id text          references payments(id) on delete set null,
  created_at        timestamptz   not null default now(),
  constraint invoices_period_required_for_monthly check (
    (invoice_type = 'monthly' and period is not null)
    or (invoice_type = 'one_time')
  ),
  constraint invoices_paid_at_when_paid check (
    (status = 'paid' and paid_at is not null)
    or (status <> 'paid')
  ),
  constraint invoices_void_metadata check (
    (status = 'void' and voided_at is not null)
    or (status <> 'void')
  )
);

create unique index idx_invoices_org_year_sequence
  on invoices(organization_id, invoice_year, invoice_sequence);

create unique index idx_invoices_org_invoice_number
  on invoices(organization_id, invoice_number);

create unique index idx_invoices_org_lease_period
  on invoices(organization_id, lease_id, period)
  where period is not null and status <> 'void';

create index idx_invoices_org_lease on invoices(organization_id, lease_id);
create index idx_invoices_org_status on invoices(organization_id, status);
create index idx_invoices_org_email_status on invoices(organization_id, email_status);
create index idx_invoices_org_due_date on invoices(organization_id, due_date);

create table invoice_payment_applications (
  id              text          primary key,
  organization_id text          not null references organizations(id),
  invoice_id      text          not null references invoices(id) on delete cascade,
  payment_id      text          not null references payments(id) on delete restrict,
  applied_amount  numeric(12,2) not null check (applied_amount > 0),
  applied_at      timestamptz   not null default now(),
  created_at      timestamptz   not null default now(),
  unique (organization_id, payment_id)
);

create index idx_invoice_payment_applications_invoice_id
  on invoice_payment_applications(invoice_id);

create table lease_credit_balances (
  id              text          primary key,
  organization_id text          not null references organizations(id),
  lease_id        text          not null references leases(id),
  currency_code   text          not null,
  credit_amount   numeric(12,2) not null default 0 check (credit_amount >= 0),
  updated_at      timestamptz   not null default now(),
  unique (organization_id, lease_id, currency_code)
);

create table invoice_email_jobs (
  id               text        primary key,
  organization_id  text        not null references organizations(id),
  invoice_id       text        not null references invoices(id) on delete cascade,
  job_kind         text        not null check (job_kind in ('send', 'resend', 'auto_on_paid')),
  status           text        not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed')),
  attempt_count    integer     not null default 0 check (attempt_count >= 0),
  max_attempts     integer     not null default 3 check (max_attempts > 0),
  next_attempt_at  timestamptz not null default now(),
  last_error       text,
  locked_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_invoice_email_jobs_queue
  on invoice_email_jobs(status, next_attempt_at);

create index idx_invoice_email_jobs_invoice
  on invoice_email_jobs(invoice_id);





