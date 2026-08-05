-- Remove in-app support tickets. Operator support is handled via Tawk.to chat.
-- Domain-specific intake (reports / contact_requests) may come later — not a full ticket system.

drop policy if exists "deny_all_support_tickets" on public.support_tickets;
drop table if exists public.support_tickets;
