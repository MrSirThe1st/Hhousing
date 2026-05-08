-- Remove blanket deny policies from shared app tables.
-- RLS already denies by default when no matching policy exists.
-- Keep explicit allow policies only.

drop policy if exists "deny_all_audit_logs" on public.audit_logs;
drop policy if exists "deny_organizations_write" on public.organizations;
drop policy if exists "deny_memberships_write" on public.organization_memberships;
drop policy if exists "deny_properties_write" on public.properties;
drop policy if exists "deny_units_write" on public.units;
drop policy if exists "deny_tenants_write" on public.tenants;
drop policy if exists "deny_leases_write" on public.leases;
drop policy if exists "deny_payments_write" on public.payments;
drop policy if exists "deny_maintenance_requests_write" on public.maintenance_requests;
drop policy if exists "deny_documents_write" on public.documents;
drop policy if exists "deny_maint_req_events_write" on public.maintenance_request_events;
drop policy if exists "deny_team_functions_write" on public.team_functions;
drop policy if exists "deny_member_functions_write" on public.member_functions;
drop policy if exists "deny_tenant_invitations_write" on public.tenant_invitations;
drop policy if exists "deny_conversations_write" on public.conversations;
drop policy if exists "deny_messages_write" on public.messages;
drop policy if exists "deny_owners_write" on public.owners;
drop policy if exists "deny_lease_charge_templates_write" on public.lease_charge_templates;
drop policy if exists "deny_team_member_invitations_write" on public.team_member_invitations;
drop policy if exists "deny_listings_write" on public.listings;
drop policy if exists "deny_listing_applications_write" on public.listing_applications;
drop policy if exists "deny_email_templates_write" on public.email_templates;
drop policy if exists "deny_expenses_write" on public.expenses;
drop policy if exists "deny_tasks_write" on public.tasks;
drop policy if exists "deny_calendar_events_write" on public.calendar_events;
drop policy if exists "deny_owner_portal_accesses_write" on public.owner_portal_accesses;
drop policy if exists "deny_owner_invitations_write" on public.owner_invitations;
drop policy if exists "deny_all_finance_ledger_accounts" on public.finance_ledger_accounts;
drop policy if exists "deny_finance_ledger_accounts_write" on public.finance_ledger_accounts;
drop policy if exists "deny_all_finance_ledger_categories" on public.finance_ledger_categories;
drop policy if exists "deny_finance_ledger_categories_write" on public.finance_ledger_categories;
drop policy if exists "deny_finance_ledger_entries_write" on public.finance_ledger_entries;
drop policy if exists "deny_move_outs_write" on public.move_outs;
drop policy if exists "deny_move_out_charges_write" on public.move_out_charges;
drop policy if exists "deny_move_out_inspections_write" on public.move_out_inspections;
drop policy if exists "deny_invoices_write" on public.invoices;
drop policy if exists "deny_invoice_payment_applications_write" on public.invoice_payment_applications;
drop policy if exists "deny_lease_credit_balances_write" on public.lease_credit_balances;
drop policy if exists "deny_invoice_email_jobs_write" on public.invoice_email_jobs;
