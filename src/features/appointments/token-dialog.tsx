"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function TokenDialog({ info, onClose }: { info: { token: string | null; name: string } | null; onClose: () => void }) {
  return (
    <Modal open={info !== null} title="Patient checked in" onClose={onClose}>
      {info ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted">OPD token number</p>
          {info.token ? (
            <p className="font-headline text-8xl font-bold leading-none tracking-tight text-ink">{info.token}</p>
          ) : (
            <p className="text-sm text-ink">
              The server did not return a token number here. Open the{" "}
              <Link href="/appointments/queue" className="font-medium underline">OPD queue</Link> to see it.
            </p>
          )}
          <p className="text-sm text-ink">{info.name}</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : null}
    </Modal>
  );
}