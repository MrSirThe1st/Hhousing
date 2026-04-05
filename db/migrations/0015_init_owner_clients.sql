create table owner_clients (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  constraint owner_clients_name_not_blank check (char_length(trim(name)) > 0)
);

alter table properties
  add column client_id text references owner_clients(id) on delete set null;

insert into owner_clients (id, organization_id, name)
select distinct
  concat('ocl_', substr(md5(p.organization_id || ':' || lower(trim(p.client_name))), 1, 16)),
  p.organization_id,
  trim(p.client_name)
from properties p
where p.client_name is not null
  and char_length(trim(p.client_name)) > 0
on conflict (organization_id, name) do nothing;

update properties p
set client_id = oc.id,
    client_name = oc.name
from owner_clients oc
where p.organization_id = oc.organization_id
  and p.client_name is not null
  and char_length(trim(p.client_name)) > 0
  and lower(trim(p.client_name)) = lower(oc.name);

create index idx_owner_clients_org_name on owner_clients (organization_id, name);
create index idx_properties_org_client_id on properties (organization_id, client_id);