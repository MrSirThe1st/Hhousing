-- Seed default team functions for all organizations
-- Each organization gets these standard functions on creation or migration

insert into team_functions (
  id, 
  organization_id, 
  function_code, 
  display_name, 
  description, 
  permissions
)
select
  concat(o.id, '_func_', func.code, '_', to_char(now(), 'YYYYMMDDHHmmss')),
  o.id,
  func.code,
  func.display_name,
  func.description,
  func.permissions::jsonb
from organizations o
cross join (
  values
    (
      'LEASING_AGENT',
      'Leasing Agent',
      'Manages tenant leasing and tenant communications',
      '["view_properties", "create_lease", "edit_lease", "view_lease", "manage_tenants", "view_tenants", "message_tenants", "view_documents", "upload_documents"]'::text
    ),
    (
      'ACCOUNTANT',
      'Accountant',
      'Manages financial records and reporting',
      '["view_lease", "view_payments", "record_payment", "export_payment_reports", "view_documents", "view_income_reports"]'::text
    ),
    (
      'MAINTENANCE_MANAGER',
      'Maintenance Manager',
      'Manages maintenance requests and vendor assignments',
      '["manage_maintenance", "assign_vendors", "view_maintenance", "update_maintenance_status", "view_documents"]'::text
    ),
    (
      'ADMIN',
      'Admin (Internal)',
      'Full access within this organization',
      '["*"]'::text
    )
  ) as func(code, display_name, description, permissions)
where not exists (
  select 1 from team_functions tf
  where tf.organization_id = o.id and tf.function_code = func.code
);
