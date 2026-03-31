-- Slice 2: Rent ledger — charge_period column on payments
-- charge_period identifies which calendar month a generated rent charge covers (YYYY-MM).
-- NULL on manually recorded ad-hoc payments.
-- The partial unique index prevents duplicate generated charges for the same lease + month.

alter table payments
  add column charge_period text
  check (charge_period ~ '^\d{4}-(?:0[1-9]|1[0-2])$');

create unique index idx_payments_lease_charge_period
  on payments(lease_id, charge_period)
  where charge_period is not null;
