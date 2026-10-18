import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { Notice } from "@/components/ui/notice";
import { requireSession } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
  const session = await requireSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-primary-dark">Change password</h1>
      {session.mustChangePassword ? (
        <div className="mt-6">
          <Notice>You must choose a new password before you can continue.</Notice>
        </div>
      ) : null}
      <ChangePasswordForm forced={session.mustChangePassword} />
    </main>
  );
}