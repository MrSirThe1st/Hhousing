create table if not exists organizations (
  id text primary key,
  name text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists properties (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  address text not null,
  city text not null,
  country_code text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists units (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  property_id text not null references properties(id) on delete cascade,
  unit_number text not null,
  monthly_rent_amount numeric(12,2) not null check (monthly_rent_amount > 0),
  currency_code text not null,
  status text not null default 'vacant' check (status in ('vacant', 'occupied', 'inactive')),
  created_at timestamptz not null default now(),
  unique (property_id, unit_number)
);

create index if not exists properties_organization_id_idx
  on properties (organization_id, created_at desc);

create index if not exists units_organization_id_idx
  on units (organization_id, created_at desc);

create index if not exists units_property_id_idx
  on units (property_id, created_at desc);
