-- SaaS billing: human invoice numbers + landlord "j'ai payé" payment signal.
-- Overdue remains derived (issued + due_at < now). PawaPay checkout stays deferred.

alter table public.platform_subscription_invoices
  add column if not exists invoice_number text,
  add column if not exists payment_reported_at timestamptz,
  add column if not exists payment_reported_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists payment_method text,
  add column if not exists payment_note text;

alter table public.platform_subscription_invoices
  drop constraint if exists platform_subscription_invoices_payment_method_check;

alter table public.platform_subscription_invoices
  add constraint platform_subscription_invoices_payment_method_check
  check (
    payment_method is null
    or payment_method in ('orange', 'airtel', 'mpesa', 'other')
  );

-- Backfill stable invoice numbers for existing rows (INV-YYYY-NNN by issued year + issuance order).
with ranked as (
  select
    id,
    'INV-' || to_char(issued_at, 'YYYY') || '-' ||
      lpad(
        row_number() over (
          partition by to_char(issued_at, 'YYYY')
          order by issued_at asc, created_at asc, id asc
        )::text,
        3,
        '0'
      ) as generated_number
  from public.platform_subscription_invoices
  where invoice_number is null
)
update public.platform_subscription_invoices inv
set invoice_number = ranked.generated_number
from ranked
where inv.id = ranked.id;

alter table public.platform_subscription_invoices
  alter column invoice_number set not null;

create unique index if not exists uq_platform_subscription_invoices_invoice_number
  on public.platform_subscription_invoices (invoice_number);

create index if not exists idx_platform_subscription_invoices_payment_reported
  on public.platform_subscription_invoices (payment_reported_at desc nulls last)
  where payment_reported_at is not null;
