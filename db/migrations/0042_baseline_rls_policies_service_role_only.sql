-- Baseline RLS policies: service-role-safe, rerunnable
-- Strategy: org-scoped read access for authenticated members, deny writes by default.
-- Server-side access continues to bypass RLS via postgres rolbypassrls=true.

create or replace function public.user_org_ids()
returns setof text as $$
  select organization_id
  from public.organization_memberships
  where user_id = auth.uid()::text
$$ language sql stable security definer set search_path = public;

drop policy if exists "deny_all_audit_logs" on public.audit_logs;
create policy "deny_all_audit_logs" on public.audit_logs
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_organizations" on public.organizations;
create policy "members_read_own_org_organizations" on public.organizations
  as permissive for select to authenticated
  using (id in (select public.user_org_ids()));

drop policy if exists "deny_organizations_write" on public.organizations;
create policy "deny_organizations_write" on public.organizations
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "users_read_own_memberships" on public.organization_memberships;
create policy "users_read_own_memberships" on public.organization_memberships
  as permissive for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists "deny_memberships_write" on public.organization_memberships;
create policy "deny_memberships_write" on public.organization_memberships
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_properties" on public.properties;
create policy "members_read_own_org_properties" on public.properties
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_properties_write" on public.properties;
create policy "deny_properties_write" on public.properties
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_units" on public.units;
create policy "members_read_own_org_units" on public.units
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_units_write" on public.units;
create policy "deny_units_write" on public.units
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_tenants" on public.tenants;
create policy "members_read_own_org_tenants" on public.tenants
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_tenants_write" on public.tenants;
create policy "deny_tenants_write" on public.tenants
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_leases" on public.leases;
create policy "members_read_own_org_leases" on public.leases
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_leases_write" on public.leases;
create policy "deny_leases_write" on public.leases
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_payments" on public.payments;
create policy "members_read_own_org_payments" on public.payments
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_payments_write" on public.payments;
create policy "deny_payments_write" on public.payments
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_maintenance_requests" on public.maintenance_requests;
create policy "members_read_own_org_maintenance_requests" on public.maintenance_requests
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_maintenance_requests_write" on public.maintenance_requests;
create policy "deny_maintenance_requests_write" on public.maintenance_requests
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_documents" on public.documents;
create policy "members_read_own_org_documents" on public.documents
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_documents_write" on public.documents;
create policy "deny_documents_write" on public.documents
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_maint_req_events" on public.maintenance_request_events;
create policy "members_read_own_org_maint_req_events" on public.maintenance_request_events
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_maint_req_events_write" on public.maintenance_request_events;
create policy "deny_maint_req_events_write" on public.maintenance_request_events
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_team_functions" on public.team_functions;
create policy "members_read_own_org_team_functions" on public.team_functions
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_team_functions_write" on public.team_functions;
create policy "deny_team_functions_write" on public.team_functions
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_member_functions" on public.member_functions;
create policy "members_read_own_org_member_functions" on public.member_functions
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_member_functions_write" on public.member_functions;
create policy "deny_member_functions_write" on public.member_functions
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_tenant_invitations" on public.tenant_invitations;
create policy "members_read_own_org_tenant_invitations" on public.tenant_invitations
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_tenant_invitations_write" on public.tenant_invitations;
create policy "deny_tenant_invitations_write" on public.tenant_invitations
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_conversations" on public.conversations;
create policy "members_read_own_org_conversations" on public.conversations
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_conversations_write" on public.conversations;
create policy "deny_conversations_write" on public.conversations
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_messages" on public.messages;
create policy "members_read_own_org_messages" on public.messages
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_messages_write" on public.messages;
create policy "deny_messages_write" on public.messages
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_owners" on public.owners;
create policy "members_read_own_org_owners" on public.owners
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_owners_write" on public.owners;
create policy "deny_owners_write" on public.owners
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_lease_charge_templates" on public.lease_charge_templates;
create policy "members_read_own_org_lease_charge_templates" on public.lease_charge_templates
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_lease_charge_templates_write" on public.lease_charge_templates;
create policy "deny_lease_charge_templates_write" on public.lease_charge_templates
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_team_member_invitations" on public.team_member_invitations;
create policy "members_read_own_org_team_member_invitations" on public.team_member_invitations
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_team_member_invitations_write" on public.team_member_invitations;
create policy "deny_team_member_invitations_write" on public.team_member_invitations
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_listings" on public.listings;
create policy "members_read_own_org_listings" on public.listings
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_listings_write" on public.listings;
create policy "deny_listings_write" on public.listings
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_listing_applications" on public.listing_applications;
create policy "members_read_own_org_listing_applications" on public.listing_applications
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_listing_applications_write" on public.listing_applications;
create policy "deny_listing_applications_write" on public.listing_applications
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_email_templates" on public.email_templates;
create policy "members_read_own_org_email_templates" on public.email_templates
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_email_templates_write" on public.email_templates;
create policy "deny_email_templates_write" on public.email_templates
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_expenses" on public.expenses;
create policy "members_read_own_org_expenses" on public.expenses
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_expenses_write" on public.expenses;
create policy "deny_expenses_write" on public.expenses
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_tasks" on public.tasks;
create policy "members_read_own_org_tasks" on public.tasks
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_tasks_write" on public.tasks;
create policy "deny_tasks_write" on public.tasks
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_calendar_events" on public.calendar_events;
create policy "members_read_own_org_calendar_events" on public.calendar_events
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_calendar_events_write" on public.calendar_events;
create policy "deny_calendar_events_write" on public.calendar_events
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_owner_portal_accesses" on public.owner_portal_accesses;
create policy "members_read_own_org_owner_portal_accesses" on public.owner_portal_accesses
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_owner_portal_accesses_write" on public.owner_portal_accesses;
create policy "deny_owner_portal_accesses_write" on public.owner_portal_accesses
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_owner_invitations" on public.owner_invitations;
create policy "members_read_own_org_owner_invitations" on public.owner_invitations
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_owner_invitations_write" on public.owner_invitations;
create policy "deny_owner_invitations_write" on public.owner_invitations
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_finance_ledger_accounts" on public.finance_ledger_accounts;
drop policy if exists "deny_all_finance_ledger_accounts" on public.finance_ledger_accounts;
create policy "deny_all_finance_ledger_accounts" on public.finance_ledger_accounts
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_finance_ledger_accounts_write" on public.finance_ledger_accounts;
create policy "deny_finance_ledger_accounts_write" on public.finance_ledger_accounts
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_finance_ledger_categories" on public.finance_ledger_categories;
drop policy if exists "deny_all_finance_ledger_categories" on public.finance_ledger_categories;
create policy "deny_all_finance_ledger_categories" on public.finance_ledger_categories
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "deny_finance_ledger_categories_write" on public.finance_ledger_categories;
create policy "deny_finance_ledger_categories_write" on public.finance_ledger_categories
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_finance_ledger_entries" on public.finance_ledger_entries;
create policy "members_read_own_org_finance_ledger_entries" on public.finance_ledger_entries
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_finance_ledger_entries_write" on public.finance_ledger_entries;
create policy "deny_finance_ledger_entries_write" on public.finance_ledger_entries
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_move_outs" on public.move_outs;
create policy "members_read_own_org_move_outs" on public.move_outs
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_move_outs_write" on public.move_outs;
create policy "deny_move_outs_write" on public.move_outs
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_move_out_charges" on public.move_out_charges;
create policy "members_read_own_org_move_out_charges" on public.move_out_charges
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_move_out_charges_write" on public.move_out_charges;
create policy "deny_move_out_charges_write" on public.move_out_charges
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_move_out_inspections" on public.move_out_inspections;
create policy "members_read_own_org_move_out_inspections" on public.move_out_inspections
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_move_out_inspections_write" on public.move_out_inspections;
create policy "deny_move_out_inspections_write" on public.move_out_inspections
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_invoices" on public.invoices;
create policy "members_read_own_org_invoices" on public.invoices
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_invoices_write" on public.invoices;
create policy "deny_invoices_write" on public.invoices
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_invoice_payment_applications" on public.invoice_payment_applications;
create policy "members_read_own_org_invoice_payment_applications" on public.invoice_payment_applications
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_invoice_payment_applications_write" on public.invoice_payment_applications;
create policy "deny_invoice_payment_applications_write" on public.invoice_payment_applications
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_lease_credit_balances" on public.lease_credit_balances;
create policy "members_read_own_org_lease_credit_balances" on public.lease_credit_balances
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_lease_credit_balances_write" on public.lease_credit_balances;
create policy "deny_lease_credit_balances_write" on public.lease_credit_balances
  as restrictive for all to public
  using (false)
  with check (false);

drop policy if exists "members_read_own_org_invoice_email_jobs" on public.invoice_email_jobs;
create policy "members_read_own_org_invoice_email_jobs" on public.invoice_email_jobs
  as permissive for select to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists "deny_invoice_email_jobs_write" on public.invoice_email_jobs;
create policy "deny_invoice_email_jobs_write" on public.invoice_email_jobs
  as restrictive for all to public
  using (false)
  with check (false);
