import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { jsonResponse } from "../../shared";

export async function POST(): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Session invalide ou expirée."
    });
  }

  const userId = session.userId;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Find all organizations where this user is the 'landlord' (owner)
    const membershipsResult = await client.query<{ organization_id: string }>(
      `select organization_id from organization_memberships where user_id = $1 and role = 'landlord'`,
      [userId]
    );

    const organizationIdsToDelete = membershipsResult.rows.map((row) => row.organization_id);

    for (const orgId of organizationIdsToDelete) {
      // applications, ledger entries, inspections, move-out child items
      await client.query(`DELETE FROM move_out_charges WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM move_out_inspections WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM move_outs WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM finance_ledger_entries WHERE organization_id = $1`, [orgId]);

      // invoices and applications
      await client.query(`DELETE FROM invoice_payment_applications WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM invoice_email_jobs WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM invoices WHERE organization_id = $1`, [orgId]);

      // audit logs, expenses, invitations, portal settings
      await client.query(`DELETE FROM audit_logs WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM expenses WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM tenant_invitations WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM team_member_invitations WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM owner_invitations WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM owner_portal_accesses WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM email_templates WHERE organization_id = $1`, [orgId]);

      // general / core items
      await client.query(`DELETE FROM applications WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM listings WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM tasks WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM calendar_events WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM messages WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM conversations WHERE organization_id = $1`, [orgId]);

      // lease details and core documents
      await client.query(`DELETE FROM payments WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM lease_credit_balances WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM leases WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM tenants WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM maintenance_requests WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM documents WHERE organization_id = $1`, [orgId]);

      // properties, units, owners
      await client.query(`DELETE FROM units WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM properties WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM owners WHERE organization_id = $1`, [orgId]);

      // team & memberships
      await client.query(`DELETE FROM member_functions WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM team_functions WHERE organization_id = $1`, [orgId]);
      await client.query(`DELETE FROM organization_memberships WHERE organization_id = $1`, [orgId]);

      // organization itself
      await client.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
    }

    // 2. Delete all memberships this user holds in any other organizations
    await client.query(`DELETE FROM organization_memberships WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database deletion failed:", error);
    return jsonResponse(500, {
      success: false,
      code: "DATABASE_ERROR",
      error: "Impossible de supprimer les données de la base de données."
    });
  } finally {
    client.release();
    await pool.end();
  }

  // 3. Delete from Supabase Auth using admin client
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Supabase Auth deletion failed:", deleteError);
      return jsonResponse(500, {
        success: false,
        code: "AUTH_ERROR",
        error: `Erreur d'authentification: ${deleteError.message}`
      });
    }
  } catch (error) {
    console.error("Supabase client failed:", error);
    return jsonResponse(500, {
      success: false,
      code: "AUTH_ERROR",
      error: "Impossible de supprimer l'utilisateur du service d'authentification."
    });
  }

  return jsonResponse(200, {
    success: true,
    message: "Compte supprimé avec succès."
  });
}
