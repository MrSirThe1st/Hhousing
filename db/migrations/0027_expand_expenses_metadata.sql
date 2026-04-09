alter table expenses
  add column vendor_name text,
  add column payee_name text;

alter table expenses
  drop constraint expenses_category_check;

alter table expenses
  add constraint expenses_category_check
  check (
    category in (
      'maintenance',
      'utilities',
      'taxes',
      'insurance',
      'supplies',
      'payroll',
      'cleaning',
      'security',
      'legal',
      'marketing',
      'admin',
      'other'
    )
  );

create index idx_expenses_vendor_name on expenses(vendor_name) where vendor_name is not null;
create index idx_expenses_payee_name on expenses(payee_name) where payee_name is not null;