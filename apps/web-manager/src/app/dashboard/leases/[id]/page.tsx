import Link from "next/link";
import { Permission } from "@hhousing/api-contracts";
import { requirePermission } from "../../../../api/organizations/permissions";
import { filterDocumentsByScope, getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { createDocumentRepo, createPaymentRepo, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../../api/shared";
import { getDashboardOperatorSession } from "../../detail-page-access";
import LeaseDetailClient from "./lease-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeaseDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getDashboardOperatorSession();
  const permissionResult = await requirePermission(session, Permission.VIEW_LEASE, createTeamFunctionsRepo());

  if (!permissionResult.success) {
    return <div className="p-8 text-red-600">Accès refusé à ce bail.</div>;
  }

  const tenantLeaseRepo = createTenantLeaseRepo();
  const paymentRepo = createPaymentRepo();
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

  const [payments, documents] = await Promise.all([
    paymentRepo.listPayments({ organizationId: session.organizationId, leaseId: id }),
    documentRepo.listDocuments({ organizationId: session.organizationId })
  ]);

  const availableDocuments = filterDocumentsByScope(documents, scoped);
  const selectedDocumentIds = availableDocuments
    .filter((document) => document.attachmentType === "lease" && document.attachmentId === id)
    .map((document) => document.id);

  return (
    <LeaseDetailClient
      id={id}
      initialLease={lease}
      initialPayments={payments}
      initialAvailableDocuments={availableDocuments}
      initialSelectedDocumentIds={selectedDocumentIds}
    />
  );
}
