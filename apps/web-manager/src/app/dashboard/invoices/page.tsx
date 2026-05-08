import { redirect } from "next/navigation";
import type { Invoice, LeaseCreditBalance, Organization } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { listInvoices, listLeases } from "../../../api";
import { createInvoiceRepo, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import { filterLeasesByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import InvoiceManagementPanel from "../../../components/invoice-management-panel";
import { getNow } from "../../../lib/time";

export default async function InvoicesPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("finances");

  const teamFunctionsRepo = createTeamFunctionsRepo();
  const scopedPortfolio = await getScopedPortfolioData(session);

  const [invoicesResult, leasesResult, credits] = await Promise.all([
    listInvoices(
      {
        organizationId: session.organizationId,
        leaseId: null,
        status: null,
        emailStatus: null,
        year: String(getNow().getFullYear()),
        session
      },
      {
        repository: createInvoiceRepo(),
        teamFunctionsRepository: teamFunctionsRepo
      }
    ),
    listLeases(
      {
        organizationId: session.organizationId,
        session
      },
      {
        repository: createTenantLeaseRepo(),
        teamFunctionsRepository: teamFunctionsRepo
      }
    ),
    createInvoiceRepo().listLeaseCreditBalances(session.organizationId)
  ]);

  const invoices: Invoice[] = invoicesResult.body.success
    ? invoicesResult.body.data.invoices.filter((invoice) => scopedPortfolio.leaseIds.has(invoice.leaseId))
    : [];
  const leases: LeaseWithTenantView[] = leasesResult.body.success
    ? filterLeasesByScope(leasesResult.body.data.leases, scopedPortfolio)
    : [];
  const scopedCredits: LeaseCreditBalance[] = credits.filter((credit) => scopedPortfolio.leaseIds.has(credit.leaseId));
  const repositoryResult = createRepositoryFromEnv();
  const organization: Organization | null = repositoryResult.success
    ? await repositoryResult.data.getOrganizationById(session.organizationId)
    : null;

  return (
    <>
      {!access.financesWritable && <ReadOnlyBanner />}
      <InvoiceManagementPanel invoices={invoices} leases={leases} credits={scopedCredits} organization={organization} />
    </>
  );
}
