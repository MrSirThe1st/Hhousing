import { useMemo } from "react";
import { usePreferences } from "@/contexts/preferences-context";
import { getThemeColors, type ThemeColors } from "@/theme/colors";

export type AppTheme = {
  colors: ThemeColors;
  isDark: boolean;
  mode: "light" | "dark";
};

export function useTheme(): AppTheme {
  const { themeMode } = usePreferences();
  return useMemo(
    () => ({
      colors: getThemeColors(themeMode),
      isDark: themeMode === "dark",
      mode: themeMode
    }),
    [themeMode]
  );
}
