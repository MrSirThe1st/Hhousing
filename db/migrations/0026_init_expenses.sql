create table expenses (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  property_id text references properties(id) on delete set null,
  title text not null,
  category text not null check (category in ('maintenance', 'utilities', 'taxes', 'insurance', 'supplies', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  currency_code text not null,
  expense_date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index idx_expenses_org_date on expenses(organization_id, expense_date desc);
create index idx_expenses_property_date on expenses(property_id, expense_date desc) where property_id is not null;