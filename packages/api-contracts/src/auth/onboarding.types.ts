import type { Organization, OrganizationMembership, PlatformExperience } from "@hhousing/domain";

export type { PlatformExperience };

export interface CreateOperatorAccountInput {
  organizationName: string;
  platformExperience: PlatformExperience;
}

export interface CreateOperatorAccountOutput {
  organization: Organization;
  membership: OrganizationMembership;
}

export interface UpdatePlatformExperienceInput {
  platformExperience: PlatformExperience;
}

export interface UpdatePlatformExperienceOutput {
  platformExperience: PlatformExperience;
}
