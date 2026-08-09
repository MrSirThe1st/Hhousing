import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import LeaseManagementPanel from "../../../components/lease-management-panel";
import { createTenantLeaseRepo } from "../../api/shared";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import Link from "next/link";

type LeasesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeasesPage({ searchParams }: LeasesPageProps): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("operations");
  const params = await searchParams;
  const status =
    typeof params?.status === "string" && params.status.length > 0 && params.status !== "all"
      ? params.status
      : null;
  const cursor = typeof params?.cursor === "string" && params.cursor.length > 0 ? params.cursor : null;

  const tenantRepo = createTenantLeaseRepo();
  const [leasesPage, statusCounts] = await Promise.all([
    tenantRepo.listLeasesPage({
      organizationId: session.organizationId,
      status,
      limit: 50,
      cursor
    }),
    tenantRepo.getLeaseStatusCounts(session.organizationId)
  ]);

  const leases: LeaseWithTenantView[] = leasesPage.leases;
  const nextHref = leasesPage.nextCursor
    ? `/dashboard/leases?${new URLSearchParams({
        ...(status ? { status } : {}),
        cursor: leasesPage.nextCursor
      }).toString()}`
    : null;

  return (
    <div id="leases-container">
      {!access.operationsWritable && <ReadOnlyBanner />}
      <LeaseManagementPanel leases={leases} statusCounts={statusCounts} />
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
