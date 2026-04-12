-- Expand default team function permissions for operational modules.
-- Existing organizations need these updates because seed migrations do not reapply.

update team_functions
set permissions = (
  select jsonb_agg(distinct permission)
  from jsonb_array_elements_text(team_functions.permissions || '["view_properties", "upload_documents"]'::jsonb) as permission
)
where function_code = 'LEASING_AGENT';