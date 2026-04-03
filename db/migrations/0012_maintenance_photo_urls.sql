-- Add photo URLs to maintenance requests
alter table maintenance_requests
  add column photo_urls text[] not null default '{}';
