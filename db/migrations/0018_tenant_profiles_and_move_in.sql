alter table tenants
  add column date_of_birth date,
  add column photo_url text;

alter table leases
  add column term_type text,
  add column fixed_term_months integer,
  add column auto_renew_to_monthly boolean not null default false,
  add column payment_frequency text,
  add column payment_start_date date,
  add column due_day_of_month integer,
  add column deposit_amount numeric(12,2) not null default 0;

update leases
set
  term_type = case
    when end_date is null then 'month_to_month'
    else 'fixed'
  end,
  fixed_term_months = case
    when end_date is null then null
    else greatest(
      1,
      (
        date_part('year', age(end_date + interval '1 day', start_date))::integer * 12
        + date_part('month', age(end_date + interval '1 day', start_date))::integer
      )
    )
  end,
  payment_frequency = 'monthly',
  payment_start_date = start_date,
  due_day_of_month = extract(day from start_date)::integer,
  deposit_amount = 0;

alter table leases
  alter column term_type set not null,
  alter column term_type set default 'month_to_month',
  alter column payment_frequency set not null,
  alter column payment_frequency set default 'monthly',
  alter column payment_start_date set not null,
  alter column due_day_of_month set not null,
  add constraint leases_term_type_check check (term_type in ('fixed', 'month_to_month')),
  add constraint leases_fixed_term_months_check check (
    (term_type = 'fixed' and fixed_term_months is not null and fixed_term_months > 0)
    or (term_type = 'month_to_month' and fixed_term_months is null)
  ),
  add constraint leases_payment_frequency_check check (payment_frequency in ('monthly', 'quarterly', 'annually')),
  add constraint leases_due_day_of_month_check check (due_day_of_month between 1 and 31),
  add constraint leases_deposit_amount_check check (deposit_amount >= 0);

create table lease_charge_templates (
  id text primary key,
  organization_id text not null references organizations(id),
  lease_id text not null references leases(id) on delete cascade,
  label text not null,
  charge_type text not null check (charge_type in ('deposit', 'other')),
  amount numeric(12,2) not null check (amount >= 0),
  currency_code text not null default 'USD',
  frequency text not null check (frequency in ('one_time', 'monthly', 'quarterly', 'annually')),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);

create index idx_lease_charge_templates_organization_id on lease_charge_templates(organization_id);
create index idx_lease_charge_templates_lease_id on lease_charge_templates(lease_id);