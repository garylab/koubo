import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/session";
import { SignOutButton } from "./_components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center justify-between">
        <Link href="/brands" className="font-semibold tracking-tight">
          Koubo
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
