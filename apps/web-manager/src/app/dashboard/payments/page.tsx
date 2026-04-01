import { redirect } from "next/navigation";
import type { Payment } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { listPayments, listLeases } from "../../../api";
import { createPaymentRepo, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import PaymentManagementPanel from "../../../components/payment-management-panel";

export default async function PaymentsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

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

  const payments: Payment[] = paymentsResult.body.success ? paymentsResult.body.data.payments : [];
  const leases: LeaseWithTenantView[] = leasesResult.body.success ? leasesResult.body.data.leases : [];

  return (
    <PaymentManagementPanel
      organizationId={session.organizationId ?? ""}
      payments={payments}
      leases={leases}
    />
  );
}

