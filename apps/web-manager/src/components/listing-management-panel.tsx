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

      {/* HEADER (unchanged) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#010a19]">
            Listings and Applications
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            One workspace for publishing vacant units, reviewing applications, and screening tenants.
          </p>
        </div>
      </div>

      {/* TABS (unchanged) */}
      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
        <Link
          href="/dashboard/listings?tab=listings"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === "listings"
              ? "bg-[#0063fe] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Listings
        </Link>
        <Link
          href="/dashboard/listings?tab=applications"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === "applications"
              ? "bg-[#0063fe] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Applications
        </Link>
        <Link
          href="/dashboard/listings?tab=screening"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === "screening"
              ? "bg-[#0063fe] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Screening
        </Link>
      </div>

      {/* LISTINGS */}
      {activeTab === "listings" && (
        <div className="border border-slate-200 rounded-xl bg-white divide-y divide-slate-200">
          {listings.map((item) => (
            <div
              key={item.unit.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {item.property.city}
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {item.property.propertyType === "multi_unit"
                    ? `${item.property.name} · Unit ${item.unit.unitNumber}`
                    : item.property.name}
                </p>
                <p className="text-sm text-slate-600">
                  {formatCurrency(
                    item.unit.monthlyRentAmount,
                    item.unit.currencyCode
                  )}{" "}
                  / month
                </p>
              </div>

              <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
                <span>{item.unit.status}</span>
                <span>{item.applicationCount} apps</span>
                <span
                  className={
                    item.listing?.status === "published"
                      ? "text-emerald-600 font-medium"
                      : "text-slate-500"
                  }
                >
                  {item.listing?.status ?? "unpublished"}
                </span>
              </div>

              <div className="flex items-center gap-4">
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
            </div>
          ))}
        </div>
      )}

      {/* APPLICATIONS */}
      {activeTab === "applications" && (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Applicant</th>
                <th className="px-5 py-3 text-left">Listing</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Income</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {applications.map((item) => (
                <tr key={item.application.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">
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

      {/* SCREENING */}
      {activeTab === "screening" && (
        <div className="space-y-3">
          {applicationError && (
            <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
              {applicationError}
            </div>
          )}

          {screeningItems.length === 0 ? (
            <div className="border border-slate-200 rounded-xl bg-white p-6 text-sm text-slate-500">
              No applications to screen.
            </div>
          ) : (
            screeningItems.map((item) => (
              <div
                key={item.application.id}
                className="border border-slate-200 rounded-xl bg-white p-5"
                aria-busy={applicationBusyState?.applicationId === item.application.id}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
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

                <div className="mt-4 grid lg:grid-cols-2 gap-4">
                  <div className="text-sm text-slate-600 space-y-1">
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
                      className="text-xs border border-slate-300 px-3 py-2 rounded-full disabled:opacity-60"
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
                        className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-full disabled:opacity-60"
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