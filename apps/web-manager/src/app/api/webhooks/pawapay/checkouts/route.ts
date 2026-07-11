import { jsonResponse } from "../../../shared";

export async function POST(): Promise<Response> {
  return jsonResponse(200, { success: true, ignored: true });
}
