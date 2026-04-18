import Link from "next/link";
import { redirect } from "next/navigation";
import OwnerClientCreatePanel from "../../../../components/owner-client-create-panel";
import { createRepositoryFromEnv } from "../../../api/shared";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

export default async function AddOwnerPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const repoResult = createRepositoryFromEnv();
  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const owners = await repoResult.data.listOwners(session.organizationId);
  const existingClientCount = owners.filter((owner) => owner.ownerType === "client").length;

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

      <OwnerClientCreatePanel
        organizationId={session.organizationId}
        existingClientCount={existingClientCount}
      />
    </div>
  );
}