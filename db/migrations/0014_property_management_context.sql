alter table properties
  add column management_context text not null default 'owned'
    check (management_context in ('owned', 'managed')),
  add column client_name text;

create index idx_properties_org_management_context
  on properties (organization_id, management_context, created_at desc);