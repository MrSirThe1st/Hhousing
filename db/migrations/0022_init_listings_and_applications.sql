create table listings (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  property_id text not null references properties(id) on delete cascade,
  unit_id text not null references units(id) on delete cascade,
  status text not null check (status in ('draft', 'published')) default 'draft',
  marketing_description text,
  cover_image_url text,
  gallery_image_urls text[] not null default '{}',
  youtube_url text,
  instagram_url text,
  contact_email text,
  contact_phone text,
  is_featured boolean not null default false,
  show_address boolean not null default false,
  show_rent boolean not null default true,
  show_deposit boolean not null default true,
  show_amenities boolean not null default true,
  show_features boolean not null default true,
  show_bedrooms boolean not null default true,
  show_bathrooms boolean not null default true,
  show_size_sqm boolean not null default true,
  published_at timestamptz,
  created_by_user_id text not null,
  updated_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id)
);

create index idx_listings_org on listings(organization_id);
create index idx_listings_status on listings(status, is_featured, published_at desc);
create index idx_listings_unit on listings(unit_id);

create table listing_applications (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  employment_info text,
  monthly_income numeric(12, 2),
  notes text,
  status text not null check (status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_more_info', 'converted')) default 'submitted',
  screening_notes text,
  requested_info_message text,
  reviewed_by_user_id text,
  reviewed_at timestamptz,
  converted_tenant_id text references tenants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_listing_applications_listing on listing_applications(listing_id);
create index idx_listing_applications_org_status on listing_applications(organization_id, status, created_at desc);
create index idx_listing_applications_email on listing_applications(organization_id, lower(email));