-- Allow invited owners to read their own portal access rows.
-- Middleware and auth callback query owner_portal_accesses with the user JWT;
-- the previous policy only allowed org members via user_org_ids(), so owners
-- always looked like they had no access and were sent to /account-type.

drop policy if exists "owners_read_own_portal_access" on public.owner_portal_accesses;
create policy "owners_read_own_portal_access" on public.owner_portal_accesses
  as permissive for select to authenticated
  using (user_id = auth.uid());
