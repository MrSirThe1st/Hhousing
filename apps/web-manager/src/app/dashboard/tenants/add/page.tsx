import TenantCreateForm from "../../../../components/tenant-create-form";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

type AddTenantPageProps = {
  searchParams?: Promise<{
    from?: string;
  }>;
};

/**
 * Auth + client form only — do not preload portfolio data on create routes.
 * Dropdowns/options should load via API after paint when needed.
 */
export default async function AddTenantPage({ searchParams }: AddTenantPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");
  const params = await searchParams;

  return (
    <TenantCreateForm
      organizationId={session.organizationId ?? ""}
      fromOnboarding={params?.from === "onboarding"}
    />
  );
}
