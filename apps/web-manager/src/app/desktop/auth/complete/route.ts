import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import {
  DESKTOP_AUTH_COOKIE_NAME,
  DESKTOP_AUTH_REDIRECT_URI
} from "../../../../lib/desktop-auth/constants";
import { desktopAuthCookieOptions } from "../../../../lib/desktop-auth/cookie";
import { mintDesktopAuthCode, takeDesktopAuthPending } from "../../../../lib/desktop-auth/store";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPage(options: {
  title: string;
  heading: string;
  body: string;
  deepLink?: string;
}): string {
  const deepLinkBlock = options.deepLink
    ? `<p><a class="action" href="${escapeHtml(options.deepLink)}">Ouvrir Haraka Property</a></p>
<script>window.setTimeout(function () { window.location.href = ${JSON.stringify(options.deepLink)}; }, 250);</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
    main { width: min(28rem, calc(100vw - 2rem)); background: #fff; border: 1px solid #e2e8f0;
      border-radius: 1.25rem; padding: 2rem; text-align: center; box-shadow: 0 20px 40px rgb(15 23 42 / 0.08); }
    h1 { margin: 0 0 0.75rem; font-size: 1.35rem; }
    p { margin: 0 0 1rem; color: #475569; line-height: 1.5; }
    .action { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem;
      padding: 0 1rem; border-radius: 0.75rem; background: #0063fe; color: #fff; text-decoration: none;
      font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(options.heading)}</h1>
    <p>${escapeHtml(options.body)}</p>
    ${deepLinkBlock}
  </main>
</body>
</html>`;
}

function htmlResponse(html: string, init?: { status?: number; clearCookie?: boolean }): NextResponse {
  const response = new NextResponse(html, {
    status: init?.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
  if (init?.clearCookie) {
    response.cookies.set(DESKTOP_AUTH_COOKIE_NAME, "", desktopAuthCookieOptions(0));
  }
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const state = cookieStore.get(DESKTOP_AUTH_COOKIE_NAME)?.value?.trim() ?? "";

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error } = await supabase.auth.getSession();
  const session = sessionData.session;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (error || !user || !session?.access_token || !session.refresh_token) {
    return NextResponse.redirect(new URL("/login?error=desktop_auth_required", url.origin));
  }

  const pending = state ? takeDesktopAuthPending(state) : null;
  if (!pending) {
    return htmlResponse(
      renderPage({
        title: "Haraka Property",
        heading: "Session de connexion introuvable",
        body: "Retournez dans l'application Haraka Property et relancez la connexion."
      }),
      { status: 400, clearCookie: true }
    );
  }

  const minted = mintDesktopAuthCode({
    state: pending.state,
    challenge: pending.challenge,
    accessToken: session.access_token,
    refreshToken: session.refresh_token
  });

  const deepLink = `${DESKTOP_AUTH_REDIRECT_URI}?code=${encodeURIComponent(minted.code)}&state=${encodeURIComponent(pending.state)}`;

  return htmlResponse(
    renderPage({
      title: "Haraka Property",
      heading: "Vous êtes connecté",
      body: "Vous pouvez fermer cette fenêtre et revenir à Haraka Property.",
      deepLink
    }),
    { clearCookie: true }
  );
}
