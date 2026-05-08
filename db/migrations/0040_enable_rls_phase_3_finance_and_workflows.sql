-- Phase 3: finance + lease workflow tables

alter table if exists public.finance_ledger_accounts enable row level security;
alter table if exists public.finance_ledger_categories enable row level security;
alter table if exists public.finance_ledger_entries enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.invoice_payment_applications enable row level security;
alter table if exists public.lease_credit_balances enable row level security;
alter table if exists public.expenses enable row level security;
alter table if exists public.lease_charge_templates enable row level security;
alter table if exists public.move_outs enable row level security;
alter table if exists public.move_out_charges enable row level security;
alter table if exists public.move_out_inspections enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.maintenance_requests enable row level security;
