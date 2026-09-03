export const DESKTOP_PROTOCOL = "haraka-property";
export const DESKTOP_AUTH_CALLBACK_PATH = "/auth/callback";
export const DESKTOP_AUTH_REDIRECT_URI = `${DESKTOP_PROTOCOL}://${DESKTOP_AUTH_CALLBACK_PATH.replace(/^\//, "")}`;
export const DESKTOP_AUTH_COOKIE_NAME = "hp_desktop_auth";
export const DESKTOP_AUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
export const DESKTOP_PENDING_TTL_MS = 10 * 60 * 1000;
export const DESKTOP_AUTH_CODE_TTL_MS = 90 * 1000;

export type DesktopAuthIntent = "login" | "signup";
