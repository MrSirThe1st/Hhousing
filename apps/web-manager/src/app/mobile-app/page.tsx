"use client";

import Image from "next/image";
import Link from "next/link";

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_APP_STORE_URL?.trim()
  || "https://apps.apple.com/app/hhousing";
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_PLAY_STORE_URL?.trim()
  || "https://play.google.com/store/apps/details?id=com.hhousing.tenant";

export default function MobileAppPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3" aria-label="Mon Espace">
            <Image
              src="/brand/mon-espace-logo.png"
              alt="Mon Espace"
              width={96}
              height={142}
              className="h-24 w-auto object-contain"
              priority
            />
            <span className="text-2xl font-semibold tracking-tight text-[#010a19]">Mon Espace</span>
          </Link>
          <p className="mx-auto mt-2 max-w-xs text-sm text-gray-600">
            Application locataire
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-[#010a19]">Application mobile requise</h1>
            <p className="text-gray-600">
              Les locataires utilisent l&apos;application mobile Mon Espace pour gérer leur bail, payer
              le loyer et communiquer avec leur gestionnaire.
            </p>
          </div>

          <div className="mb-6 space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0063fe]">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[#010a19]">Consultez votre bail</p>
                <p className="text-sm text-gray-600">Détails du logement, dates, contacts</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0063fe]">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[#010a19]">Payez votre loyer</p>
                <p className="text-sm text-gray-600">Mobile money, carte bancaire, suivi des paiements</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0063fe]">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[#010a19]">Signalez un problème</p>
                <p className="text-sm text-gray-600">Demandes de maintenance avec photos et suivi</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/40"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span>Télécharger sur App Store</span>
            </a>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#0063fe] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0052d4] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/40"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              <span>Télécharger sur Google Play</span>
            </a>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Vous avez déjà l&apos;application ?{" "}
            <a
              href="hhousing-tenant://login"
              className="font-semibold text-[#0063fe] hover:text-[#0052d4]"
            >
              Ouvrir Mon Espace
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
