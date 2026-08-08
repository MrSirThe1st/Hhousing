"use client";

import { useRouter } from "next/navigation";
import {
  buildMarketplaceHref,
  type PublicMarketplaceSearchParams
} from "../app/public-site-data";

type PageItem = number | "ellipsis";

interface PublicMarketplacePaginationProps {
  currentPage: number;
  totalPages: number;
  params?: PublicMarketplaceSearchParams;
}

export function getVisiblePageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 4) {
    for (let page = 2; page <= 5; page += 1) {
      pages.add(page);
    }
  }
  if (currentPage >= totalPages - 3) {
    for (let page = totalPages - 4; page < totalPages; page += 1) {
      if (page > 1) pages.add(page);
    }
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: PageItem[] = [];
  for (const page of sorted) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }
  return items;
}

export default function PublicMarketplacePagination({
  currentPage,
  totalPages,
  params
}: PublicMarketplacePaginationProps): React.ReactElement | null {
  const router = useRouter();

  if (totalPages <= 1) {
    return null;
  }

  const pageItems = getVisiblePageItems(currentPage, totalPages);
  const previousDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  function goToPage(page: number): void {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    router.push(buildMarketplaceHref(params, page), { scroll: true });
  }

  const controlClassName =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white";
  const pageClassName =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
  const pageActiveClassName =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#0063FE] px-2 text-sm font-semibold text-white";

  return (
    <nav
      className="mt-10 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4"
      aria-label="Pagination"
    >
      <button
        type="button"
        disabled={previousDisabled}
        onClick={() => goToPage(currentPage - 1)}
        className={controlClassName}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Précédent
      </button>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {pageItems.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-9 w-9 items-center justify-center text-sm font-medium text-slate-400"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isActive = item === currentPage;
          return (
            <button
              key={item}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={`Page ${item}`}
              onClick={() => goToPage(item)}
              className={isActive ? pageActiveClassName : pageClassName}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={nextDisabled}
        onClick={() => goToPage(currentPage + 1)}
        className={controlClassName}
      >
        Suivant
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
