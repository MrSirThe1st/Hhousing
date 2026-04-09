alter table expenses
  add column unit_id text references units(id) on delete set null;

alter table expenses
  add constraint expenses_unit_requires_property_check
  check (unit_id is null or property_id is not null);

create index idx_expenses_unit_date on expenses(unit_id, expense_date desc) where unit_id is not null;