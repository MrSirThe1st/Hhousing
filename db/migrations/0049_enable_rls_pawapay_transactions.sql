-- RLS for PawaPay tables (server-side access only via service role)

alter table if exists public.pawapay_transactions enable row level security;
alter table if exists public.pawapay_transaction_allocations enable row level security;

drop policy if exists "deny_all_pawapay_transactions" on public.pawapay_transactions;
create policy "deny_all_pawapay_transactions" on public.pawapay_transactions
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_all_pawapay_transaction_allocations" on public.pawapay_transaction_allocations;
create policy "deny_all_pawapay_transaction_allocations" on public.pawapay_transaction_allocations
  as restrictive for all to public
  using (false)
  with check (false);
