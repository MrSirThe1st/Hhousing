import Link from "next/link";
import { Permission } from "@hhousing/api-contracts";
import { requirePermission } from "../../../../api/organizations/permissions";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { createMaintenanceRepo, createTeamFunctionsRepo } from "../../../api/shared";
import { getDashboardOperatorSession } from "../../detail-page-access";
import MaintenanceDetailClient from "./maintenance-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MaintenanceDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getDashboardOperatorSession();
  const permissionResult = await requirePermission(session, Permission.VIEW_MAINTENANCE, createTeamFunctionsRepo());

  if (!permissionResult.success) {
    return <div className="p-8 text-red-600">Accès refusé à cette demande.</div>;
  }

  const repository = createMaintenanceRepo();
  const [request, timeline, scoped] = await Promise.all([
    repository.getMaintenanceRequestById(id, session.organizationId),
    repository.listMaintenanceRequestTimeline(id, session.organizationId),
    getScopedPortfolioData(session)
  ]);

  if (!request || !scoped.unitIds.has(request.unitId)) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Demande introuvable</p>
        <Link href="/dashboard/maintenance" className="mt-4 inline-block text-[#0063fe] hover:underline">
          Retour aux demandes
        </Link>
      </div>
    );
  }

  return <MaintenanceDetailClient id={id} initialRequest={request} initialTimeline={timeline} />;
}
