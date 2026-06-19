"use client";

import React, { useState, useMemo } from "react";
import { useIsMobile } from "../hooks/use-is-mobile";

export interface Column<T> {
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  renderMobileCard: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  rowClassName?: string | ((item: T) => string);
  paginate?: boolean;
  defaultPageSize?: number;
  mode?: "auto" | "table" | "cards";
}

export default function ResponsiveTable<T>({
  columns,
  data,
  renderMobileCard,
  keyExtractor,
  onRowClick,
  emptyState = (
    <div className="px-4 py-8 text-center text-sm text-slate-400">
      Aucune donnée disponible.
    </div>
  ),
  rowClassName = "",
  paginate = true,
  defaultPageSize = 10,
  mode = "auto",
}: ResponsiveTableProps<T>): React.ReactElement {
  const { isMobile, isMounted } = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);

  const isMobileView = mode === "cards" || (mode === "auto" && isMobile);

  const totalPages = useMemo(() => {
    if (!paginate) return 1;
    return Math.max(1, Math.ceil(data.length / defaultPageSize));
  }, [data.length, paginate, defaultPageSize]);

  // Reset page when data changes
  useMemo(() => {
    setCurrentPage(1);
  }, [data.length]);

  const paginatedData = useMemo(() => {
    if (!paginate) return data;
    const startIndex = (currentPage - 1) * defaultPageSize;
    return data.slice(startIndex, startIndex + defaultPageSize);
  }, [data, paginate, currentPage, defaultPageSize]);

  if (!isMounted) {
    // Render desktop placeholder to avoid layout shifts/hydration mismatch
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse">
        <div className="bg-slate-50 px-4 py-4 flex gap-8 border-b border-slate-200">
          {columns.map((col, idx) => (
            <div key={idx} className="h-4 bg-slate-200 rounded w-20" />
          ))}
        </div>
        <div className="p-4 space-y-4">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {emptyState}
      </div>
    );
  }

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const paginationControls = paginate && totalPages > 1 ? (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="relative inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] transition-colors"
        >
          Précédent
        </button>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] transition-colors"
        >
          Suivant
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-700">
            Affichage de{" "}
            <span className="font-medium">
              {(currentPage - 1) * defaultPageSize + 1}
            </span>{" "}
            à{" "}
            <span className="font-medium">
              {Math.min(currentPage * defaultPageSize, data.length)}
            </span>{" "}
            sur <span className="font-medium">{data.length}</span> résultats
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-xs"
            aria-label="Pagination"
          >
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px] transition-colors"
            >
              <span className="sr-only">Précédent</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px] transition-colors"
            >
              <span className="sr-only">Suivant</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  ) : null;

  if (isMobileView) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {paginatedData.map((item) => (
            <div
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition duration-150 active:scale-[0.99] active:bg-slate-50 ${
                onRowClick ? "cursor-pointer" : ""
              } ${typeof rowClassName === "function" ? rowClassName(item) : rowClassName}`}
            >
              {renderMobileCard(item)}
            </div>
          ))}
        </div>
        {paginationControls}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-5 py-3 text-left ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`hover:bg-slate-50/80 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                } ${typeof rowClassName === "function" ? rowClassName(item) : rowClassName}`}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className="px-5 py-4 align-middle">
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginationControls}
    </div>
  );
}
