-- Finance ledger foundation + move-out core schema.
-- This establishes a single financial source-of-truth layer,
-- a central category registry, and deterministic close snapshot boundaries.

create table finance_ledger_accounts (
  code text primary key,
  display_name text not null,
  description text,
  normal_balance text not null check (normal_balance in ('debit', 'credit')),
  created_at timestamptz not null default now()
);

insert into finance_ledger_accounts (code, display_name, description, normal_balance)
values
  ('tenant_receivable', 'Tenant receivable', 'Operational receivables owed by a tenant to the lease ledger.', 'debit'),
  ('deposit_liability', 'Deposit liability', 'Security deposits held on behalf of tenants and refundable after settlement.', 'credit');

create table finance_ledger_categories (
  category_code text primary key,
  display_name text not null,
  description text,
  allowed_entry_types text[] not null,
  allowed_account_codes text[] not null,
  direction_policy text not null check (direction_policy in ('debit', 'credit', 'caller_supplied')),
  allow_manual_direction boolean not null default false,
  requires_approval boolean not null default false,
  is_deposit_category boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint finance_ledger_categories_allowed_entry_types_non_empty check (cardinality(allowed_entry_types) > 0),
  constraint finance_ledger_categories_allowed_account_codes_non_empty check (cardinality(allowed_account_codes) > 0)
);

insert into finance_ledger_categories (
  category_code,
  display_name,
  description,
  allowed_entry_types,
  allowed_account_codes,
  direction_policy,
  allow_manual_direction,
  requires_approval,
  is_deposit_category
)
values
  ('rent_charge', 'Rent charge', 'Standard rent receivable posted to tenant receivable.', array['charge'], array['tenant_receivable'], 'debit', false, false, false),
  ('prorated_rent_charge', 'Prorated rent charge', 'Partial rent charge generated from shared proration rules.', array['charge'], array['tenant_receivable'], 'debit', false, false, false),
  ('fee_charge', 'Fee charge', 'Lease fee or administrative fee charged to tenant.', array['charge'], array['tenant_receivable'], 'debit', false, false, false),
  ('penalty_charge', 'Penalty charge', 'Late or breach penalty charged to tenant.', array['charge'], array['tenant_receivable'], 'debit', false, false, false),
  ('damage_charge', 'Damage charge', 'Move-out or inspection damage charge billed to tenant.', array['charge'], array['tenant_receivable'], 'debit', false, false, false),
  ('cleaning_charge', 'Cleaning charge', 'Move-out cleaning charge billed to tenant.', array['charge'], array['tenant_receivable'], 'debit', false, false, false),
  ('tenant_payment', 'Tenant payment', 'Cash collection reducing tenant receivable.', array['payment'], array['tenant_receivable'], 'credit', false, false, false),
  ('deposit_received', 'Deposit received', 'Security deposit intake increasing liability.', array['liability_movement'], array['deposit_liability'], 'credit', false, false, true),
  ('deposit_refund', 'Deposit refund', 'Security deposit refund decreasing liability.', array['liability_movement'], array['deposit_liability'], 'debit', false, false, true),
  ('credit_adjustment', 'Credit adjustment', 'Receivable credit adjustment reducing tenant receivable.', array['adjustment'], array['tenant_receivable'], 'credit', false, false, false),
  ('writeoff_adjustment', 'Write-off adjustment', 'Approved write-off reducing tenant receivable.', array['adjustment'], array['tenant_receivable'], 'credit', false, true, false),
  ('other_adjustment', 'Other adjustment', 'Manually approved tenant receivable adjustment.', array['adjustment'], array['tenant_receivable'], 'caller_supplied', true, true, false),
  ('liability_correction', 'Liability correction', 'Manually approved deposit liability correction.', array['adjustment'], array['deposit_liability'], 'caller_supplied', true, true, false);

create table finance_ledger_entries (
  ledger_event_id bigint generated always as identity primary key,
  public_id text not null unique,
  organization_id text not null references organizations(id) on delete cascade,
  lease_id text references leases(id) on delete set null,
  tenant_id text references tenants(id) on delete set null,
  payment_id text references payments(id) on delete set null,
  source_type text,
  source_id text,
  entry_type text not null check (entry_type in ('charge', 'payment', 'liability_movement', 'adjustment')),
  category_code text not null references finance_ledger_categories(category_code),
  account_code text not null references finance_ledger_accounts(code),
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(12,2) not null check (amount > 0),
  currency_code text not null default 'USD',
  effective_date date not null,
  status text not null default 'posted' check (status in ('posted', 'voided')),
  reason_code text,
  reason_text text,
  created_by_user_id text,
  created_at timestamptz not null default now()
);

create index idx_finance_ledger_entries_org_effective
  on finance_ledger_entries(organization_id, effective_date desc, ledger_event_id desc);

create index idx_finance_ledger_entries_lease
  on finance_ledger_entries(organization_id, lease_id, ledger_event_id desc);

create index idx_finance_ledger_entries_tenant
  on finance_ledger_entries(organization_id, tenant_id, ledger_event_id desc);

create index idx_finance_ledger_entries_account
  on finance_ledger_entries(organization_id, account_code, effective_date desc, ledger_event_id desc);

create index idx_finance_ledger_entries_source
  on finance_ledger_entries(organization_id, source_type, source_id, ledger_event_id desc);

