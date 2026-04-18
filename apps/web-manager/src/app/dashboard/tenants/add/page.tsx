import { redirect } from "next/navigation";
import TenantCreateForm from "../../../../components/tenant-create-form";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

export default async function AddTenantPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  return <TenantCreateForm organizationId={session.organizationId ?? ""} />;
}