import { redirect } from "next/navigation";
import type { ApiResult, AuthSession } from "@hhousing/api-contracts";
import type { PlatformExperience } from "@hhousing/domain";
import { jsonResponse } from "../app/api/shared";
import { getServerOperatorContext } from "./operator-context";
import { isIndividualExperience } from "./platform-experience";
import { getServerAuthSession } from "./session";

export async function getPlatformExperienceForSession(session: AuthSession): Promise<PlatformExperience> {
  const context = await getServerOperatorContext(session);
  return context.experience;
}

export async function requireEntrepriseExperience(): Promise<PlatformExperience> {
  const session = await getServerAuthSession();
  if (session === null) {
    redirect("/login");
  }

  const experience = await getPlatformExperienceForSession(session);
  if (isIndividualExperience(experience)) {
    redirect("/dashboard");
  }

  return experience;
}

export async function requireEntrepriseExperienceForApi(
  session: AuthSession | null
): Promise<ApiResult<PlatformExperience>> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  const experience = await getPlatformExperienceForSession(session);
  if (isIndividualExperience(experience)) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Cette fonctionnalité est disponible uniquement en mode entreprise."
    };
  }

  return {
    success: true,
    data: experience
  };
}

export async function rejectIfIndividualExperience(session: AuthSession | null): Promise<Response | null> {
  const access = await requireEntrepriseExperienceForApi(session);
  if (!access.success) {
    return jsonResponse(access.code === "UNAUTHORIZED" ? 401 : 403, access);
  }

  return null;
}
