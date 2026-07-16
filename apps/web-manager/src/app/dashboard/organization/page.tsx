import { redirect } from "next/navigation";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function OrganizationSettingsPage(): Promise<React.ReactElement> {
  const { access } = await requireDashboardSectionAccess("organization");

  if (!access.organization) {
    redirect("/dashboard");
  }

  redirect("/dashboard/profile?tab=organisation");
}
