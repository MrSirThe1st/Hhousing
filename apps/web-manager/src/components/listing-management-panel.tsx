"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ConvertListingApplicationOutput,
  ListingApplicationView,
  ManagerListingView
} from "@hhousing/api-contracts";
import { patchWithAuth, postWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";

type ListingsWorkspaceTab = "listings" | "applications" | "screening";

interface ListingManagementPanelProps {
  organizationId: string;
  currentScopeLabel: string;
  activeTab: ListingsWorkspaceTab;
  listings: ManagerListingView[];
  applications: ListingApplicationView[];
}

const SCREENING_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "needs_more_info"
] as const;

function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function formatStatusActionLabel(status: (typeof SCREENING_STATUSES)[number]): string {
  switch (status) {
    case "submitted":
      return "Mark submitted";
    case "under_review":
      return "Move to review";
    case "approved":
      return "Approve";
    case "rejected":
      return "Reject";
    case "needs_more_info":
      return "Request info";
    default:
      return formatStatusLabel(status);
  }
}

function formatStatusProgressLabel(status: (typeof SCREENING_STATUSES)[number]): string {
  switch (status) {
    case "submitted":
      return "Marking as submitted...";
    case "under_review":
      return "Moving to review...";
    case "approved":
      return "Approving application...";
    case "rejected":
      return "Rejecting application...";
    case "needs_more_info":
      return "Requesting more info...";
    default:
      return "Updating screening status...";
  }
}

