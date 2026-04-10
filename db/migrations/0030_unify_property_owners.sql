alter table owner_clients rename to owners;

alter index if exists idx_owner_clients_org_name rename to idx_owners_org_name;
alter index if exists idx_properties_org_client_id rename to idx_properties_org_owner_id;

alter table owners
  add column if not exists owner_type text not null default 'client'
    check (owner_type in ('organization', 'client')),
  add column if not exists user_id text;

alter table properties rename column client_id to owner_id;
alter table properties rename column client_name to owner_name;

create unique index if not exists idx_owners_org_organization_type
  on owners (organization_id, owner_type)
  where owner_type = 'organization';

insert into owners (id, organization_id, name, owner_type, user_id)
select
  concat('own_org_', substr(md5(o.id), 1, 16)),
  o.id,
  o.name,
  'organization',
  null
from organizations o
where not exists (
  select 1
  from owners existing
  where existing.organization_id = o.id
    and existing.owner_type = 'organization'
);

update properties p
set owner_id = org_owner.id,
    owner_name = org_owner.name
from owners org_owner
where org_owner.organization_id = p.organization_id
  and org_owner.owner_type = 'organization'
  and (p.management_context = 'owned' or p.owner_id is null);

update properties p
set owner_name = o.name
from owners o
where o.id = p.owner_id
  and o.organization_id = p.organization_id;