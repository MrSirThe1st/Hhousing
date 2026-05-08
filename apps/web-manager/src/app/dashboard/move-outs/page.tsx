import Link from "next/link";
import { Permission } from "@hhousing/api-contracts";
import { requirePermission } from "../../../api/organizations/permissions";
import { createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import { getDashboardOperatorSession } from "../detail-page-access";
import MoveOutsListClient from "./move-outs-list-client";

export default async function MoveOutsPage(): Promise<React.ReactElement> {
  const session = await getDashboardOperatorSession();
  const permissionResult = await requirePermission(session, Permission.VIEW_LEASE, createTeamFunctionsRepo());

  if (!permissionResult.success) {
    return <div className="p-8 text-red-600">Accès refusé.</div>;
  }

  const repository = createTenantLeaseRepo();
  const moveOuts = await repository.listMoveOutsByOrganization(session.organizationId);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#010a19]">Départs locataires</h1>
          <p className="mt-1 text-sm text-gray-500">Suivez tous les dossiers de départ en cours et clôturés.</p>
        </div>
        <Link
          href="/dashboard/leases"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Voir les baux
        </Link>
      </div>
      <MoveOutsListClient initialMoveOuts={moveOuts} />
    </div>
  );
}
