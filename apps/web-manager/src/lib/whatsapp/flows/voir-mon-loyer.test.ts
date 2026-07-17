import { describe, expect, it } from "vitest";
import { buildVoirMonLoyerScreenData, type TenantRentSummary } from "./voir-mon-loyer";

describe("buildVoirMonLoyerScreenData", () => {
  it("maps rent summary fields for the Flow screen", () => {
    const summary: TenantRentSummary = {
      tenantFullName: "Amina Kabila",
      amountLabel: "450000 CDF",
      dueDateLabel: "5 juillet 2026",
      statusLabel: "En retard",
      statusCode: "overdue"
    };

    expect(buildVoirMonLoyerScreenData(summary)).toEqual({
      screen: "LOYER",
      data: {
        heading: "Votre loyer",
        tenant_name: "Amina Kabila",
        amount_label: "450000 CDF",
        due_date_label: "5 juillet 2026",
        status_label: "En retard",
        summary_text: "450000 CDF · Échéance 5 juillet 2026 · En retard"
      }
    });
  });
});
