import type { PlatformExperience } from "@hhousing/domain";

export function isEntrepriseExperience(experience: PlatformExperience): boolean {
  return experience === "entreprise";
}

export function isIndividualExperience(experience: PlatformExperience): boolean {
  return experience === "individual";
}

export function getPlatformExperienceLabel(experience: PlatformExperience): string {
  return isIndividualExperience(experience) ? "Particulier" : "Entreprise";
}
