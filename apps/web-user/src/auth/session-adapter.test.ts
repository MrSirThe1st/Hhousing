import { describe, expect, it } from "vitest";
import { extractAuthSessionFromRequest } from "./session-adapter";

describe("extractAuthSessionFromRequest", () => {
  it("returns session from bearer token user data", async () => {
    const request = new Request("http://localhost", {
      headers: {
        authorization: "Bearer test_token"
      }
    });

    const session = await extractAuthSessionFromRequest(request, {
      getClient: () => ({
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: "usr_1",
                app_metadata: {
                  role: "manager"
                }
              }
            },
            error: null
          })
        }
      })
    });

    expect(session).toEqual({
      userId: "usr_1",
      role: "manager"
    });
  });

  it("returns null when token is missing", async () => {
    const request = new Request("http://localhost", {
      headers: {
        authorization: ""
      }
    });

    const session = await extractAuthSessionFromRequest(request, {
      getClient: () => null
    });

    expect(session).toBeNull();
  });
});
