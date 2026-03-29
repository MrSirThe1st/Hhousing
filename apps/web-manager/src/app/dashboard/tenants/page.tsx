import { redirect } from "next/navigation";
import type { Tenant } from "@hhousing/domain";
import { listTenants } from "../../../api";
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

  const tenants: Tenant[] = result.body.success ? result.body.data.tenants : [];

  return <TenantManagementPanel organizationId={session.organizationId ?? ""} tenants={tenants} />;
}

