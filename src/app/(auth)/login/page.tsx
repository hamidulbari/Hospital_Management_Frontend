import { LoginForm } from "@/features/auth/login-form";
import { Notice } from "@/components/ui/notice";
import { SectionStripe } from "@/components/ui/section-stripe";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-12">
      <section className="flex flex-col border-b border-ink bg-background text-ink md:col-span-7 md:border-b-0 md:border-r">
        <SectionStripe className="h-2" />
        <div className="flex flex-1 flex-col justify-between gap-16 p-8 md:p-16">
          <p className="font-headline text-xs font-semibold uppercase tracking-widest text-ink">Hospital Management System</p>
          <h1 className="font-headline text-7xl font-bold leading-none tracking-tight text-ink md:text-9xl">HMS</h1>
        </div>
      </section>
      <section className="flex items-center bg-surface p-8 md:col-span-5 md:p-16">
        <div className="w-full max-w-sm">
          <h2 className="font-headline text-2xl font-bold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your staff account.</p>
          {reason === "expired" ? (
            <div className="mt-6">
              <Notice>Your session has expired. Please sign in again.</Notice>
            </div>
          ) : null}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}