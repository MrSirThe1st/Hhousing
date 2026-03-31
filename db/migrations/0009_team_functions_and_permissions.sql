-- Phase 1: Functions/Permissions System
-- Introduces org-scoped functions and member function assignments
-- Separates "who you are" (role) from "what you can do" (functions/permissions)

create table if not exists team_functions (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  function_code text not null,
  display_name text not null,
  description text,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(organization_id, function_code)
);

create index if not exists idx_team_functions_org_id
  on team_functions(organization_id);

create index if not exists idx_team_functions_function_code
  on team_functions(organization_id, function_code);

-- Member function assignments (junction table)
-- Each member can have 0..N functions within their org
create table if not exists member_functions (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  member_id text not null references organization_memberships(id) on delete cascade,
  function_id text not null references team_functions(id) on delete cascade,
  assigned_by text,
  created_at timestamptz not null default now(),
  unique(member_id, function_id)
);

create index if not exists idx_member_functions_member_id
  on member_functions(member_id);

create index if not exists idx_member_functions_function_id
  on member_functions(function_id);

create index if not exists idx_member_functions_org_id
  on member_functions(organization_id);

create index if not exists idx_member_functions_org_created
  on member_functions(organization_id, created_at desc);

-- Trigger: Ensure member_id belongs to the organization
create or replace function validate_member_function_org()
returns trigger as $$
begin
  if not exists (
    select 1 from organization_memberships om
    where om.id = new.member_id and om.organization_id = new.organization_id
  ) then
    raise exception 'member_id must belong to the specified organization';
  end if;
  
  if not exists (
    select 1 from team_functions tf
    where tf.id = new.function_id and tf.organization_id = new.organization_id
  ) then
    raise exception 'function_id must belong to the specified organization';
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_member_function_org
before insert or update on member_functions
for each row execute function validate_member_function_org();
