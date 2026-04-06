alter table leases
  add column signed_at date,
  add column signing_method text,
  add column activated_at timestamptz,
  add constraint leases_signing_method_check check (
    signing_method in ('physical', 'scanned', 'email_confirmation') or signing_method is null
  );

alter table payments
  add column payment_kind text not null default 'other',
  add column billing_frequency text not null default 'one_time',
  add column source_lease_charge_template_id text references lease_charge_templates(id) on delete set null,
  add column is_initial_charge boolean not null default false,
  add constraint payments_payment_kind_check check (
    payment_kind in ('rent', 'deposit', 'prorated_rent', 'fee', 'other')
  ),
  add constraint payments_billing_frequency_check check (
    billing_frequency in ('one_time', 'monthly', 'quarterly', 'annually')
  );

create index idx_payments_lease_initial_charge on payments(lease_id, is_initial_charge);
create index idx_payments_source_lease_charge_template_id on payments(source_lease_charge_template_id);