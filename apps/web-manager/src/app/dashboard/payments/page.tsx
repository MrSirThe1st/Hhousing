import type { Payment } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { createPaymentRepo, createTenantLeaseRepo } from "../../api/shared";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import PaymentManagementPanel from "../../../components/payment-management-panel";
import Link from "next/link";

type PaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("finances");
  const params = await searchParams;
  const status =
    typeof params?.status === "string" && params.status.length > 0 && params.status !== "all"
      ? params.status
      : null;
  const cursor = typeof params?.cursor === "string" && params.cursor.length > 0 ? params.cursor : null;

  const paymentRepo = createPaymentRepo();
  const leaseRepo = createTenantLeaseRepo();

  await paymentRepo.updateOverduePayments(session.organizationId);

  const [paymentsPage, statusCounts, leasesPage] = await Promise.all([
    paymentRepo.listPaymentsPage({
      organizationId: session.organizationId,
      status,
      limit: 50,
      cursor
    }),
    paymentRepo.getPaymentStatusCounts(session.organizationId),
    leaseRepo.listLeasesPage({
      organizationId: session.organizationId,
      status: "active",
      limit: 50,
      cursor: null
    })
  ]);

  const payments: Payment[] = paymentsPage.payments;
  const leases: LeaseWithTenantView[] = leasesPage.leases;
  const nextHref = paymentsPage.nextCursor
    ? `/dashboard/payments?${new URLSearchParams({
        ...(status ? { status } : {}),
        cursor: paymentsPage.nextCursor
      }).toString()}`
    : null;

  return (
    <div id="payments-container">
      {!access.financesWritable && <ReadOnlyBanner />}
      <PaymentManagementPanel
        organizationId={session.organizationId ?? ""}
        payments={payments}
        leases={leases}
        statusCounts={statusCounts}
      />
      {nextHref ? (
        <div className="px-8 pb-8">
          <Link
            href={nextHref}
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Page suivante
          </Link>
        </div>
      ) : null}
    </div>
  );
}
