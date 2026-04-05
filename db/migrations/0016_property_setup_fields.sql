alter table properties
  add column property_type text,
  add column year_built integer,
  add column photo_urls text[] not null default '{}';

update properties p
set property_type = case
  when unit_counts.unit_count > 1 then 'multi_unit'
  else 'single_unit'
end
from (
  select property_id, count(*)::integer as unit_count
  from units
  group by property_id
) as unit_counts
where p.id = unit_counts.property_id;

update properties
set property_type = 'single_unit'
where property_type is null;

alter table properties
  alter column property_type set not null,
  alter column property_type set default 'single_unit',
  add constraint properties_property_type_check check (property_type in ('single_unit', 'multi_unit')),
  add constraint properties_year_built_check check (year_built is null or (year_built >= 1800 and year_built <= 2200));

alter table units
  add column deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  add column bedroom_count integer,
  add column bathroom_count numeric(4,1),
  add column size_sqm numeric(10,2),
  add column amenities text[] not null default '{}',
  add column features text[] not null default '{}',
  add constraint units_bedroom_count_check check (bedroom_count is null or bedroom_count >= 0),
  add constraint units_bathroom_count_check check (bathroom_count is null or bathroom_count >= 0),
  add constraint units_size_sqm_check check (size_sqm is null or size_sqm > 0);
