import { LoginForm } from "@/features/auth/login-form";
import { loadBranding } from "@/features/branding/server";
import { Notice } from "@/components/ui/notice";
import { SectionStripe } from "@/components/ui/section-stripe";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  // Public: no login is needed to read it. null (not reachable, or nothing set) simply gives the plain design.
  const branding = await loadBranding();
  const hospitalName = branding?.hospitalName ?? "";

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-12">
      <section className="relative flex min-h-64 flex-col overflow-hidden border-b border-ink bg-background text-ink md:col-span-7 md:min-h-screen md:border-b-0 md:border-r">
        {branding?.loginImageSrc ? (
          <>
            {/* The picture is decoration: the name next to it says what this is. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={branding.loginImageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="relative">
              <SectionStripe className="h-2" />
            </div>
            <div className="relative mt-auto p-6 md:p-10">
              <div className="inline-block max-w-md border border-ink bg-surface p-5">
                <p className="font-headline text-xs font-semibold uppercase tracking-widest text-muted">Hospital Management System</p>
                <p className="mt-2 font-headline text-3xl font-bold leading-tight tracking-tight text-ink">{hospitalName || "HMS"}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <SectionStripe className="h-2" />
            <div className="flex flex-1 flex-col justify-between gap-16 p-8 md:p-16">
              <p className="font-headline text-xs font-semibold uppercase tracking-widest text-ink">Hospital Management System</p>
              <div>
                <h1 className="font-headline text-7xl font-bold leading-none tracking-tight text-ink md:text-9xl">HMS</h1>
                {hospitalName ? <p className="mt-4 font-headline text-xl font-semibold text-ink">{hospitalName}</p> : null}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="flex items-center bg-surface p-8 md:col-span-5 md:p-16">
        <div className="w-full max-w-sm">
          {branding?.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoSrc} alt={hospitalName ? `${hospitalName} logo` : "Hospital logo"} className="mb-8 h-16 w-auto max-w-56 object-contain" />
          ) : null}
          <h2 className="font-headline text-2xl font-bold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">{hospitalName ? `${hospitalName}. Use your staff account.` : "Use your staff account."}</p>
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
