import Link from "next/link";
import DashboardCalendar from "../../components/dashboard-calendar";
import DashboardGreeting from "../../components/dashboard-greeting";
import DashboardOverviewView, { getFinanceMonthLabel } from "../../components/dashboard-overview-view";
import DashboardTasksPanel from "../../components/dashboard-tasks-panel";
import { requireDashboardSectionAccess } from "../../lib/dashboard-access";
import { loadDashboardInitial } from "../../lib/dashboard-overview";
import { buildDashboardWorkflowData } from "../../lib/dashboard-workflow";
import { getIndividualExperienceFeatures } from "../../lib/individual-experience";
import { getServerOperatorContext } from "../../lib/operator-context";
import { isV1FeatureDeferred } from "../../lib/v1-deferred-features";
import type { PlatformExperience } from "@hhousing/domain";

type DashboardTab = "overview" | "tasks" | "calendar";

type DashboardPageProps = {
  searchParams?: Promise<{
    tab?: string;
    currency?: string;
  }>;
};

function getDashboardTab(tab: string | undefined, allowTasksCalendar: boolean): DashboardTab {
  if (!allowTasksCalendar && (tab === "tasks" || tab === "calendar")) {
    return "overview";
  }

  if (tab === "tasks" || tab === "calendar") {
    return tab;
  }

  return "overview";
}

function getVariantHeader(experience: PlatformExperience): { title: string; subtitle: string } {
  if (experience === "individual") {
    return {
      title: "Compte personnel",
      subtitle: "Votre activité immobilière en un coup d'œil"
    };
  }

  return {
    title: "Compte agence",
    subtitle: "Votre activité immobilière en un coup d'œil"
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("dashboard");
  const params = await searchParams;
  const operatorContext = await getServerOperatorContext(session);
  const individualFeatures = getIndividualExperienceFeatures(operatorContext.experience);
  const allowTasksCalendar =
    !isV1FeatureDeferred("tasksCalendar") && individualFeatures.dashboardTasksCalendar;
  const activeTab = getDashboardTab(params?.tab, allowTasksCalendar);
  const selectedCurrency = params?.currency === "CDF" || params?.currency === "FC" ? "CDF" : "USD";
  const header = getVariantHeader(operatorContext.experience);

  const initial = activeTab === "overview"
    ? await loadDashboardInitial(session, { selectedCurrency })
    : null;

  let workflowData: Awaited<ReturnType<typeof buildDashboardWorkflowData>> | null = null;
  if (allowTasksCalendar && activeTab !== "overview") {
    try {
      workflowData = await buildDashboardWorkflowData(session);
    } catch (error) {
      console.error("Failed to load dashboard workflow data", error);
    }
  }

  const taskBadgeCount = workflowData
    ? workflowData.tasks.filter((task) => task.status === "open" || task.status === "in_progress").length
    : 0;

  const hasNoData = initial !== null && initial.portfolio.properties === 0;

  const getTabHref = (tabId: DashboardTab) => {
    const query = new URLSearchParams();
    if (tabId !== "overview") {
      query.set("tab", tabId);
    }
    if (selectedCurrency !== "USD") {
      query.set("currency", selectedCurrency);
    }
    const queryString = query.toString();
    return queryString ? `/dashboard?${queryString}` : "/dashboard";
  };

  const getCurrencyHref = (currencyCode: string) => {
    const query = new URLSearchParams();
    if (activeTab !== "overview") {
      query.set("tab", activeTab);
    }
    if (currencyCode !== "USD") {
      query.set("currency", currencyCode);
    }
    const queryString = query.toString();
    return queryString ? `/dashboard?${queryString}` : "/dashboard";
  };

  const includeFinanceQuickLinks = individualFeatures.financeReportsWidgets;

  return (
    <div className="space-y-6 p-8">
      <div className="space-y-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">{header.title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{header.subtitle}</p>
        </div>

        {allowTasksCalendar ? (
          <div id="dashboard-tabs" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-[#0d1526]">
            {(["overview", "tasks", "calendar"] as DashboardTab[]).map((tabId) => {
              const label = tabId === "overview" ? "Vue d'ensemble" : tabId === "tasks" ? "Tâches" : "Calendrier";
              const showBadge = tabId === "tasks" && taskBadgeCount > 0;
              return (
                <Link
                  key={tabId}
                  href={getTabHref(tabId)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                    activeTab === tabId
                      ? "bg-[#0063fe] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                  {showBadge ? (
                    <span
                      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        activeTab === tabId
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {taskBadgeCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {activeTab === "overview" ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <DashboardGreeting />
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-[#0d1526]">
            <span className="px-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Devise
            </span>
            <Link
              href={getCurrencyHref("USD")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCurrency === "USD"
                  ? "bg-[#0063fe] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              USD
            </Link>
            <Link
              href={getCurrencyHref("CDF")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCurrency === "CDF"
                  ? "bg-[#0063fe] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              CDF
            </Link>
          </div>
        </div>
      ) : null}

      {activeTab === "overview" && initial ? (
        hasNoData ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-[#0063fe]/15">
              <svg className="h-8 w-8 text-[#0063fe]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Configurez votre espace</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Suivez l&apos;assistant : premier bien, locataire, puis bail.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
              >
                Continuer la configuration
              </Link>
            </div>
          </div>
        ) : (
          <DashboardOverviewView
            initial={initial}
            includeReports={includeFinanceQuickLinks}
            financeMonthLabel={getFinanceMonthLabel()}
            session={session}
            selectedCurrency={selectedCurrency}
          />
        )
      ) : activeTab === "calendar" && workflowData ? (
        <DashboardCalendar
          organizationId={session.organizationId}
          currentUserId={session.userId}
          entries={workflowData.calendarEntries}
          relatedOptions={workflowData.relatedOptions}
          scopeLabel="Tous mes biens"
        />
      ) : activeTab === "tasks" && workflowData ? (
        <DashboardTasksPanel
          organizationId={session.organizationId}
          currentUserId={session.userId}
          tasks={workflowData.tasks}
          relatedOptions={workflowData.relatedOptions}
        />
      ) : null}
    </div>
  );
}
