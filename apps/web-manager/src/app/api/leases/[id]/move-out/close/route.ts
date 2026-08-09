import { jsonResponse } from "../../../../shared";

/** Legacy ledger close — removed from V1 Fin de location. */
export async function PATCH(): Promise<Response> {
  return jsonResponse(403, {
    success: false,
    code: "FEATURE_DISABLED",
    error: "La clôture comptable n'est plus utilisée. Utilisez Terminer la location."
  });
}
