import Link from "next/link";
import { createTenantLeaseRepo } from "../../../api/shared";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { getDashboardOperatorSession } from "../../detail-page-access";
import TenantDetailClient from "./tenant-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

function canAccessTenantInCurrentScope(
  tenantId: string,
  scopedTenantIds: Set<string>,
  organizationLeases: Array<{ tenantId: string }>
): boolean {
  if (scopedTenantIds.has(tenantId)) {
    return true;
  }

  return !organizationLeases.some((lease) => lease.tenantId === tenantId);
}

export default async function TenantDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getDashboardOperatorSession();
  const repository = createTenantLeaseRepo();
  const tenant = await repository.getTenantById(id, session.organizationId);

  if (!tenant) {
    return <div className="p-8"><p className="text-gray-600">Locataire introuvable</p><Link href="/dashboard/tenants" className="mt-4 inline-block text-[#0063fe] hover:underline">Retour aux locataires</Link></div>;
  }

  const scoped = await getScopedPortfolioData(session);
  const organizationLeases = await repository.listLeasesByOrganization(session.organizationId);

  if (!canAccessTenantInCurrentScope(id, scoped.tenantIds, organizationLeases)) {
    return <div className="p-8"><p className="text-gray-600">Locataire introuvable</p><Link href="/dashboard/tenants" className="mt-4 inline-block text-[#0063fe] hover:underline">Retour aux locataires</Link></div>;
  }

  return <TenantDetailClient id={id} initialTenant={tenant} />;
}
