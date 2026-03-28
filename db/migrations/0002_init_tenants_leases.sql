-- Slice 2: Tenants + Leases
-- Tenants are real people linked to a Supabase auth user (optional).
-- A lease binds one tenant to one unit for a date range.

create table tenants (
  id           text        primary key,
  organization_id text     not null references organizations(id),
  auth_user_id text        unique,                  -- nullable: tenant may not have an account yet
  full_name    text        not null,
  email        text,
  phone        text,
  created_at   timestamptz not null default now()
);

create index idx_tenants_organization_id on tenants(organization_id);
create index idx_tenants_auth_user_id    on tenants(auth_user_id) where auth_user_id is not null;

create table leases (
  id                   text         primary key,
  organization_id      text         not null references organizations(id),
  unit_id              text         not null references units(id),
  tenant_id            text         not null references tenants(id),
  start_date           date         not null,
  end_date             date,                        -- nullable = open-ended
  monthly_rent_amount  numeric(12,2) not null,
  currency_code        text         not null default 'USD',
  status               text         not null default 'pending'
                                    check (status in ('active','ended','pending')),
  created_at           timestamptz  not null default now()
);

create index idx_leases_organization_id on leases(organization_id);
create index idx_leases_unit_id         on leases(unit_id);
create index idx_leases_tenant_id       on leases(tenant_id);

-- Enforce no two active leases on the same unit at the same time
create unique index idx_leases_unit_active
  on leases(unit_id)
  where status = 'active';
