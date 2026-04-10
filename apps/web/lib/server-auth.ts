import { auth } from "@trendx/api/lib/auth";
import { headers } from "next/headers";

export async function getServerSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch {
    return null;
  }
}
