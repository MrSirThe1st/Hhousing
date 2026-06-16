-- Ensure organization names are unique
alter table organizations add constraint organizations_name_unique unique (name);
