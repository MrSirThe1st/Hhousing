-- Extend tenants table with employment and occupancy profile fields
alter table tenants
  add column employment_status text,
  add column job_title text,
  add column monthly_income numeric(12, 2),
  add column number_of_occupants integer;

-- Extend listing_applications table with matching applicant profile fields
alter table listing_applications
  add column date_of_birth date,
  add column employment_status text,
  add column job_title text,
  add column number_of_occupants integer;
