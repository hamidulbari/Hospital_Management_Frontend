"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { clientErrorFromResponse, networkError } from "@/lib/api/errors";
import type { BrandingKind } from "@/lib/branding";
import { redirectIfExpired } from "@/lib/session-expired";
import { checkDimensions, checkImageFile, IMAGE_TYPES } from "./image-check";

/** Reads the size of a picture in the browser, to give a friendly message before the upload. */
async function readSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

type CardProps = { kind: BrandingKind; title: string; help: string; current: string | null; canManage: boolean };

function ImageCard({ kind, title, help, current, canManage }: CardProps) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // A picture chosen on this page is shown from the computer: let it go when it is replaced or the page closes.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function reset() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    setError(undefined);
    if (!chosen) {
      reset();
      return;
    }
    const fileProblem = checkImageFile(kind, chosen);
    if (fileProblem) {
      reset();
      setError(fileProblem);
      return;
    }
    const size = await readSize(chosen);
    const sizeProblem = size ? checkDimensions(size.width, size.height) : "This file could not be read as an image.";
    if (sizeProblem) {
      reset();
      setError(sizeProblem);
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    try {
      const response = await fetch("/api/hospital-branding", { method: "POST", body: form });
      if (response.redirected) {
        window.location.assign("/api/auth/session-expired");
        return;
      }
      if (response.ok) {
        toast.success(kind === "logo" ? "Logo saved." : "Login image saved.");
        reset();
        router.refresh();
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      const failure = clientErrorFromResponse(response.status, body, response.headers.get("X-Correlation-Id"), { preferServerMessage: true });
      if (redirectIfExpired(failure)) return;
      const message = Object.values(failure.fieldErrors)[0] ?? failure.message;
      setError(message);
      toast.error(message, failure.unexpected ? failure.correlationId : null);
    } catch {
      const failure = networkError();
      setError(failure.message);
      toast.error(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/hospital-branding?kind=${kind}`, { method: "DELETE" });
      if (response.redirected) {
        window.location.assign("/api/auth/session-expired");
        return;
      }
      if (response.ok) {
        toast.success(kind === "logo" ? "Logo removed." : "Login image removed.");
        router.refresh();
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      const failure = clientErrorFromResponse(response.status, body, response.headers.get("X-Correlation-Id"), { preferServerMessage: true });
      if (redirectIfExpired(failure)) return;
      toast.error(failure.message, failure.unexpected ? failure.correlationId : null);
    } catch {
      toast.error(networkError().message);
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  }

  const shown = preview ?? current;

  return (
    <div className="flex flex-col gap-4 border border-ink bg-surface p-6">
      <div>
        <h3 className="font-headline text-xs font-semibold uppercase tracking-wider text-ink">{title}</h3>
        <p className="mt-1 text-xs text-muted">{help}</p>
      </div>

      <div className="flex min-h-40 items-center justify-center border border-accent bg-white p-3">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={`${title}, current picture`} className="max-h-40 max-w-full object-contain" />
        ) : (
          <p className="text-sm text-muted">No picture yet.</p>
        )}
      </div>
      {preview ? <p className="text-xs font-medium text-ink">This is a preview. It is saved only after you press Upload.</p> : null}

      {canManage ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            aria-label={`Choose a picture for: ${title}`}
            onChange={onPick}
            disabled={busy}
            className="block w-full text-sm text-ink file:mr-3 file:cursor-pointer file:border file:border-ink file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:border-section hover:file:bg-section-soft"
          />
          {error ? (
            <p role="alert" className="text-xs font-medium text-error">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={upload} loading={busy} disabled={!file}>Upload</Button>
            {file ? <Button variant="secondary" onClick={reset} disabled={busy}>Cancel</Button> : null}
            {current && !file ? <Button variant="secondary" onClick={() => setConfirmRemove(true)} disabled={busy}>Remove picture</Button> : null}
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        title="Remove this picture?"
        description="The picture is deleted from the server. You can upload another one at any time."
        confirmLabel="Remove picture"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}

type Props = { logoSrc: string | null; loginImageSrc: string | null; canManage: boolean };

export function BrandingPanel({ logoSrc, loginImageSrc, canManage }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ImageCard
          kind="logo"
          title="Logo"
          help="Shown in the side menu, on the login page and at the top of printed bills. PNG, JPEG or WebP, up to 1 MB, 16 to 4096 pixels on each side."
          current={logoSrc}
          canManage={canManage}
        />
        <ImageCard
          kind="login_image"
          title="Login page image"
          help="Fills the left side of the login page. PNG, JPEG or WebP, up to 3 MB, 16 to 4096 pixels on each side. A wide picture works best."
          current={loginImageSrc}
          canManage={canManage}
        />
      </div>
      {!canManage ? <p className="text-xs text-muted">You may look at the pictures but not change them.</p> : null}
    </div>
  );
}
