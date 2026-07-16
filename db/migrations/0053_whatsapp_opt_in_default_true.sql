-- Enable WhatsApp notifications by default for tenants

alter table tenants
  alter column whatsapp_opt_in set default true;

update tenants
  set whatsapp_opt_in = true
  where whatsapp_opt_in = false;
