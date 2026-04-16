import Link from "next/link";
import { Permission } from "@hhousing/api-contracts";
import { requirePermission } from "../../../../../api/organizations/permissions";
import { filterDocumentsByScope, getScopedPortfolioData } from "../../../../../lib/operator-scope-portfolio";
import { createDocumentRepo, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../../../api/shared";
import { getDashboardOperatorSession } from "../../../detail-page-access";
import MoveOutFlowClient from "./move-out-flow-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeaseMoveOutPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getDashboardOperatorSession();
  const permissionResult = await requirePermission(session, Permission.VIEW_LEASE, createTeamFunctionsRepo());

  if (!permissionResult.success) {
    return <div className="p-8 text-red-600">Accès refusé au workflow move-out.</div>;
  }

  const tenantLeaseRepo = createTenantLeaseRepo();
  const documentRepo = createDocumentRepo();

  const [lease, scoped] = await Promise.all([
    tenantLeaseRepo.getLeaseById(id, session.organizationId),
    getScopedPortfolioData(session)
  ]);

  if (!lease || !scoped.leaseIds.has(id)) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Bail introuvable</p>
        <Link href="/dashboard/leases" className="mt-4 inline-block text-[#0063fe] hover:underline">
          Retour aux baux
        </Link>
      </div>
    );
  }

  if (lease.status !== "active") {
    return (
      <div className="p-8">
        <p className="text-gray-600">Le workflow move-out est disponible uniquement pour un bail actif.</p>
        <Link href={`/dashboard/leases/${id}`} className="mt-4 inline-block text-[#0063fe] hover:underline">
          Retour au bail
        </Link>
      </div>
    );
  }

  const documents = await documentRepo.listDocuments({ organizationId: session.organizationId });
  const availableDocuments = filterDocumentsByScope(documents, scoped);

  return (
    <MoveOutFlowClient
      id={id}
      initialLease={lease}
      initialAvailableDocuments={availableDocuments}
    />
  );
}
