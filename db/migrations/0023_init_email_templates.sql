create table email_templates (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  scenario text not null check (scenario in ('welcome_letter', 'house_rules', 'lease_draft', 'general')),
  subject text not null,
  body text not null,
  created_by_user_id text not null,
  updated_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_email_templates_org on email_templates(organization_id, created_at desc);
create index idx_email_templates_org_scenario on email_templates(organization_id, scenario);