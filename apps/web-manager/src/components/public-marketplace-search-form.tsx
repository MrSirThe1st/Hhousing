"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarketplaceSearchParams } from "../app/public-site-data";

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

  const [q, setQ] = useState(values?.q ?? "");
  const [city, setCity] = useState(values?.city ?? "");
  const [propertyType, setPropertyType] = useState(values?.propertyType ?? "");
  const [minRent, setMinRent] = useState(values?.minRent ?? "");
  const [maxRent, setMaxRent] = useState(values?.maxRent ?? "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Additional Filters States
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Sync state if initial values change
  useEffect(() => {
    setQ(values?.q ?? "");
    setCity(values?.city ?? "");
    setPropertyType(values?.propertyType ?? "");
    setMinRent(values?.minRent ?? "");
    setMaxRent(values?.maxRent ?? "");
  }, [values]);

  function toggleAmenity(id: string) {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  let activeFilterCount = 0;
  if (propertyType) activeFilterCount++;
  if (minRent) activeFilterCount++;
  if (maxRent) activeFilterCount++;
  if (city) activeFilterCount++;
  if (bedrooms) activeFilterCount++;
  if (bathrooms) activeFilterCount++;
  if (minSize) activeFilterCount++;
  if (maxSize) activeFilterCount++;
  activeFilterCount += selectedAmenities.length;
  
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city.trim()) params.set("city", city.trim());
    if (propertyType) params.set("propertyType", propertyType);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (bathrooms) params.set("bathrooms", bathrooms);
    if (minSize) params.set("minSize", minSize);
    if (maxSize) params.set("maxSize", maxSize);
    selectedAmenities.forEach(id => {
      params.set(id, "on");
    });
    router.push(`${action}?${params.toString()}`);
  }

  if (actualVariant === "hero") {
    return (
      <div className="w-full max-w-4xl mx-auto px-4">
        <form onSubmit={handleFormSubmit} className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-left">
          {/* Hidden inputs for additional filters so they are submitted even when modal is closed */}
          <input type="hidden" name="bedrooms" value={bedrooms} />
          <input type="hidden" name="bathrooms" value={bathrooms} />
          <input type="hidden" name="minSize" value={minSize} />
          <input type="hidden" name="maxSize" value={maxSize} />
          {selectedAmenities.map(id => (
            <input key={id} type="hidden" name={id} value="on" />
          ))}

          {/* Desktop Search Input Row (Hidden on Mobile) */}
          <div className="hidden md:flex md:items-center p-3 gap-3">
            {/* Search Input (q) */}
            <div className="flex-1 flex items-center min-w-0">
              <div className="pl-3 pr-2 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find properties (ex: Gombe, Kinshasa...)"
                className="w-full bg-transparent border-0 py-3 px-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 text-base"
              />
            </div>

            {/* Loyer Min Dropdown */}
            <div className="w-36 flex-shrink-0">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Loyer Min</label>
              <select
                value={minRent}
                onChange={(e) => setMinRent(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="">Indifférent</option>
                <option value="0">0 $</option>
                <option value="100">100 $</option>
                <option value="200">200 $</option>
                <option value="500">500 $</option>
                <option value="1000">1000 $</option>
                <option value="1500">1500 $</option>
              </select>
            </div>

            {/* Loyer Max Dropdown */}
            <div className="w-36 flex-shrink-0">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Loyer Max</label>
              <select
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="">Indifférent</option>
                <option value="500">500 $</option>
                <option value="1000">1000 $</option>
                <option value="1500">1500 $</option>
                <option value="2000">2000 $</option>
                <option value="2500">2500 $</option>
                <option value="5000">5000 $</option>
                <option value="10000">10000 $</option>
              </select>
            </div>

            {/* Filter Trigger Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`border rounded-xl px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer h-[46px] min-w-[110px] self-end ${
                isModalOpen || activeFilterCount > 0
                  ? "bg-blue-50 border-blue-200 text-[#0063FE]"
                  : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100"
              }`}
            >
              {activeFilterCount > 0 && (
                <span className="bg-[#0063FE] text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <span>Filtres</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              className="bg-[#0063FE] hover:bg-[#0052d4] text-white font-bold text-base px-6 py-3 rounded-2xl transition duration-150 cursor-pointer h-[46px] flex items-center justify-center min-w-[100px] self-end"
            >
              {submitLabel}
            </button>
          </div>

          {/* Mobile Search Input Row (Hidden on Desktop) */}
          <div className="flex flex-col md:hidden p-3 gap-2">
            {/* Search Input (q) */}
            <div className="flex items-center min-w-0">
              <div className="pl-3 pr-2 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find properties (ex: Gombe, Kinshasa...)"
                className="w-full bg-transparent border-0 py-3 px-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 text-base"
              />
            </div>

            <div className="flex items-center gap-2 px-2 pb-2">
              {/* Filter Trigger Button (Opens Pop out modal) */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={`border rounded-xl px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer h-[46px] min-w-[110px] ${
                  isModalOpen || activeFilterCount > 0
                    ? "bg-blue-50 border-blue-200 text-[#0063FE]"
                    : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100"
                }`}
              >
                {activeFilterCount > 0 && (
                  <span className="bg-[#0063FE] text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
                <span>Filtres</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                className="bg-[#0063FE] hover:bg-[#0052d4] text-white font-bold text-base px-6 py-3 rounded-2xl transition duration-150 cursor-pointer flex-1 text-center h-[46px] flex items-center justify-center min-w-[100px]"
              >
                {submitLabel}
              </button>
            </div>
          </div>

          {/* Pop out Modal for advanced filters */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150 text-left">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Filtres de recherche</h3>
                    <p className="text-xs text-slate-500 mt-1">Personnalisez vos critères pour trouver le logement idéal</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-150 hover:text-slate-600 transition cursor-pointer"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                  {/* City & Property Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ville de recherche</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: Kinshasa"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type de bien</label>
                      <select
                        name="propertyType"
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="">Tous les types</option>
                        <option value="single_unit">Unité simple</option>
                        <option value="multi_unit">Immeuble multi-unités</option>
                      </select>
                    </div>
                  </div>

                  {/* Rent Range (Loyer Min / Max) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loyer Min ($)</label>
                      <input
                        type="number"
                        value={minRent}
                        onChange={(e) => setMinRent(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loyer Max ($)</label>
                      <input
                        type="number"
                        value={maxRent}
                        onChange={(e) => setMaxRent(e.target.value)}
                        placeholder="2500"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none bg-white text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Bedrooms */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Chambres (Bedrooms)</label>
                      <select
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white text-slate-850"
                      >
                        <option value="">Indifférent</option>
                        <option value="studio">Studio</option>
                        <option value="1">1 chambre</option>
                        <option value="2">2 chambres</option>
                        <option value="3">3+ chambres</option>
                      </select>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salles de bain (Bathrooms)</label>
                      <select
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white text-slate-855"
                      >
                        <option value="">Indifférent</option>
                        <option value="1">1 salle de bain</option>
                        <option value="2">2 salles de bain</option>
                        <option value="3">3+ salles de bain</option>
                      </select>
                    </div>
                  </div>

                  {/* Size range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Superficie min (m²)</label>
                      <input
                        type="number"
                        value={minSize}
                        onChange={(e) => setMinSize(e.target.value)}
                        placeholder="Ex: 20"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Superficie max (m²)</label>
                      <input
                        type="number"
                        value={maxSize}
                        onChange={(e) => setMaxSize(e.target.value)}
                        placeholder="Ex: 500"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Categories & Amenities checkbox selection */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2.5">Équipements & Critères</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: "wifi", label: "Wi-Fi" },
                        { id: "parking", label: "Parking" },
                        { id: "pool", label: "Piscine" },
                        { id: "ac", label: "Climatisation" },
                        { id: "security", label: "Sécurité 24/7" },
                        { id: "garden", label: "Jardin" },
                        { id: "balcony", label: "Balcon" },
                        { id: "furnished", label: "Meublé" }
                      ].map((item) => {
                        const isChecked = selectedAmenities.includes(item.id);
                        return (
                          <label key={item.id} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAmenity(item.id)}
                              className="rounded border-slate-300 text-[#0063FE] focus:ring-[#0063FE]"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setCity("");
                      setPropertyType("");
                      setMinRent("");
                      setMaxRent("");
                      setBedrooms("");
                      setBathrooms("");
                      setMinSize("");
                      setMaxSize("");
                      setSelectedAmenities([]);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl bg-[#0063FE] hover:bg-[#0052d4] px-5 py-2 text-sm font-semibold text-white transition cursor-pointer"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    );
  }

  // Original compact view
  return (
    <form action={action} method="get" className={`border border-slate-200 bg-white shadow-sm ${compact ? "rounded-3xl px-4 py-4" : "rounded-4xl px-5 py-5"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="block min-w-0 flex-1 text-sm font-medium text-slate-700">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Recherche</span>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <img src="/brand/haraka-pay-logo.svg" alt="" className="h-5 w-5 opacity-55" />
            </div>
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4"
              placeholder="Ville, immeuble ou unité"
            />
          </div>
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-44">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Ville</span>
          <input
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Kinshasa"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-44">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Type</span>
          <select
            name="propertyType"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-white"
          >
            <option value="">Tous</option>
            <option value="single_unit">Unité simple</option>
            <option value="multi_unit">Immeuble multi-unités</option>
          </select>
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-36">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Loyer min</span>
          <input
            name="minRent"
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
            name="maxRent"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="2500"
          />
        </label>
        <div className="flex gap-3 lg:pb-0.5">
          <button type="submit" className="rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white cursor-pointer">
            {submitLabel}
          </button>
          {resetHref ? (
            <Link href={resetHref} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
              Réinitialiser
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}