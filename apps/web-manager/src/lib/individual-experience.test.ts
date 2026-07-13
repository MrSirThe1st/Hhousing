import { describe, expect, it } from "vitest";
import {
  getIndividualExperienceFeatures,
  isDashboardPathHiddenInIndividualExperience,
  isNavHrefHiddenInIndividualExperience
} from "./individual-experience";

describe("individual experience", () => {
  it("returns enterprise features for entreprise mode", () => {
    const features = getIndividualExperienceFeatures("entreprise");

    expect(features.emailTemplates).toBe(true);
    expect(features.leaseMoveOut).toBe(true);
    expect(features.managedPropertyMode).toBe(true);
  });

  it("disables enterprise-only features for individual mode", () => {
    const features = getIndividualExperienceFeatures("individual");

    expect(features.emailTemplates).toBe(false);
    expect(features.leaseMoveOut).toBe(false);
    expect(features.dashboardTasksCalendar).toBe(false);
  });

  it("hides enterprise dashboard paths in individual mode", () => {
    expect(isDashboardPathHiddenInIndividualExperience("/dashboard/team")).toBe(true);
    expect(isDashboardPathHiddenInIndividualExperience("/dashboard/clients/abc")).toBe(true);
    expect(isDashboardPathHiddenInIndividualExperience("/dashboard/leases/lease_1/move-out")).toBe(true);
    expect(isDashboardPathHiddenInIndividualExperience("/dashboard/properties")).toBe(false);
  });

  it("matches nav href filtering", () => {
    expect(isNavHrefHiddenInIndividualExperience("/dashboard/reports")).toBe(true);
    expect(isNavHrefHiddenInIndividualExperience("/dashboard/payments")).toBe(false);
  });
});
