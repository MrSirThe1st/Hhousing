import { createAuditLogRepo } from "../../api/shared";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

type SupabaseAdminUser = {
  id: string;
  email?: string | null;
  user_metadata?: unknown;
};

type AuditPageProps = {
  searchParams?: Promise<{
    day?: string;
  }>;
};

function isValidDay(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readUserMetadataName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const maybeFullName = "full_name" in metadata ? metadata.full_name : undefined;
  if (typeof maybeFullName === "string" && maybeFullName.trim().length > 0) {
    return maybeFullName.trim();
  }

  const maybeName = "name" in metadata ? metadata.name : undefined;
  if (typeof maybeName === "string" && maybeName.trim().length > 0) {
    return maybeName.trim();
  }

  return null;
}

function getActorLabel(user: SupabaseAdminUser | null, actorUserId: string | null): string {
  if (user) {
    return readUserMetadataName(user.user_metadata) ?? user.email?.split("@")[0] ?? user.id;
  }

  return actorUserId ?? "Membre inconnu";
}

function getActionLabel(actionKey: string): string {
  if (actionKey === "team.invitation.sent") {
    return "Invitation envoyee";
  }

  if (actionKey === "team.invitation.resent") {
    return "Invitation renvoyee";
  }

  if (actionKey === "team.invitation.revoked") {
    return "Invitation annulee";
  }

  if (actionKey === "team.member.functions_updated") {
    return "Presets mis a jour";
  }

  return actionKey;
}

async function listSupabaseUsersByIds(userIds: string[]): Promise<Map<string, SupabaseAdminUser>> {
  const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseAdminUrl || !supabaseServiceRoleKey || userIds.length === 0) {
    return new Map();
  }

  const response = await fetch(`${supabaseAdminUrl}/auth/v1/admin/users`, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return new Map();
  }

  const payload = (await response.json()) as { users?: SupabaseAdminUser[] };
  const ids = new Set(userIds);
  return new Map((payload.users ?? []).filter((user) => ids.has(user.id)).map((user) => [user.id, user]));
}

export default async function AuditPage({ searchParams }: AuditPageProps): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("audit");

  const params = searchParams ? await searchParams : undefined;
  const selectedDay = isValidDay(params?.day)
    ? (params?.day as string)
    : new Date().toISOString().slice(0, 10);

  if (!access.isFoundingManager) {
    return <div className="p-8 text-sm text-slate-600">Acces reserve au manager fondateur.</div>;
  }

  let auditEvents = [] as Awaited<ReturnType<ReturnType<typeof createAuditLogRepo>["listAuditLogsByDay"]>>;
  let auditSchemaMissing = false;

  try {
    auditEvents = await createAuditLogRepo().listAuditLogsByDay({
      organizationId: session.organizationId,
      dayIso: selectedDay
    });
  } catch (error) {
    const maybeCode = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    if (maybeCode === "42P01") {
      auditSchemaMissing = true;
    } else {
      throw error;
    }
  }

  const actorUsers = await listSupabaseUsersByIds(
    auditEvents
      .map((event) => event.actorUserId)
      .filter((userId): userId is string => Boolean(userId))
  );

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit</h1>
        <p className="mt-1 text-sm text-slate-600">
          Suivi des actions equipe par jour.
        </p>
      </div>

      <form method="get" className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="block max-w-xs">
          <span className="text-sm font-semibold text-slate-700">Jour</span>
          <input
            type="date"
            name="day"
            defaultValue={selectedDay}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          />
        </label>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
        >
          Filtrer
        </button>
      </form>

      {auditSchemaMissing ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          La table d&apos;audit n&apos;est pas encore disponible. Appliquez la migration `0037_init_audit_logs.sql` pour activer cette page.
        </div>
      ) : auditEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Aucun evenement journalise pour ce jour.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.2fr_1.3fr_1fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Action</span>
            <span>Acteur</span>
            <span>Cible</span>
            <span>Heure</span>
          </div>
          <div className="divide-y divide-slate-200">
            {auditEvents.map((event) => (
              <div key={event.id} className="grid grid-cols-[1.2fr_1.3fr_1fr_0.9fr] gap-4 px-4 py-3 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-900">{getActionLabel(event.actionKey)}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.entityType}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {getActorLabel(actorUsers.get(event.actorUserId ?? "") ?? null, event.actorUserId)}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">{event.actorUserId ?? "Sans acteur"}</p>
                </div>
                <div>
                  <p className="truncate text-slate-900">
                    {typeof event.metadata.email === "string"
                      ? event.metadata.email
                      : typeof event.entityId === "string"
                        ? event.entityId
                        : "-"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {Array.isArray(event.metadata.functionCodes)
                      ? event.metadata.functionCodes.join(", ")
                      : ""}
                  </p>
                </div>
                <div className="text-slate-500">{new Date(event.createdAtIso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
