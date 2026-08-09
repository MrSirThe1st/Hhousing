import { jsonResponse } from "../../../../shared";

/** Legacy inspection route — formal inspection removed from V1 Fin de location. */
export async function PATCH(): Promise<Response> {
  return jsonResponse(403, {
    success: false,
    code: "FEATURE_DISABLED",
    error: "L'inspection formelle n'est plus utilisée. Utilisez le parcours Fin de location."
  });
}
