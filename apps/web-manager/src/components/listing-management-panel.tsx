"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ConvertListingApplicationOutput,
  ListingApplicationView,
  ManagerListingView
} from "@hhousing/api-contracts";
import { patchWithAuth, postWithAuth } from "../lib/api-client";

type ListingsWorkspaceTab = "listings" | "applications" | "screening";

interface ListingManagementPanelProps {
  organizationId: string;
  currentScopeLabel: string;
  activeTab: ListingsWorkspaceTab;
  listings: ManagerListingView[];
  applications: ListingApplicationView[];
}

const SCREENING_STATUSES = ["submitted", "under_review", "approved", "rejected", "needs_more_info"] as const;

function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function formatCurrency(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function getApplicationBadgeClass(status: string): string {
  if (status === "approved" || status === "converted") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "needs_more_info") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "under_review") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function ListingManagementPanel({
  organizationId,
  currentScopeLabel,
  activeTab,
  listings,
  applications
}: ListingManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [applicationBusyId, setApplicationBusyId] = useState<string | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [screeningNotes, setScreeningNotes] = useState<Record<string, string>>({});
  const [requestedInfoMessage, setRequestedInfoMessage] = useState<Record<string, string>>({});

  const screeningItems = applications.filter((item) => item.application.status !== "converted");

  async function updateApplication(
    applicationId: string,
    status: "submitted" | "under_review" | "approved" | "rejected" | "needs_more_info"
  ): Promise<void> {
    setApplicationBusyId(applicationId);
    setApplicationError(null);

    const result = await patchWithAuth(`/api/applications/${applicationId}`, {
      organizationId,
      status,
      screeningNotes: screeningNotes[applicationId]?.trim() || null,
      requestedInfoMessage: requestedInfoMessage[applicationId]?.trim() || null
    });

    if (!result.success) {
      setApplicationBusyId(null);
      setApplicationError(result.error);
      return;
    }

    setApplicationBusyId(null);
    router.refresh();
  }

  async function convertApplication(applicationId: string): Promise<void> {
    setApplicationBusyId(applicationId);
    setApplicationError(null);

    const result = await postWithAuth<ConvertListingApplicationOutput>(`/api/applications/${applicationId}/convert`, {
      organizationId
    });

    if (!result.success) {
      setApplicationBusyId(null);
      setApplicationError(result.error);
      return;
    }

    setApplicationBusyId(null);
    router.push(
      `/dashboard/leases/move-in?tenantId=${encodeURIComponent(result.data.tenant.id)}&applicationId=${encodeURIComponent(applicationId)}`
    );
    router.refresh();
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#010a19]">Listings and Applications</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            One workspace for publishing vacant units, reviewing public applications, and running manual screening before a lease starts.
          </p>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <Link href="/dashboard/listings?tab=listings" className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "listings" ? "bg-[#0063fe] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          Listings
        </Link>
        <Link href="/dashboard/listings?tab=applications" className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "applications" ? "bg-[#0063fe] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          Applications
        </Link>
        <Link href="/dashboard/listings?tab=screening" className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "screening" ? "bg-[#0063fe] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          Screening
        </Link>
      </div>

      {activeTab === "listings" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {listings.map((item) => {
              return (
                <article key={item.unit.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.property.city}</p>
                      <h2 className="mt-2 text-lg font-semibold text-slate-950">
                        {item.property.propertyType === "multi_unit"
                          ? `${item.property.name} · Unit ${item.unit.unitNumber}`
                          : item.property.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatCurrency(item.unit.monthlyRentAmount, item.unit.currencyCode)} / month
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.listing?.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                      {item.listing?.status ?? "unpublished"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{item.unit.status}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">{item.applicationCount} applications</span>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Link
                      href={`/dashboard/listings/${item.unit.id}`}
                      className="rounded-full bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white"
                    >
                      {item.listing ? "Edit listing" : "Set up listing"}
                    </Link>
                    {item.listing?.status === "published" ? (
                      <Link href={`/listing/${item.listing.id}`} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                        View public page
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    {item.listing
                      ? "Open the dedicated listing page to edit public details, media, visibility, and publish state."
                      : "Open the dedicated listing page to prepare the public version of this vacant unit before publishing."}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeTab === "applications" ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-950">Incoming applications</h2>
            <p className="mt-1 text-sm text-slate-500">Applications are independent intake records linked to published listings.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Applicant</th>
                  <th className="px-5 py-3">Listing source</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Income</th>
                  <th className="px-5 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((item) => (
                  <tr key={item.application.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{item.application.fullName}</p>
                      <p className="text-slate-500">{item.application.email}</p>
                      <p className="text-slate-500">{item.application.phone}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{item.property.name}</p>
                      <p className="text-slate-500">Unit {item.unit.unitNumber}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApplicationBadgeClass(item.application.status)}`}>
                        {formatStatusLabel(item.application.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.application.monthlyIncome !== null
                        ? formatCurrency(item.application.monthlyIncome, item.unit.currencyCode)
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(item.application.createdAtIso).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "screening" ? (
        <div className="space-y-4">
          {applicationError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{applicationError}</p>
          ) : null}
          {screeningItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
              No applications to screen yet.
            </div>
          ) : (
            screeningItems.map((item) => (
              <article key={item.application.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">{item.application.fullName}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApplicationBadgeClass(item.application.status)}`}>
                        {formatStatusLabel(item.application.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.property.name} · Unit {item.unit.unitNumber} · {item.property.city}
                    </p>
                  </div>
                  {item.application.convertedTenantId && item.convertedTenant ? (
                    <Link
                      href={`/dashboard/leases/move-in?tenantId=${encodeURIComponent(item.convertedTenant.id)}&applicationId=${encodeURIComponent(item.application.id)}`}
                      className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                    >
                      Start lease
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-900">Contact:</span> {item.application.email} · {item.application.phone}</p>
                    <p><span className="font-semibold text-slate-900">Employment:</span> {item.application.employmentInfo ?? "-"}</p>
                    <p><span className="font-semibold text-slate-900">Income:</span> {item.application.monthlyIncome !== null ? formatCurrency(item.application.monthlyIncome, item.unit.currencyCode) : "-"}</p>
                    <p><span className="font-semibold text-slate-900">Notes:</span> {item.application.notes ?? "-"}</p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      <span className="mb-1.5 block">Screening notes</span>
                      <textarea
                        value={screeningNotes[item.application.id] ?? item.application.screeningNotes ?? ""}
                        onChange={(event) => setScreeningNotes((current) => ({ ...current, [item.application.id]: event.target.value }))}
                        className="min-h-24 w-full rounded-2xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      <span className="mb-1.5 block">Message when requesting more information</span>
                      <textarea
                        value={requestedInfoMessage[item.application.id] ?? item.application.requestedInfoMessage ?? ""}
                        onChange={(event) => setRequestedInfoMessage((current) => ({ ...current, [item.application.id]: event.target.value }))}
                        className="min-h-24 w-full rounded-2xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {SCREENING_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateApplication(item.application.id, status)}
                      disabled={applicationBusyId === item.application.id}
                      className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      {status === "under_review" ? "Mark under review" : status === "needs_more_info" ? "Request info" : status === "approved" ? "Approve" : status === "rejected" ? "Reject" : "Reset to submitted"}
                    </button>
                  ))}
                  {item.application.status === "approved" && !item.application.convertedTenantId ? (
                    <button
                      type="button"
                      onClick={() => convertApplication(item.application.id)}
                      disabled={applicationBusyId === item.application.id}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Convert to tenant
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}