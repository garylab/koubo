import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { getOrCreateDefaultCollection } from "@/lib/api-helpers";
import { ScriptEditor } from "../_components/script-editor";

export const dynamic = "force-dynamic";

export default async function NewScriptPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { c: explicit } = await searchParams;

  const db = getDb();
  const collections = await db
    .select({ id: collection.id, name: collection.name, isDefault: collection.isDefault })
    .from(collection)
    .where(eq(collection.userId, session.user.id))
    .orderBy(desc(collection.isDefault), desc(collection.updatedAt));

  let initialCollectionId = collections.find((c) => c.id === explicit)?.id;
  if (!initialCollectionId) {
    const def = await getOrCreateDefaultCollection(session.user.id);
    initialCollectionId = def.id;
  }

  return (
    <ScriptEditor
      scriptId={null}
      initialCollectionId={initialCollectionId}
      initialContent=""
      embeddingUpdatedAt={null}
      collections={collections.map(({ id, name }) => ({ id, name }))}
    />
  );
}
