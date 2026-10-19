"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // error.message is not shown: it could contain data we do not want on screen.
  return (
    <div className="max-w-lg">
      <Notice tone="error">
        <p className="font-medium">Something went wrong.</p>
        {error.digest ? <p className="mt-1 text-xs">Reference: {error.digest}</p> : null}
      </Notice>
      <div className="mt-4">
        <Button variant="secondary" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}