-- Drop unused manual SaaS payment leftovers (off-platform MM numbers + operator self-report).
-- In-app PawaPay for SaaS invoices remains deferred.

update public.platform_subscription_invoices
set
  status = 'issued',
  updated_at = now()
where status = 'pending_confirmation';

alter table public.platform_subscription_invoices
  drop constraint if exists platform_subscription_invoices_status_check;

alter table public.platform_subscription_invoices
  add constraint platform_subscription_invoices_status_check
  check (status in ('issued', 'paid', 'void'));

alter table public.platform_subscription_invoices
  drop column if exists payment_reported_at,
  drop column if exists payment_reported_by_user_id,
  drop column if exists payment_note;

drop policy if exists "deny_all_platform_payment_methods" on public.platform_payment_methods;
drop index if exists idx_platform_payment_methods_active_sort;
drop table if exists public.platform_payment_methods;
