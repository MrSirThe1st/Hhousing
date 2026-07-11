-- PawaPay transaction tracking for mobile-money collections

create table pawapay_transactions (
  id                  text          primary key,
  organization_id     text          not null references organizations(id),
  tenant_id           text          not null references tenants(id),
  lease_id            text          not null references leases(id),
  operation_type      text          not null default 'deposit'
                      check (operation_type in ('deposit', 'checkout', 'payout', 'refund')),
  total_amount        numeric(12,2) not null,
  currency_code       text          not null,
  provider            text          not null,
  phone_number        text          not null,
  pawapay_status      text,
  failure_code        text,
  failure_message     text,
  status              text          not null default 'pending'
                      check (status in ('pending', 'submitted', 'completed', 'failed')),
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  completed_at        timestamptz
);

create table pawapay_transaction_allocations (
  transaction_id  text          not null references pawapay_transactions(id) on delete cascade,
  payment_id      text          not null references payments(id),
  amount          numeric(12,2) not null,
  primary key (transaction_id, payment_id)
);

create index idx_pawapay_transactions_organization_id on pawapay_transactions(organization_id);
create index idx_pawapay_transactions_tenant_id on pawapay_transactions(tenant_id);
create index idx_pawapay_transactions_status on pawapay_transactions(status);
create index idx_pawapay_transactions_created_at on pawapay_transactions(created_at desc);
create index idx_pawapay_allocations_payment_id on pawapay_transaction_allocations(payment_id);
