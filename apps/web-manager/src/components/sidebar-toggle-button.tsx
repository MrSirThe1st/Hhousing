"use client";

import { useEffect, useState } from "react";
import { SIDEBAR_SET_COLLAPSED_EVENT, SIDEBAR_STORAGE_KEY } from "./sidebar-collapse";

export default function SidebarToggleButton(): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const storedState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setIsCollapsed(storedState === "1");
  }, []);

  function handleToggle(): void {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, nextCollapsed ? "1" : "0");
    window.dispatchEvent(
      new CustomEvent(SIDEBAR_SET_COLLAPSED_EVENT, {
        detail: { isCollapsed: nextCollapsed }
      })
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-[#010a19] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} aria-hidden="true">
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