function formatCurrency(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function getApplicationBadgeClass(status: string): string {
  if (status === "approved" || status === "converted") return "text-emerald-600";
  if (status === "rejected") return "text-rose-600";
  if (status === "needs_more_info") return "text-amber-600";
  if (status === "under_review") return "text-blue-600";
  return "text-slate-500";
}

type ApplicationBusyState = {
  applicationId: string;
  action: "status" | "convert";
  status?: (typeof SCREENING_STATUSES)[number];
};

export default function ListingManagementPanel({
  organizationId,
  currentScopeLabel,
  activeTab,
  listings,
  applications
}: ListingManagementPanelProps): React.ReactElement {
  const router = useRouter();

  const [applicationBusyState, setApplicationBusyState] = useState<ApplicationBusyState | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [isRoutePending, startRouteTransition] = useTransition();

  const screeningItems = applications.filter((a) => a.application.status !== "converted");
  const isScreeningActionBusy =
    activeTab === "screening" &&
    applicationBusyState !== null &&
    (applicationBusyState.action === "convert" || isRoutePending);

  const publishedListingsCount = listings.filter((item) => item.listing?.status === "published").length;
  const totalApplicationsCount = applications.length;
  const approvedApplicationsCount = applications.filter((app) => app.application.status === "approved").length;

  useEffect(() => {
    if (!isRoutePending && applicationBusyState?.action === "status") {
      setApplicationBusyState(null);
    }
  }, [applicationBusyState, isRoutePending]);

  async function updateApplication(
    applicationId: string,
    status: typeof SCREENING_STATUSES[number]
  ): Promise<void> {
    setApplicationBusyState({ applicationId, action: "status", status });
    setApplicationError(null);

    const result = await patchWithAuth(`/api/applications/${applicationId}`, {
      organizationId,
      status
    });

    if (!result.success) {
      setApplicationBusyState(null);
      setApplicationError(result.error);
      return;
    }

    startRouteTransition(() => {
      router.refresh();
    });
  }

  async function convertApplication(applicationId: string): Promise<void> {
    setApplicationBusyState({ applicationId, action: "convert" });
    setApplicationError(null);

    const result = await postWithAuth<ConvertListingApplicationOutput>(
      `/api/applications/${applicationId}/convert`,
      { organizationId }
    );

    if (!result.success) {
      setApplicationBusyState(null);
      setApplicationError(result.error);
      return;
    }

    startRouteTransition(() => {
      router.push(
        `/dashboard/leases/move-in?tenantId=${encodeURIComponent(
          result.data.tenant.id
        )}&applicationId=${encodeURIComponent(applicationId)}`
      );
    });
  }

  return (
    <div className="relative space-y-6 p-8">
      {isScreeningActionBusy ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
          <div className="flex flex-col items-center justify-center gap-4">
            <UniversalLoadingState minHeightClassName="min-h-0" />
            <p className="text-sm font-medium text-slate-700">
              {applicationBusyState?.action === "convert"
                ? "Converting application into a tenant profile..."
                : formatStatusProgressLabel(applicationBusyState?.status ?? "submitted")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">
            Listings and Applications
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {listings.length} listing(s), {totalApplicationsCount} application(s).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Listings</p>
          <p className="text-xl font-semibold text-slate-900">{listings.length}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Published</p>
          <p className="text-xl font-semibold text-slate-900">{publishedListingsCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Applications</p>
          <p className="text-xl font-semibold text-slate-900">{totalApplicationsCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
          <p className="text-xl font-semibold text-slate-900">{approvedApplicationsCount}</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <Link
          href="/dashboard/listings?tab=listings"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "listings"
              ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-[#010a19]"
          }`}
        >
          Listings
        </Link>
        <Link
          href="/dashboard/listings?tab=applications"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "applications"
              ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-[#010a19]"
          }`}
        >
          Applications
        </Link>
        <Link
          href="/dashboard/listings?tab=screening"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "screening"
              ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-[#010a19]"
          }`}
        >
          Screening
        </Link>
      </div>

      {activeTab === "listings" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Listing</th>
                <th className="px-5 py-3 text-left">Rent</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Applications</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {listings.map((item) => (
                <tr key={item.unit.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {item.property.city}
                    </p>
                    <p className="font-medium text-[#010a19]">
                      {item.property.propertyType === "multi_unit"
                        ? `${item.property.name} · Unit ${item.unit.unitNumber}`
                        : item.property.name}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {formatCurrency(item.unit.monthlyRentAmount, item.unit.currencyCode)} / month
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.listing?.status === "published"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      }`}
                    >
                      {item.listing?.status ?? "unpublished"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{item.applicationCount}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/listings/${item.unit.id}`}
                        className="text-sm font-medium text-[#0063fe] hover:underline"
                      >
                        {item.listing ? "Edit" : "Set up"}
                      </Link>
                      {item.listing?.status === "published" && (
                        <Link
                          href={`/listing/${item.listing.id}`}
                          className="text-sm text-slate-600 hover:text-slate-900"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "applications" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Applicant</th>
                <th className="px-5 py-3 text-left">Listing</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Income</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {applications.map((item) => (
                <tr key={item.application.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#010a19]">
                      {item.application.fullName}
                    </p>
                    <p className="text-slate-500">{item.application.email}</p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {item.property.name} · Unit {item.unit.unitNumber}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-medium ${getApplicationBadgeClass(
                        item.application.status
                      )}`}
                    >
                      {formatStatusLabel(item.application.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {item.application.monthlyIncome
                      ? formatCurrency(
                          item.application.monthlyIncome,
                          item.unit.currencyCode
                        )
                      : "-"}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {new Date(
                      item.application.createdAtIso
                    ).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "screening" && (
        <div className="space-y-4">
          {applicationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {applicationError}
            </div>
          )}

          {screeningItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm text-slate-500">No applications to screen.</p>
            </div>
          ) : (
            screeningItems.map((item) => (
              <div
                key={item.application.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
                aria-busy={applicationBusyState?.applicationId === item.application.id}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-[#010a19]">
                      {item.application.fullName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.property.name} · Unit {item.unit.unitNumber} ·{" "}
                      {item.property.city}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-medium ${getApplicationBadgeClass(
                      item.application.status
                    )}`}
                  >
                    {formatStatusLabel(item.application.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Email: {item.application.email}</p>
                    <p>Phone: {item.application.phone}</p>
                    <p>
                      Income:{" "}
                      {item.application.monthlyIncome
                        ? formatCurrency(
                            item.application.monthlyIncome,
                            item.unit.currencyCode
                          )
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {SCREENING_STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        updateApplication(item.application.id, status)
                      }
                      disabled={applicationBusyState !== null}
                      className="rounded-full border border-slate-300 px-3 py-2 text-xs disabled:opacity-60"
                    >
                      {applicationBusyState?.applicationId === item.application.id &&
                      applicationBusyState.action === "status" &&
                      applicationBusyState.status === status
                        ? formatStatusProgressLabel(status)
                        : formatStatusActionLabel(status)}
                    </button>
                  ))}

                  {item.application.status === "approved" &&
                    !item.application.convertedTenantId && (
                      <button
                        onClick={() =>
                          convertApplication(item.application.id)
                        }
                        disabled={applicationBusyState !== null}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs text-white disabled:opacity-60"
                      >
                        {applicationBusyState?.applicationId === item.application.id &&
                        applicationBusyState.action === "convert"
                          ? "Converting..."
                          : "Convert to tenant"}
                      </button>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}