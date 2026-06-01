import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { getDb } from "@/lib/db/client";
import { collection } from "@/lib/db/schema";
import { getOrCreateDefaultCollection } from "@/lib/api-helpers";
import { SignOutButton } from "./_components/sign-out-button";
import { CollectionTabs } from "./_components/collection-tabs";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // Ensure default collection exists.
  await getOrCreateDefaultCollection(session.user.id);

  const db = getDb();
  const collections = await db
    .select({
      id: collection.id,
      name: collection.name,
      isDefault: collection.isDefault,
    })
    .from(collection)
    .where(eq(collection.userId, session.user.id))
    .orderBy(desc(collection.isDefault), desc(collection.updatedAt));

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center justify-between">
        <Link href="/scripts" className="font-semibold tracking-tight">
          Koubo
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <CollectionTabs collections={collections} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
