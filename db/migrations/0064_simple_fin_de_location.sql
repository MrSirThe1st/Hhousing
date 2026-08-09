-- V1 Fin de location: simple departure + deposit disposition.
-- Keep legacy charge/inspection/ledger columns unused by the new flow.

alter table move_outs
  add column if not exists lease_end_date date,
  add column if not exists departure_effective_date date,
  add column if not exists ended_by text,
  add column if not exists reason_code text,
  add column if not exists reason_note text,
  add column if not exists deposit_held_amount numeric(12,2),
  add column if not exists deposit_amount_overridden boolean not null default false,
  add column if not exists deposit_disposition text,
  add column if not exists deposit_retention_amount numeric(12,2) not null default 0,
  add column if not exists deposit_retention_reason_code text,
  add column if not exists deposit_retention_note text,
  add column if not exists deposit_refund_amount numeric(12,2),
  add column if not exists currency_code text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Backfill effective/contractual dates from legacy move_out_date where missing.
update move_outs
set departure_effective_date = coalesce(departure_effective_date, move_out_date),
    lease_end_date = coalesce(lease_end_date, move_out_date)
where departure_effective_date is null or lease_end_date is null;

alter table move_outs
  alter column departure_effective_date set not null,
  alter column lease_end_date set not null;

-- Expand status + relax closed-snapshot rule for V1 statuses.
alter table move_outs drop constraint if exists move_outs_status_check;
alter table move_outs drop constraint if exists move_outs_closed_snapshot_requirements;

alter table move_outs
  add constraint move_outs_status_check
  check (status in ('draft', 'confirmed', 'closed', 'planned', 'completed', 'cancelled'));

alter table move_outs
  add constraint move_outs_ended_by_check
  check (ended_by is null or ended_by in ('tenant', 'landlord'));

alter table move_outs
  add constraint move_outs_deposit_disposition_check
  check (
    deposit_disposition is null
    or deposit_disposition in ('full_refund', 'partial_retention', 'full_retention')
  );

alter table move_outs
  add constraint move_outs_snapshot_requirements check (
    (
      status = 'closed'
      and closure_ledger_event_id is not null
      and finalized_statement_snapshot is not null
      and finalized_statement_hash is not null
      and closed_at is not null
    )
    or (
      status in ('draft', 'confirmed', 'planned', 'completed', 'cancelled')
      and (
        status <> 'closed'
      )
    )
  );

create or replace function validate_move_out_snapshot_immutability()
returns trigger as $$
begin
  if old.status in ('closed', 'completed') and (
    new.organization_id is distinct from old.organization_id
    or new.lease_id is distinct from old.lease_id
    or new.move_out_date is distinct from old.move_out_date
    or new.departure_effective_date is distinct from old.departure_effective_date
    or new.lease_end_date is distinct from old.lease_end_date
    or new.reason is distinct from old.reason
    or new.status is distinct from old.status
    or new.closure_ledger_event_id is distinct from old.closure_ledger_event_id
    or new.finalized_statement_snapshot is distinct from old.finalized_statement_snapshot
    or new.finalized_statement_hash is distinct from old.finalized_statement_hash
    or new.confirmed_at is distinct from old.confirmed_at
    or new.closed_at is distinct from old.closed_at
    or new.completed_at is distinct from old.completed_at
    or new.deposit_held_amount is distinct from old.deposit_held_amount
    or new.deposit_refund_amount is distinct from old.deposit_refund_amount
  ) then
    raise exception 'completed/closed move_out records are immutable';
  end if;

  return new;
end;
$$ language plpgsql;

create index if not exists idx_move_outs_org_planned_due
  on move_outs(organization_id, departure_effective_date)
  where status = 'planned';
