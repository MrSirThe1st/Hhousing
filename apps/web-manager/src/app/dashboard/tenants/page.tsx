import { redirect } from "next/navigation";
import type { Tenant } from "@hhousing/domain";
import { listTenants } from "../../../api";
import { filterTenantsByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import TenantManagementPanel from "../../../components/tenant-management-panel";

export default async function TenantsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const result = await listTenants(
    { session, organizationId: session.organizationId ?? "" },
    { repository: createTenantLeaseRepo() }
  );

  const scopedPortfolio = await getScopedPortfolioData(session);

  const tenants: Tenant[] = result.body.success
    ? filterTenantsByScope(result.body.data.tenants, scopedPortfolio)
    : [];

  return <TenantManagementPanel organizationId={session.organizationId ?? ""} tenants={tenants} />;
}

