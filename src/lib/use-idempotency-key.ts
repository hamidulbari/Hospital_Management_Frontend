"use client";

import { useRef } from "react";

/**
 * One key per attempt. The same request again (a retry or a double click) gets the same key, so it cannot pay twice.
 * As soon as anything in the request changes, or after reset(), the next attempt gets a new key.
 */
export function useIdempotencyKey() {
  const current = useRef<{ key: string; signature: string } | null>(null);
  return {
    keyFor(signature: string): string {
      if (!current.current || current.current.signature !== signature) {
        current.current = { key: crypto.randomUUID(), signature };
      }
      return current.current.key;
    },
    reset() {
      current.current = null;
    },
  };
}