import { redirect } from "next/navigation";
import TenantCreateForm from "../../../../components/tenant-create-form";
import { getServerAuthSession } from "../../../../lib/session";

export default async function AddTenantPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  return <TenantCreateForm organizationId={session.organizationId ?? ""} />;
}