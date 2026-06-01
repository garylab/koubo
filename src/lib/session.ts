import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { getAuth } from "./auth";

// Dedupe within one request: layout + page both call this, only one DB hit.
export const getServerSession = cache(async () => {
  return getAuth().api.getSession({
    headers: await headers(),
  });
});
