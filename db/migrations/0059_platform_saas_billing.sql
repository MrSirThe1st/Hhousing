-- Platform SaaS billing for operator organizations (Hhousing → landlord/PM).
-- Separate from tenant rent invoices/payments. Settlement is manual Mobile Money for now.

create table if not exists platform_billing_settings (
  id text primary key default 'default',
  price_per_unit_amount numeric(12,2) not null default 5.00 check (price_per_unit_amount >= 0),
  currency_code text not null default 'USD',
  free_property_threshold integer not null default 2 check (free_property_threshold >= 0),
  updated_at timestamptz not null default now()
);

insert into platform_billing_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists platform_payment_methods (
  id text primary key,
  provider text not null check (provider in ('airtel', 'orange', 'mpesa', 'other')),
  display_name text not null,
  account_number text not null,
  instructions text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_payment_methods_active_sort
  on platform_payment_methods (is_active, sort_order, created_at);

create table if not exists platform_subscription_invoices (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  property_count integer not null check (property_count >= 0),
  unit_count integer not null check (unit_count >= 0),
  price_per_unit_amount numeric(12,2) not null check (price_per_unit_amount >= 0),
  amount_due numeric(12,2) not null check (amount_due >= 0),
  currency_code text not null default 'USD',
  status text not null check (status in ('issued', 'pending_confirmation', 'paid', 'void')),
  due_at timestamptz not null,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_confirmed_by_user_id uuid references auth.users(id) on delete set null,
  payment_reported_at timestamptz,
  payment_reported_by_user_id uuid references auth.users(id) on delete set null,
  payment_note text,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period)
);

create index if not exists idx_platform_subscription_invoices_status_due
  on platform_subscription_invoices (status, due_at desc);

create index if not exists idx_platform_subscription_invoices_org_period
  on platform_subscription_invoices (organization_id, period desc);

alter table if exists public.platform_billing_settings enable row level security;
alter table if exists public.platform_payment_methods enable row level security;
alter table if exists public.platform_subscription_invoices enable row level security;

-- Server Postgres (service role / direct) bypasses RLS. Deny client Data API access.
drop policy if exists "deny_all_platform_billing_settings" on public.platform_billing_settings;
create policy "deny_all_platform_billing_settings" on public.platform_billing_settings
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_all_platform_payment_methods" on public.platform_payment_methods;
create policy "deny_all_platform_payment_methods" on public.platform_payment_methods
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_all_platform_subscription_invoices" on public.platform_subscription_invoices;
create policy "deny_all_platform_subscription_invoices" on public.platform_subscription_invoices
  as restrictive for all to public
  using (false)
  with check (false);

-- Grant billing permissions to existing ACCOUNTANT team functions (ADMIN already has *)
update team_functions
set permissions = (
  select jsonb_agg(distinct value)
  from jsonb_array_elements_text(
    coalesce(permissions, '[]'::jsonb) || '["view_org_billing", "manage_org_billing"]'::jsonb
  ) as value
)
where function_code = 'ACCOUNTANT'
  and not (
    permissions @> '["view_org_billing"]'::jsonb
    and permissions @> '["manage_org_billing"]'::jsonb
  );
