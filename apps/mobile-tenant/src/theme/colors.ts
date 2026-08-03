export type ThemeColors = {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceMuted: string;
  surfaceSoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  brand: string;
  brandSoft: string;
  brandMuted: string;
  onBrand: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  iconMuted: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  inputBg: string;
  inputBorder: string;
  readonlyBg: string;
  avatarBg: string;
  skeleton: string;
  overlay: string;
  switchTrackOff: string;
  switchTrackOn: string;
  switchThumbOff: string;
  statusBarStyle: "light" | "dark";
};

export const lightColors: ThemeColors = {
  background: "#FFFFFF",
  backgroundAlt: "#F5F6FA",
  surface: "#FFFFFF",
  surfaceMuted: "#F9FAFB",
  surfaceSoft: "#EFF6FF",
  text: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#C5CCD9",
  brand: "#0063FE",
  brandSoft: "#EFF6FF",
  brandMuted: "#93C5FD",
  onBrand: "#FFFFFF",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  success: "#16A34A",
  warning: "#D97706",
  iconMuted: "#9CA3AF",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E5E7EB",
  tabInactive: "#9CA3AF",
  inputBg: "#F5F6FA",
  inputBorder: "#C5CCD9",
  readonlyBg: "#ECEEF7",
  avatarBg: "#E8EEF7",
  skeleton: "#E5E7EB",
  overlay: "rgba(0,0,0,0.4)",
  switchTrackOff: "#D1D5DB",
  switchTrackOn: "#93C5FD",
  switchThumbOff: "#F3F4F6",
  statusBarStyle: "dark"
};

export const darkColors: ThemeColors = {
  background: "#0B1220",
  backgroundAlt: "#111827",
  surface: "#1A2332",
  surfaceMuted: "#1F2937",
  surfaceSoft: "#1E3A5F",
  text: "#F9FAFB",
  textSecondary: "#E5E7EB",
  textMuted: "#CBD5E1",
  textFaint: "#94A3B8",
  border: "#2A3544",
  borderStrong: "#3B4658",
  brand: "#3B82F6",
  brandSoft: "#1E3A5F",
  brandMuted: "#1D4ED8",
  onBrand: "#FFFFFF",
  danger: "#F87171",
  dangerSoft: "#3F1D1D",
  success: "#4ADE80",
  warning: "#FBBF24",
  iconMuted: "#9CA3AF",
  tabBar: "#111827",
  tabBarBorder: "#1F2937",
  tabInactive: "#6B7280",
  inputBg: "#1F2937",
  inputBorder: "#3B4658",
  readonlyBg: "#1F2937",
  avatarBg: "#273447",
  skeleton: "#273447",
  overlay: "rgba(0,0,0,0.6)",
  switchTrackOff: "#4B5563",
  switchTrackOn: "#1D4ED8",
  switchThumbOff: "#9CA3AF",
  statusBarStyle: "light"
};

export function getThemeColors(mode: "light" | "dark"): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}
