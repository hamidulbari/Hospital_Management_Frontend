import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
      <h1 className="font-headline text-3xl font-bold text-ink">Page not found</h1>
      <Link href="/" className="text-sm font-medium text-ink underline hover:text-primary">Back to dashboard</Link>
    </main>
  );
}