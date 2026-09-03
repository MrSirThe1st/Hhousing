const WEB_MANAGER_APP_ID = "haraka-web-manager";

export async function GET(): Promise<Response> {
  return Response.json(
    { app: WEB_MANAGER_APP_ID },
    {
      headers: {
        "cache-control": "no-store",
        "x-haraka-app": WEB_MANAGER_APP_ID,
      },
    },
  );
}
