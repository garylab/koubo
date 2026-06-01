import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { getOrCreateDefaultCollection } from "@/lib/api-helpers";
import { BottomNav } from "./_components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // Ensure every signed-in user has their default collection.
  await getOrCreateDefaultCollection(session.user.id);

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
