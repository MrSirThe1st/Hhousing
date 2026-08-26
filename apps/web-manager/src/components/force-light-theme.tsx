"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY } from "../contexts/theme-context";

function preferredThemeIsDark(): boolean {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/**
 * Landing page must stay light regardless of system/user theme preference.
 * Removes `html.dark` while mounted and restores the preferred theme on leave.
 */
export default function ForceLightTheme(): null {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");

    return () => {
      root.classList.toggle("dark", preferredThemeIsDark());
    };
  }, []);

  return null;
}
