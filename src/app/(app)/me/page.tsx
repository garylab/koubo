import { getServerSession } from "@/lib/session";
import { SignOutButton } from "../_components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getServerSession();
  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
      <h1 className="text-xl font-semibold">我的</h1>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
        <div>
          <div className="text-xs text-neutral-500">昵称</div>
          <div className="text-sm">{session.user.name}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">邮箱</div>
          <div className="text-sm">{session.user.email}</div>
        </div>
      </section>

      <section>
        <SignOutButton />
      </section>
    </div>
  );
}
