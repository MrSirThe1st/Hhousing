alter table lease_charge_templates
  drop constraint if exists lease_charge_templates_charge_type_check;

alter table lease_charge_templates
  add constraint lease_charge_templates_charge_type_check check (
    charge_type in ('deposit', 'rent', 'prorated_rent', 'fee', 'other')
  );

drop index if exists idx_payments_lease_charge_period;

create unique index idx_payments_lease_charge_period_source
  on payments(lease_id, charge_period, coalesce(source_lease_charge_template_id, ''))
  where charge_period is not null;