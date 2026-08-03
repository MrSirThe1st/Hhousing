import { createClient } from "@supabase/supabase-js";
import type { Tenant } from "@hhousing/domain";
import { isDeliverableTenantEmail } from "../../api/tenants/tenant-password-reset";
import { sendRawHtmlEmailFromEnv } from "../email/resend";
import type { AccountDeletionNotifier } from "../../api/tenants/tenant-delete-account";

function formatDate(iso: string | null): string {
  if (!iso) {
    return "";
  }
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return iso;
  }
}

function buildHtml(input: {
  kind: "requested" | "reminder" | "completed";
  fullName: string;
  scheduledDeletionAtIso: string | null;
}): { subject: string; html: string } {
  const name = input.fullName || "locataire";
  const dateLabel = formatDate(input.scheduledDeletionAtIso);

  if (input.kind === "requested") {
    return {
      subject: "Confirmation de suppression de compte Haraka Property",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
          <h1 style="margin:0 0 16px;font-size:22px;">Suppression de compte demandée</h1>
          <p style="margin:0 0 12px;color:#334155;font-size:14px;">Bonjour ${name},</p>
          <p style="margin:0 0 12px;color:#334155;font-size:14px;">
            Nous avons bien reçu votre demande de suppression de compte. Votre accès à l'application sera
            définitivement fermé le <strong>${dateLabel}</strong>, sauf si vous annulez depuis l'application avant cette date.
          </p>
          <p style="margin:0 0 12px;color:#334155;font-size:14px;">
            Les documents de bail et de paiement conservés par votre bailleur restent dans son historique
            comptable, sans vos identifiants de connexion.
          </p>
        </div>
      `
    };
  }

  if (input.kind === "reminder") {
    return {
      subject: "Rappel : suppression de compte Haraka Property dans 3 jours",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
          <h1 style="margin:0 0 16px;font-size:22px;">Rappel de suppression</h1>
          <p style="margin:0 0 12px;color:#334155;font-size:14px;">Bonjour ${name},</p>
          <p style="margin:0 0 12px;color:#334155;font-size:14px;">
            Votre compte Haraka Property sera définitivement fermé le <strong>${dateLabel}</strong>.
            Ouvrez l'application et annulez la suppression si vous souhaitez conserver votre accès.
          </p>
        </div>
      `
    };
  }

  return {
    subject: "Compte Haraka Property supprimé",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
        <h1 style="margin:0 0 16px;font-size:22px;">Compte supprimé</h1>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">Bonjour,</p>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          Votre compte locataire Haraka Property a été définitivement fermé. Vous ne pourrez plus vous connecter.
          Votre bailleur conserve uniquement les informations nécessaires à la gestion locative et à la comptabilité.
        </p>
      </div>
    `
  };
}

/**
 * Sends deletion lifecycle emails when a deliverable address is available.
 * Completed notices use the pre-anonymization address captured by the caller.
 */
export function createAccountDeletionNotifierFromEnv(options?: {
  resolveEmail?: (tenant: Tenant) => string | null;
}): AccountDeletionNotifier {
  return async ({ tenant, kind, scheduledDeletionAtIso }) => {
    const email =
      options?.resolveEmail?.(tenant)
      ?? (isDeliverableTenantEmail(tenant.email) ? tenant.email.trim() : null);

    if (!email) {
      return;
    }

    const content = buildHtml({
      kind,
      fullName: tenant.fullName,
      scheduledDeletionAtIso
    });

    await sendRawHtmlEmailFromEnv({
      to: email,
      subject: content.subject,
      html: content.html
    });
  };
}

export function createSupabaseUserDeleterFromEnv(): (userId: string) => Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin is not configured");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return async (userId: string): Promise<void> => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      throw new Error(`Failed to delete Supabase user: ${error.message}`);
    }
  };
}
