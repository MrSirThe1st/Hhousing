import { jsonResponse } from "../../../../shared";

/** Legacy reconciliation — unused in V1 Fin de location. */
export async function GET(): Promise<Response> {
  return jsonResponse(403, {
    success: false,
    code: "FEATURE_DISABLED",
    error: "La réconciliation comptable n'est plus utilisée."
  });
}
