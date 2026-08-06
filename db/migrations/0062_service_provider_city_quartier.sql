-- Replace free-text coverage_area with city + quartier.

alter table if exists public.service_providers
  add column if not exists city text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_providers'
      and column_name = 'coverage_area'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_providers'
      and column_name = 'quartier'
  ) then
    alter table public.service_providers rename column coverage_area to quartier;
  end if;
end $$;

create index if not exists idx_service_providers_city
  on service_providers (city)
  where city is not null;
