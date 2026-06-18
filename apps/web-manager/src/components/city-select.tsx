"use client";

import React, { useState, useRef, useEffect } from "react";

export const DRC_CITIES = [
  "Bandundu",
  "Baraka",
  "Beni",
  "Boma",
  "Bukavu",
  "Bulungu",
  "Bunia",
  "Butembo",
  "Gbadolite",
  "Gemena",
  "Goma",
  "Isiro",
  "Kabinda",
  "Kalemie",
  "Kamina",
  "Kananga",
  "Kenge",
  "Kikwit",
  "Kindu",
  "Kinshasa",
  "Kisangani",
  "Kolwezi",
  "Kongolo",
  "Likasi",
  "Lisala",
  "Lubumbashi",
  "Matadi",
  "Mbandaka",
  "Mbanza-Ngungu",
  "Mbuji-Mayi",
  "Mwene-Ditu",
  "Tshikapa",
  "Uvira",
  "Zongo"
];

interface CitySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export default function CitySelect({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Sélectionner une ville",
  className = ""
}: CitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filteredCities = DRC_CITIES.filter((city) =>
    city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-[#010a19] shadow-sm outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Hidden input for HTML5 form validation */}
      <input
        type="text"
        tabIndex={-1}
        value={value}
        onChange={() => {}}
        required={required}
        disabled={disabled}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0 w-full opacity-0"
      />

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Input */}
          <div className="relative mb-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une ville..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#0063fe]"
            />
          </div>

          {/* Cities List */}
          <ul className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => {
                const isSelected = value === city;
                return (
                  <li key={city}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(city);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-[#0063fe] text-white font-medium"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{city}</span>
                      {isSelected && (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-3 text-center text-xs text-slate-400">
                Aucune ville trouvée
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
