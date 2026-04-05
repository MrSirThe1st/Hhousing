create or replace function enforce_single_unit_property_capacity()
returns trigger
language plpgsql
as $$
declare
  target_property_type text;
  existing_unit_id text;
begin
  select property_type
  into target_property_type
  from properties
  where id = new.property_id;

  if target_property_type = 'single_unit' then
    select id
    into existing_unit_id
    from units
    where property_id = new.property_id
      and id <> new.id
    limit 1;

    if existing_unit_id is not null then
      raise exception 'SINGLE_UNIT_PROPERTY_ALREADY_HAS_UNIT'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists units_enforce_single_unit_property_capacity on units;

create trigger units_enforce_single_unit_property_capacity
before insert or update of property_id on units
for each row
execute function enforce_single_unit_property_capacity();