create or replace function validate_finance_ledger_entry()
returns trigger as $$
declare
  category_policy finance_ledger_categories%rowtype;
begin
  select *
  into category_policy
  from finance_ledger_categories
  where category_code = new.category_code
    and active = true;

  if not found then
    raise exception 'finance ledger category % is not active or does not exist', new.category_code;
  end if;

  if not (new.entry_type = any(category_policy.allowed_entry_types)) then
    raise exception 'entry_type % is not allowed for category %', new.entry_type, new.category_code;
  end if;

  if not (new.account_code = any(category_policy.allowed_account_codes)) then
    raise exception 'account_code % is not allowed for category %', new.account_code, new.category_code;
  end if;

  if category_policy.is_deposit_category and (new.entry_type <> 'liability_movement' or new.account_code <> 'deposit_liability') then
    raise exception 'deposit categories must post only as liability_movement to deposit_liability';
  end if;

  if new.entry_type = 'charge' then
    new.direction := 'debit';
  elsif new.entry_type = 'payment' then
    new.direction := 'credit';
  elsif category_policy.direction_policy = 'debit' then
    new.direction := 'debit';
  elsif category_policy.direction_policy = 'credit' then
    new.direction := 'credit';
  elsif category_policy.direction_policy = 'caller_supplied' then
    if not category_policy.allow_manual_direction then
      raise exception 'manual direction is not allowed for category %', new.category_code;
    end if;

    if new.direction not in ('debit', 'credit') then
      raise exception 'direction must be supplied for category %', new.category_code;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_finance_ledger_entry
before insert or update on finance_ledger_entries
for each row execute function validate_finance_ledger_entry();

create table move_outs (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  lease_id text not null unique references leases(id) on delete cascade,
  initiated_by_user_id text,
  move_out_date date not null,
  reason text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'closed')),
  closure_ledger_event_id bigint references finance_ledger_entries(ledger_event_id) on delete restrict,
  finalized_statement_snapshot jsonb,
  finalized_statement_hash text,
  confirmed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint move_outs_closed_snapshot_requirements check (
    (
      status = 'closed'
      and closure_ledger_event_id is not null
      and finalized_statement_snapshot is not null
      and finalized_statement_hash is not null
      and closed_at is not null
    )
    or (
      status in ('draft', 'confirmed')
      and closure_ledger_event_id is null
      and finalized_statement_snapshot is null
      and finalized_statement_hash is null
      and closed_at is null
    )
  )
);

create index idx_move_outs_org_status
  on move_outs(organization_id, status, move_out_date desc);

create index idx_move_outs_org_lease
  on move_outs(organization_id, lease_id);

create table move_out_charges (
  id text primary key,
  move_out_id text not null references move_outs(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  charge_type text not null check (charge_type in ('unpaid_rent', 'prorated_rent', 'fee', 'damage', 'cleaning', 'penalty', 'deposit_deduction', 'credit')),
  amount numeric(12,2) not null check (amount > 0),
  currency_code text not null default 'USD',
  note text,
  source_reference_type text,
  source_reference_id text,
  created_at timestamptz not null default now()
);

create index idx_move_out_charges_move_out
  on move_out_charges(move_out_id, created_at asc);

create index idx_move_out_charges_org
  on move_out_charges(organization_id, move_out_id);

create table move_out_inspections (
  id text primary key,
  move_out_id text not null unique references move_outs(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  checklist_snapshot jsonb not null default '[]'::jsonb,
  notes text,
  photo_document_ids jsonb not null default '[]'::jsonb,
  inspected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_move_out_inspections_org
  on move_out_inspections(organization_id, move_out_id);

create or replace function set_finance_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create or replace function validate_move_out_child_org()
returns trigger as $$
begin
  if not exists (
    select 1
    from move_outs mo
    where mo.id = new.move_out_id
      and mo.organization_id = new.organization_id
  ) then
    raise exception 'move_out child record must use the same organization_id as its move_out parent';
  end if;

  return new;
end;
$$ language plpgsql;

create or replace function validate_move_out_snapshot_immutability()
returns trigger as $$
begin
  if old.status = 'closed' and (
    new.organization_id is distinct from old.organization_id
    or new.lease_id is distinct from old.lease_id
    or new.move_out_date is distinct from old.move_out_date
    or new.reason is distinct from old.reason
    or new.status is distinct from old.status
    or new.closure_ledger_event_id is distinct from old.closure_ledger_event_id
    or new.finalized_statement_snapshot is distinct from old.finalized_statement_snapshot
    or new.finalized_statement_hash is distinct from old.finalized_statement_hash
    or new.confirmed_at is distinct from old.confirmed_at
    or new.closed_at is distinct from old.closed_at
  ) then
    raise exception 'closed move_out snapshots are immutable; reopen via a dedicated workflow instead';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_move_outs_set_updated_at
before update on move_outs
for each row execute function set_finance_updated_at();

create trigger trg_move_out_inspections_set_updated_at
before update on move_out_inspections
for each row execute function set_finance_updated_at();

create trigger trg_validate_move_out_charge_org
before insert or update on move_out_charges
for each row execute function validate_move_out_child_org();

create trigger trg_validate_move_out_inspection_org
before insert or update on move_out_inspections
for each row execute function validate_move_out_child_org();

create trigger trg_validate_move_out_snapshot_immutability
before update on move_outs
for each row execute function validate_move_out_snapshot_immutability();