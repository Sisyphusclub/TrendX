import { auth, ensureDefaultOperatorAccount } from "@trendx/api/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";

const { GET: authGet, POST: authPost } = toNextJsHandler(auth);

export async function GET(request: Request): Promise<Response> {
  await ensureDefaultOperatorAccount();

  return await authGet(request);
}

export async function POST(request: Request): Promise<Response> {
  await ensureDefaultOperatorAccount();

  return await authPost(request);
}
