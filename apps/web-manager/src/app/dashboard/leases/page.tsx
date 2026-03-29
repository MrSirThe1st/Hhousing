import { redirect } from "next/navigation";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import { listLeases, listProperties, listTenants } from "../../../api";
import LeaseManagementPanel from "../../../components/lease-management-panel";
import { createRepositoryFromEnv, createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";

export default async function LeasesPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const propertyRepoResult = createRepositoryFromEnv();
  if (!propertyRepoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const tenantRepo = createTenantLeaseRepo();

  const result = await listLeases(
    { session, organizationId: session.organizationId ?? "" },
    { repository: tenantRepo }
  );
  const tenantsResult = await listTenants(
    { session, organizationId: session.organizationId ?? "" },
    { repository: tenantRepo }
  );
  const propertiesResult = await listProperties(
    { session, organizationId: session.organizationId ?? "" },
    { repository: propertyRepoResult.data }
  );

  const leases: LeaseWithTenantView[] = result.body.success ? result.body.data.leases : [];
  const tenants: Tenant[] = tenantsResult.body.success ? tenantsResult.body.data.tenants : [];
  const properties = propertiesResult.body.success ? propertiesResult.body.data.items : [];

  return (
    <LeaseManagementPanel
      organizationId={session.organizationId ?? ""}
      leases={leases}
      tenants={tenants}
      properties={properties}
    />
  );
}

