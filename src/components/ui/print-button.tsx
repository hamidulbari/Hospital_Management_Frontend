"use client";

import { Button } from "./button";

/** Opens the browser's print window. There, "Save as PDF" makes a PDF. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}