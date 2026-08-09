import Link from "next/link";
import OwnerClientCreatePanel from "../../../../components/owner-client-create-panel";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

/**
 * Auth + client form only — do not preload owner lists on create routes.
 */
export default async function AddOwnerPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link href="/dashboard/clients" className="inline-block text-sm font-medium text-[#0063fe] hover:underline">
          ← Retour aux owners
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Ajouter un owner</h1>
        <p className="text-sm text-slate-500">
          Créez une fiche propriétaire complète avant de rattacher ses biens au portefeuille géré.
        </p>
      </div>

      <OwnerClientCreatePanel organizationId={session.organizationId} />
    </div>
  );
}
