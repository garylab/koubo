import { getServerSession } from "@/lib/session";
import { SignOutButton } from "../_components/sign-out-button";
import { ProfileForm } from "./_components/profile-form";
import { PasswordChangeForm } from "./_components/password-change-form";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getServerSession();
  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
      <h1 className="text-xl font-semibold">我的</h1>

      <ProfileForm
        initialName={session.user.name}
        email={session.user.email}
      />

      <PasswordChangeForm />

      <SignOutButton />
    </div>
  );
}
