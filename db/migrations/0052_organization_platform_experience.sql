alter table organizations
  add column if not exists platform_experience text not null default 'entreprise'
  check (platform_experience in ('entreprise', 'individual'));
