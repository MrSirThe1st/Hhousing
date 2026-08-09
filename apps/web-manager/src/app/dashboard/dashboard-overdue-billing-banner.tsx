import SaasBillingOverdueBanner from "../../components/saas-billing-overdue-banner";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";

/**
 * Deferred layout slot — must not block first paint of dashboard children.
 */
export default async function DashboardOverdueBillingBanner({
  organizationId,
  enabled
}: {
  organizationId: string;
  enabled: boolean;
}): Promise<React.ReactElement | null> {
  if (!enabled) {
    return null;
  }

  try {
    const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
    const overdueInvoice = await billingRepo.getOpenOverdueInvoiceForOrganization(organizationId);
    if (!overdueInvoice) {
      return null;
    }

    return <SaasBillingOverdueBanner invoice={overdueInvoice} />;
  } catch {
    return null;
  }
}
