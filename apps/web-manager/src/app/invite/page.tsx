"use client";

import { useEffect, useMemo, useState } from "react";

const APP_STORE_URL = "https://apps.apple.com/app/hhousing";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.hhousing.tenant";
const OPEN_DELAY_MS = 900;

type DevicePlatform = "ios" | "android" | "desktop";

type StoreLink = {
  href: string;
  label: string;
  description: string;
  accentClassName: string;
  icon: React.ReactElement;
};

function buildDeepLink(token: string): string {
  const encodedToken = encodeURIComponent(token);
  return `hhousing-tenant://accept-invite?token=${encodedToken}`;
}

function detectPlatform(userAgent: string): DevicePlatform {
  const normalizedUserAgent = userAgent.toLowerCase();

  if (/iphone|ipad|ipod|ios/.test(normalizedUserAgent)) {
    return "ios";
  }

  if (/android/.test(normalizedUserAgent)) {
    return "android";
  }

  return "desktop";
}

function AppStoreIcon(): React.ReactElement {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayStoreIcon(): React.ReactElement {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85A1.49 1.49 0 0 1 3 20.5Zm13.81-5.38-10.76 6.22 8.49-8.49 2.27 2.27Zm3.35-4.31c.34.27.59.69.59 1.19s-.25.92-.59 1.19l-2.27 1.31L15.39 12l2.5-2.5 2.27 1.31ZM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49Z" />
    </svg>
  );
}

export default function InvitePage(): React.ReactElement {
  const [token, setToken] = useState("");
  const [hasAttemptedOpen, setHasAttemptedOpen] = useState(false);
  const [didOpenApp, setDidOpenApp] = useState(false);
  const [platform, setPlatform] = useState<DevicePlatform>("desktop");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const nextToken = searchParams.get("token")?.trim() ?? "";
    setToken(nextToken);
    setPlatform(detectPlatform(window.navigator.userAgent));
  }, []);

  const deepLink = useMemo(() => {
    if (!token) {
      return "hhousing-tenant://accept-invite";
    }

    return buildDeepLink(token);
  }, [token]);

  useEffect(() => {
    if (!token || hasAttemptedOpen) {
      return;
    }

    let timeoutId: number | undefined;

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        setDidOpenApp(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    setHasAttemptedOpen(true);
    window.location.href = deepLink;

    timeoutId = window.setTimeout(() => {
      setDidOpenApp(document.visibilityState === "hidden");
    }, OPEN_DELAY_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [deepLink, hasAttemptedOpen, token]);

  const showFallback = !token || (hasAttemptedOpen && !didOpenApp);

  const storeLinks = useMemo((): StoreLink[] => {
    const defaultLinks: StoreLink[] = [
      {
        href: APP_STORE_URL,
        label: "Télécharger sur App Store",
        description: "Version iPhone et iPad",
        accentClassName: "bg-black text-white hover:bg-slate-800",
        icon: <AppStoreIcon />
      },
      {
        href: PLAY_STORE_URL,
        label: "Télécharger sur Google Play",
        description: "Version Android",
        accentClassName: "bg-[#0063FE] text-white hover:bg-[#0052d4]",
        icon: <PlayStoreIcon />
      }
    ];

    if (platform === "ios") {
      return [defaultLinks[0], defaultLinks[1]];
    }

    if (platform === "android") {
      return [defaultLinks[1], defaultLinks[0]];
    }

    return defaultLinks;
  }, [platform]);

  const preferredStoreLink = storeLinks[0];

  const platformLabel =
    platform === "ios"
      ? "iPhone détecté"
      : platform === "android"
        ? "Android détecté"
        : "Appareil non identifié";

  const platformDescription =
    platform === "ios"
      ? "Priorité au téléchargement App Store pour ouvrir le lien dans l'app plus vite."
      : platform === "android"
        ? "Priorité au téléchargement Google Play pour ouvrir le lien dans l'app plus vite."
        : "Si vous êtes sur mobile, utilisez la boutique correspondant à votre téléphone. Sinon, ouvrez ce lien depuis votre appareil mobile après installation.";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,99,254,0.14),_transparent_38%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_46%,#ffffff_100%)] px-6 py-10 text-[#010A19] sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_30px_90px_rgba(1,10,25,0.12)] backdrop-blur sm:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden px-7 py-10 sm:px-10 sm:py-12">
            <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(135deg,rgba(0,99,254,0.12),rgba(1,10,25,0))]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0063FE]">Hhousing Tenant</p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[#010A19] sm:text-5xl">
                Ouvrez votre invitation locataire dans l&apos;application.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Le lien HTTPS essaie d&apos;ouvrir automatiquement l&apos;app Hhousing Tenant. Si elle n&apos;est pas encore installée, téléchargez-la puis revenez sur ce lien pour finaliser l&apos;activation de votre accès.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-[#010A19]">1. Ouvrir l&apos;app</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Le lien tente `accept-invite` avec votre jeton sécurisé.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-[#010A19]">2. Définir le mot de passe</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Le locataire crée son mot de passe directement dans l&apos;app.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-[#010A19]">3. Accéder au dossier</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Le bail, les paiements et les documents deviennent accessibles ensuite.</p>
                </div>
              </div>

              <div className="mt-8 rounded-[28px] border border-[#0063FE]/15 bg-[#010A19] px-6 py-6 text-white shadow-[0_20px_60px_rgba(1,10,25,0.28)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7fb0ff]">Lien d&apos;activation</p>
                <p className="mt-3 break-all text-sm leading-6 text-slate-200">{token ? deepLink : "Jeton manquant dans le lien d&apos;invitation."}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={deepLink}
                    className="inline-flex items-center justify-center rounded-full bg-[#0063FE] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                  >
                    Ouvrir l&apos;application
                  </a>
                  <a
                    href={preferredStoreLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
                  >
                    {platform === "desktop" ? "Installer l&apos;app sur mobile" : preferredStoreLink.label}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-7 py-10 sm:border-l sm:border-t-0 sm:px-9 sm:py-12">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0063FE]/10 text-[#0063FE]">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#010A19]">Télécharger Hhousing Tenant</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Disponible sur iPhone et Android.</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#0063FE]/15 bg-[#0063FE]/5 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0063FE]">{platformLabel}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{platformDescription}</p>
              </div>

              <div className="mt-6 space-y-3">
                {storeLinks.map((storeLink, index) => (
                  <a
                    key={storeLink.href}
                    href={storeLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between gap-4 rounded-2xl px-4 py-4 text-sm font-semibold transition ${storeLink.accentClassName}`}
                  >
                    <span className="flex items-center gap-3">
                      {storeLink.icon}
                      <span>
                        <span className="block">{storeLink.label}</span>
                        <span className={`mt-1 block text-xs font-medium ${index === 0 ? "text-white/80" : "text-slate-100"}`}>{storeLink.description}</span>
                      </span>
                    </span>
                    {index === 0 ? <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.16em]">Prioritaire</span> : null}
                  </a>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                {showFallback ? (
                  <p>
                    Si rien ne s&apos;ouvre automatiquement, installez l&apos;application puis revenez ici et utilisez <a href={deepLink} className="font-semibold text-[#0063FE] underline underline-offset-4">Ouvrir l&apos;application</a>.
                  </p>
                ) : (
                  <p>Tentative d&apos;ouverture de l&apos;application en cours...</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}