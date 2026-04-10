import Link from "next/link";
import { createTenantLeaseRepo } from "../../../api/shared";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { getDashboardOperatorSession } from "../../detail-page-access";
import TenantDetailClient from "./tenant-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TenantDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getDashboardOperatorSession();
  const scoped = await getScopedPortfolioData(session);

  if (!scoped.tenantIds.has(id)) {
    return <div className="p-8"><p className="text-gray-600">Locataire introuvable</p><Link href="/dashboard/tenants" className="mt-4 inline-block text-[#0063fe] hover:underline">Retour aux locataires</Link></div>;
  }

  const tenant = await createTenantLeaseRepo().getTenantById(id, session.organizationId);

  if (!tenant) {
    return <div className="p-8"><p className="text-gray-600">Locataire introuvable</p><Link href="/dashboard/tenants" className="mt-4 inline-block text-[#0063fe] hover:underline">Retour aux locataires</Link></div>;
  }

  return <TenantDetailClient id={id} initialTenant={tenant} />;
}
