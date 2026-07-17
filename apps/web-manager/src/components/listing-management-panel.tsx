"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ConvertListingApplicationOutput,
  ListingApplicationView,
  ManagerListingView
} from "@hhousing/api-contracts";
import { patchWithAuth, postWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";
import ResponsiveTable, { type Column } from "./responsive-table";

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

  const listingColumns = useMemo<Column<ManagerListingView>[]>(() => [
    {
      header: "Listing",
      render: (item) => (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {item.property.city}
          </p>
          <p className="font-medium text-[#010a19]">
            {item.property.propertyType === "multi_unit"
              ? `${item.property.name} · Unit ${item.unit.unitNumber}`
              : item.property.name}
          </p>
        </div>
      )
    },
    {
      header: "Rent",
      render: (item) => (
        <span className="text-slate-600">
          {formatCurrency(item.unit.monthlyRentAmount, item.unit.currencyCode)} / month
        </span>
      )
    },
    {
      header: "Status",
      render: (item) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            item.listing?.status === "published"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {item.listing?.status ?? "unpublished"}
        </span>
      )
    },
    {
      header: "Applications",
      render: (item) => <span className="text-slate-600">{item.applicationCount}</span>
    },
    {
      header: "Actions",
      render: (item) => (
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
      )
    }
  ], []);

  const renderListingMobileCard = (item: ManagerListingView) => (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            {item.property.city}
          </p>
          <p className="font-semibold text-slate-900 mt-0.5">
            {item.property.propertyType === "multi_unit"
              ? `${item.property.name} · Unit ${item.unit.unitNumber}`
              : item.property.name}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            item.listing?.status === "published"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {item.listing?.status ?? "unpublished"}
        </span>
      </div>
      
      <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
        <div>
          <span className="text-slate-400">Loyer:</span> {formatCurrency(item.unit.monthlyRentAmount, item.unit.currencyCode)}/m
        </div>
        <div>
          <span className="text-slate-400">Candidatures:</span> <span className="font-medium text-slate-900">{item.applicationCount}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <Link
          href={`/dashboard/listings/${item.unit.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px]"
        >
          {item.listing ? "Modifier" : "Configurer"}
        </Link>
        {item.listing?.status === "published" && (
          <Link
            href={`/listing/${item.listing.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-[#0063fe] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0052d4] min-h-[36px]"
          >
            Voir public
          </Link>
        )}
      </div>
    </div>
  );

  const applicationColumns = useMemo<Column<ListingApplicationView>[]>(() => [
    {
      header: "Applicant",
      render: (item) => (
        <div>
          <p className="font-medium text-[#010a19]">
            {item.application.fullName}
          </p>
          <p className="text-slate-500">{item.application.email}</p>
        </div>
      )
    },
    {
      header: "Listing",
      render: (item) => (
        <span className="text-slate-600">
          {item.property.name} · Unit {item.unit.unitNumber}
        </span>
      )
    },
    {
      header: "Status",
      render: (item) => (
        <span
          className={`text-xs font-medium ${getApplicationBadgeClass(
            item.application.status
          )}`}
        >
          {formatStatusLabel(item.application.status)}
        </span>
      )
    },
    {
      header: "Income",
      render: (item) => (
        <span className="text-slate-600">
          {item.application.monthlyIncome
            ? formatCurrency(
                item.application.monthlyIncome,
                item.unit.currencyCode
              )
            : "-"}
        </span>
      )
    },
    {
      header: "Date",
      render: (item) => (
        <span className="text-slate-500">
          {new Date(item.application.createdAtIso).toLocaleDateString("fr-FR")}
        </span>
      )
    }
  ], []);

  const renderApplicationMobileCard = (item: ListingApplicationView) => (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-slate-900">
            {item.application.fullName}
          </p>
          <p className="text-xs text-slate-500">{item.application.email}</p>
        </div>
        <span
          className={`text-xs font-semibold ${getApplicationBadgeClass(
            item.application.status
          )}`}
        >
          {formatStatusLabel(item.application.status)}
        </span>
      </div>

      <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
        <p>
          <span className="text-slate-400">Logement:</span> {item.property.name} · Unit {item.unit.unitNumber}
        </p>
        <p>
          <span className="text-slate-400">Revenu:</span>{" "}
          {item.application.monthlyIncome
            ? formatCurrency(item.application.monthlyIncome, item.unit.currencyCode)
            : "-"}
        </p>
        <p>
          <span className="text-slate-400">Soumis le:</span>{" "}
          {new Date(item.application.createdAtIso).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  );

  const [applicationBusyState, setApplicationBusyState] = useState<ApplicationBusyState | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [listingSearchTerm, setListingSearchTerm] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState<"all" | "published" | "draft" | "not_configured">("all");
  const [listingCityFilter, setListingCityFilter] = useState<string>("all");
  const [listingPropertyFilter, setListingPropertyFilter] = useState<string>("all");
  const [isRoutePending, startRouteTransition] = useTransition();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("toast") === "sibling_updated") {
        setSuccessMessage("Success: Sibling units updated and published successfully.");
        const cleanUrl = window.location.pathname + (window.location.search.replace(/[?&]toast=[^&]+/, "").replace(/^&/, "?"));
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  const screeningItems = applications.filter((a) => a.application.status !== "converted");
  const isScreeningActionBusy =
    activeTab === "screening" &&
    applicationBusyState !== null &&
    (applicationBusyState.action === "convert" || isRoutePending);

  const publishedListingsCount = listings.filter((item) => item.listing?.status === "published").length;
  const totalApplicationsCount = applications.length;
  const approvedApplicationsCount = applications.filter((app) => app.application.status === "approved").length;
  const listingCityOptions = useMemo(
    () => [...new Set(listings.map((item) => item.property.city))].sort((left, right) => left.localeCompare(right, "fr")),
    [listings]
  );
  const listingPropertyOptions = useMemo(
    () => [...new Map(listings.map((item) => [item.property.id, { id: item.property.id, name: item.property.name }])).values()]
      .sort((left, right) => left.name.localeCompare(right.name, "fr")),
    [listings]
  );
  const filteredListings = useMemo(() => {
    const normalizedSearchTerm = listingSearchTerm.trim().toLowerCase();

    return listings.filter((item) => {
      const listingLabel = item.property.propertyType === "multi_unit"
        ? `${item.property.name} ${item.unit.unitNumber}`
        : item.property.name;
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        listingLabel.toLowerCase().includes(normalizedSearchTerm) ||
        item.property.city.toLowerCase().includes(normalizedSearchTerm);
      const matchesStatus =
        listingStatusFilter === "all" ||
        (listingStatusFilter === "published" && item.listing?.status === "published") ||
        (listingStatusFilter === "draft" && item.listing?.status === "draft") ||
        (listingStatusFilter === "not_configured" && item.listing === null);
      const matchesCity = listingCityFilter === "all" || item.property.city === listingCityFilter;
      const matchesProperty = listingPropertyFilter === "all" || item.property.id === listingPropertyFilter;

      return matchesSearch && matchesStatus && matchesCity && matchesProperty;
    });
  }, [listingCityFilter, listingPropertyFilter, listingSearchTerm, listingStatusFilter, listings]);

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
      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

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
            Annonces et candidatures
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {listings.length} annonce(s), {totalApplicationsCount} candidature(s).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Annonces</p>
          <p className="text-xl font-semibold text-slate-900">{listings.length}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Publiées</p>
          <p className="text-xl font-semibold text-slate-900">{publishedListingsCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Candidatures</p>
          <p className="text-xl font-semibold text-slate-900">{totalApplicationsCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Approuvées</p>
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
          Annonces
        </Link>
        <Link
          href="/dashboard/listings?tab=applications"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "applications"
              ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-[#010a19]"
          }`}
        >
          Candidatures
        </Link>
        <Link
          href="/dashboard/listings?tab=screening"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "screening"
              ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-[#010a19]"
          }`}
        >
          Vérification
        </Link>
      </div>

      {activeTab === "listings" && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px] xl:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#010a19]">Search listing</label>
              <input
                value={listingSearchTerm}
                onChange={(event) => setListingSearchTerm(event.target.value)}
                placeholder="Property, unit or city"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#010a19]">Status</label>
              <select
                value={listingStatusFilter}
                onChange={(event) => setListingStatusFilter(event.target.value as "all" | "published" | "draft" | "not_configured")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              >
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="not_configured">Not configured</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#010a19]">City</label>
              <select
                value={listingCityFilter}
                onChange={(event) => setListingCityFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              >
                <option value="all">All cities</option>
                {listingCityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#010a19]">Property</label>
              <select
                value={listingPropertyFilter}
                onChange={(event) => setListingPropertyFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              >
                <option value="all">All properties</option>
                {listingPropertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ResponsiveTable
            columns={listingColumns}
            data={filteredListings}
            renderMobileCard={renderListingMobileCard}
            keyExtractor={(item) => item.unit.id}
            emptyState={
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No listings match the selected filters.
              </div>
            }
          />
        </div>
      )}

      {activeTab === "applications" && (
        <ResponsiveTable
          columns={applicationColumns}
          data={applications}
          renderMobileCard={renderApplicationMobileCard}
          keyExtractor={(item) => item.application.id}
          emptyState={
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No applications available.
            </div>
          }
        />
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