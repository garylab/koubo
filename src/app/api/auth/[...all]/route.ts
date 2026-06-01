import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let handler: ReturnType<typeof toNextJsHandler> | null = null;

function getHandler() {
  if (!handler) handler = toNextJsHandler(getAuth());
  return handler;
}

export const GET = (req: Request) => getHandler().GET(req);
export const POST = (req: Request) => getHandler().POST(req);
