import type { MembershipAuthSession } from "@hhousing/api-contracts";
import DashboardFinancialTrendChart from "./dashboard-financial-trend-chart";
import { loadDashboardTrends } from "../lib/dashboard-overview";

type DashboardTrendsSectionProps = {
  session: MembershipAuthSession;
  selectedCurrency: string;
};

export default async function DashboardTrendsSection({
  session,
  selectedCurrency
}: DashboardTrendsSectionProps): Promise<React.ReactElement> {
  const trend = await loadDashboardTrends(session, selectedCurrency);
  return <DashboardFinancialTrendChart trend={trend} />;
}
