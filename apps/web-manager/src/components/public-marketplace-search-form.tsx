"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarketplaceSearchParams } from "../app/public-site-data";
import { firstSearchParam, parseStringListParam } from "../app/public-site-data";
import { AMENITY_OPTIONS, FEATURE_OPTIONS } from "./property-form-options";

interface PublicMarketplaceSearchFormProps {
  action: string;
  values?: PublicMarketplaceSearchParams;
  submitLabel: string;
  resetHref?: string;
  compact?: boolean;
  variant?: "compact" | "hero";
}

export default function PublicMarketplaceSearchForm({
  action,
  values,
  submitLabel,
  resetHref,
  compact = false,
  variant = "compact"
}: PublicMarketplaceSearchFormProps): React.ReactElement {
  const router = useRouter();
  const actualVariant = compact ? "compact" : variant;

  const [q, setQ] = useState(firstSearchParam(values?.q) ?? "");
  const [city, setCity] = useState(firstSearchParam(values?.city) ?? "");
  const [propertyType, setPropertyType] = useState(firstSearchParam(values?.propertyType) ?? "");
  const [minRent, setMinRent] = useState(firstSearchParam(values?.minRent) ?? "");
  const [maxRent, setMaxRent] = useState(firstSearchParam(values?.maxRent) ?? "");
  const [minBedrooms, setMinBedrooms] = useState(firstSearchParam(values?.minBedrooms) ?? "");
  const [minBathrooms, setMinBathrooms] = useState(firstSearchParam(values?.minBathrooms) ?? "");
  const [amenities, setAmenities] = useState<string[]>(() => parseStringListParam(values?.amenities));
  const [features, setFeatures] = useState<string[]>(() => parseStringListParam(values?.features));
  const [sort, setSort] = useState(firstSearchParam(values?.sort) ?? "newest");

  useEffect(() => {
    setQ(firstSearchParam(values?.q) ?? "");
    setCity(firstSearchParam(values?.city) ?? "");
    setPropertyType(firstSearchParam(values?.propertyType) ?? "");
    setMinRent(firstSearchParam(values?.minRent) ?? "");
    setMaxRent(firstSearchParam(values?.maxRent) ?? "");
    setMinBedrooms(firstSearchParam(values?.minBedrooms) ?? "");
    setMinBathrooms(firstSearchParam(values?.minBathrooms) ?? "");
    setAmenities(parseStringListParam(values?.amenities));
    setFeatures(parseStringListParam(values?.features));
    setSort(firstSearchParam(values?.sort) ?? "newest");
  }, [values]);

  function toggleListValue(list: string[], value: string, setter: (next: string[]) => void): void {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
      return;
    }
    setter([...list, value]);
  }

  function buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city.trim()) params.set("city", city.trim());
    if (propertyType) params.set("propertyType", propertyType);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (minBedrooms) params.set("minBedrooms", minBedrooms);
    if (minBathrooms) params.set("minBathrooms", minBathrooms);
    for (const amenity of amenities) {
      params.append("amenities", amenity);
    }
    for (const feature of features) {
      params.append("features", feature);
    }
    if (sort && sort !== "newest") params.set("sort", sort);
    return params;
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const params = buildParams();
    const query = params.toString();
    router.push(query ? `${action}?${query}` : action);
  }

  if (actualVariant === "hero") {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <form
          onSubmit={handleFormSubmit}
          className="rounded-[1.75rem] bg-slate-200/50 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] dark:bg-slate-800/60"
        >
          <div className="flex flex-col gap-2 rounded-[1.35rem] border border-slate-200/80 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-[#0d1526] md:flex-row md:items-center md:gap-0 md:p-1.5 md:pl-2">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 md:rounded-none md:border-r md:border-slate-200 md:py-1.5 dark:md:border-slate-700">
              <span className="shrink-0 text-slate-400" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <span className="sr-only">Ville</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville (ex. Lubumbashi)"
                className="w-full min-w-0 border-0 bg-transparent p-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </label>

            <label className="relative flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 md:w-[11.5rem] md:rounded-none md:border-r md:border-slate-200 md:py-1.5 dark:md:border-slate-700 lg:w-[13rem]">
              <span className="shrink-0 text-slate-400" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              <span className="sr-only">Type de bien</span>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full min-w-0 cursor-pointer appearance-none border-0 bg-transparent p-0 pr-5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-100"
              >
                <option value="">Type de bien</option>
                <option value="single_unit">Maison / unité</option>
                <option value="multi_unit">Immeuble</option>
              </select>
              <span className="pointer-events-none absolute right-3 text-slate-400" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </label>

            <label className="relative flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 md:w-[9rem] md:rounded-none md:border-r md:border-slate-200 md:py-1.5 dark:md:border-slate-700 lg:w-[10rem]">
              <span className="sr-only">Chambres</span>
              <select
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
                className="w-full min-w-0 cursor-pointer appearance-none border-0 bg-transparent p-0 pr-5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-100"
              >
                <option value="">Chambres</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
              <span className="pointer-events-none absolute right-3 text-slate-400" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </label>

            <label className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 md:w-[11.5rem] md:rounded-none md:py-1.5 lg:w-[13rem]">
              <span className="shrink-0 text-slate-400" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span className="sr-only">Budget maximum</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={50}
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                placeholder="Budget max"
                className="w-full min-w-0 border-0 bg-transparent p-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </label>

            <div className="shrink-0 md:pl-1.5">
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0063FE] px-5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-[#0052d4] md:w-auto"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className={`border border-slate-200 bg-white shadow-sm ${compact ? "rounded-3xl px-4 py-4" : "rounded-4xl px-5 py-5"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:flex-wrap">
        <label className="block min-w-0 flex-1 text-sm font-medium text-slate-700">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Recherche</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Nom, adresse ou description"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-44">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Ville</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Lubumbashi"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-44">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Type</span>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">Tous</option>
            <option value="single_unit">Unité simple</option>
            <option value="multi_unit">Immeuble multi-unités</option>
          </select>
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-36">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Chambres</span>
          <select
            value={minBedrooms}
            onChange={(e) => setMinBedrooms(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">Tous</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-36">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Salles de bain</span>
          <select
            value={minBathrooms}
            onChange={(e) => setMinBathrooms(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">Tous</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-36">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Loyer min</span>
          <input
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="0"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-36">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Loyer max</span>
          <input
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="800000"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-44">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Tri</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="newest">Plus récent</option>
            <option value="price_asc">Prix : croissant</option>
            <option value="price_desc">Prix : décroissant</option>
          </select>
        </label>
        <div className="flex gap-3 lg:pb-0.5">
          <button type="submit" className="cursor-pointer rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white">
            {submitLabel}
          </button>
          {resetHref ? (
            <Link href={resetHref} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
              Réinitialiser
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Équipements</legend>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((amenity) => {
              const checked = amenities.includes(amenity);
              return (
                <label
                  key={amenity}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    checked ? "border-[#0063fe] bg-blue-50 text-[#0063fe]" : "border-slate-200 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleListValue(amenities, amenity, setAmenities)}
                  />
                  {amenity}
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Caractéristiques</legend>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((feature) => {
              const checked = features.includes(feature);
              return (
                <label
                  key={feature}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    checked ? "border-[#0063fe] bg-blue-50 text-[#0063fe]" : "border-slate-200 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleListValue(features, feature, setFeatures)}
                  />
                  {feature}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </form>
  );
}
