"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Organization } from "@hhousing/domain";
import LogoutButton from "./logout-button";
import OperatorProfilePanel from "./operator-profile-panel";
import OrganizationSettingsForm from "./organization-settings-form";
import PlatformExperienceSettings from "./platform-experience-settings";
import { isIndividualExperience } from "../lib/platform-experience";

type ProfileTab = "organisation" | "compte";

interface ProfileSettingsViewProps {
  role: "landlord" | "property_manager" | "platform_admin";
  organization: Organization | null;
  canEditOrganization: boolean;
  initialTab?: ProfileTab;
}

function resolveTab(value: string | null | undefined): ProfileTab {
  if (value === "organisation" || value === "company" || value === "espace") {
    return "organisation";
  }
  return "compte";
}

export default function ProfileSettingsView({
  role,
  organization,
  canEditOrganization,
  initialTab = "compte"
}: ProfileSettingsViewProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    resolveTab(searchParams.get("tab") ?? initialTab)
  );

  const isIndividual = organization ? isIndividualExperience(organization.platformExperience) : false;
  const companyLabel = isIndividual ? "Espace" : "Organisation";
  const companyDescription = isIndividual
    ? "Nom, contacts et informations de votre espace locatif."
    : "Logo, contacts et informations légales de votre agence.";

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab") ?? initialTab));
  }, [searchParams, initialTab]);

  function selectTab(tab: ProfileTab): void {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isIndividual
            ? "Gérez votre espace et votre compte administrateur."
            : "Gérez l'organisation et votre compte gestionnaire."}
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => selectTab("organisation")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "organisation"
              ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-[#010a19]"
          }`}
        >
          {companyLabel}
        </button>
        <button
          type="button"
          onClick={() => selectTab("compte")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "compte"
              ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-[#010a19]"
          }`}
        >
          Compte
        </button>
      </div>

      {activeTab === "organisation" ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">{companyLabel}</h2>
            <p className="mt-1 text-sm text-slate-500">{companyDescription}</p>
          </div>
          {organization ? (
            <OrganizationSettingsForm organization={organization} canEdit={canEditOrganization} />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Organisation introuvable.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Compte administrateur</h2>
              <p className="mt-1 text-sm text-slate-500">
                Informations personnelles, expérience plateforme et sécurité du compte.
              </p>
            </div>
            <div className="shrink-0">
              <LogoutButton />
            </div>
          </div>

          {organization ? (
            <PlatformExperienceSettings
              initialExperience={organization.platformExperience}
              canEdit={canEditOrganization}
            />
          ) : null}

          <OperatorProfilePanel role={role} organization={organization} />
        </div>
      )}
    </div>
  );
}
