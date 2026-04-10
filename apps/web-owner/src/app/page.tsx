import { redirect } from "next/navigation";
import { getOwnerPortalSession } from "@/lib/server-session";

export default async function HomePage(): Promise<never> {
  const session = await getOwnerPortalSession();
  redirect(session === null ? "/login" : "/dashboard");
}