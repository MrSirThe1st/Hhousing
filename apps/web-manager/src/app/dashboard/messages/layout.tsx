import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import { redirectIfV1FeatureDeferred } from "../../../lib/v1-deferred-feature-guard";

export default async function MessagesLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireDashboardSectionAccess("operations");
  redirectIfV1FeatureDeferred("messaging");
  return <>{children}</>;
}
