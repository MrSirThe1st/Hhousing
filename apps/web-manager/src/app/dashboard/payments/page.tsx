import { redirect } from "next/navigation";
import type { Payment } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { listPayments, listLeases } from "../../../api";
import {
  filterLeasesByScope,
  filterPaymentsByScope,
  getScopedPortfolioData
} from "../../../lib/operator-scope-portfolio";
import { createPaymentRepo, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import PaymentManagementPanel from "../../../components/payment-management-panel";

export default async function PaymentsPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("finances");

  const paymentRepo = createPaymentRepo();
  const leaseRepo = createTenantLeaseRepo();
  const teamFunctionsRepo = createTeamFunctionsRepo();

  await paymentRepo.updateOverduePayments(session.organizationId);

  const [paymentsResult, leasesResult] = await Promise.all([
    listPayments(
      { session, organizationId: session.organizationId ?? "", leaseId: null, status: null },
      { repository: paymentRepo, teamFunctionsRepository: teamFunctionsRepo }
    ),
    listLeases(
      { session, organizationId: session.organizationId ?? "" },
      { repository: leaseRepo, teamFunctionsRepository: teamFunctionsRepo }
    )
  ]);

  const scopedPortfolio = await getScopedPortfolioData(session);

  const payments: Payment[] = paymentsResult.body.success
    ? filterPaymentsByScope(paymentsResult.body.data.payments, scopedPortfolio)
    : [];
  const leases: LeaseWithTenantView[] = leasesResult.body.success
    ? filterLeasesByScope(leasesResult.body.data.leases, scopedPortfolio)
    : [];

  return (
    <PaymentManagementPanel
      organizationId={session.organizationId ?? ""}
      payments={payments}
      leases={leases}
    />
  );
}

