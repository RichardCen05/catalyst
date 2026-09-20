"use client";

import { useEffect, useRef } from "react";
import { useCatalystStore } from "@/lib/store";
import { apiUrl } from "@/lib/api-base";

const STORAGE_KEY = "catalyst:v1";
const SYNC_DEBOUNCE_MS = 1500;

/**
 * Server-side backup of the localStorage-only zustand `persist`, keyed by the
 * anonymous `catalyst_uid` cookie set in `/api/memory`.
 *
 * NOT cross-device. There is no sign-in: the cookie is per-browser, so a new
 * device (or a cleared browser) gets a fresh uid and starts empty. What this
 * does buy is recovery inside one browser — a profile that survives a
 * localStorage wipe, as long as the cookie is still there. Real cross-device
 * continuity needs an account (plan P4); do not claim it until then.
 *
 * Hydration is one-way and conservative: it only fills a browser that has
 * never onboarded locally, so an already-used browser keeps its own state
 * instead of being overwritten by whatever was last synced.
 */
export function MemorySync() {
  const hydratedRemote = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/memory"))
      .then((response) => response.json())
      .then((body: { data?: { profile?: { hasOnboarded?: boolean } } }) => {
        if (cancelled || hydratedRemote.current) return;
        const remote = body.data;
        const local = useCatalystStore.getState();
        if (remote?.profile?.hasOnboarded && !local.profile.hasOnboarded) {
          hydratedRemote.current = true;
          useCatalystStore.setState(remote as Partial<ReturnType<typeof useCatalystStore.getState>>);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useCatalystStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        let raw: string | null = null;
        try {
          raw = localStorage.getItem(STORAGE_KEY);
        } catch {
          return;
        }
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
          if (!parsed.state) return;
          // The result is inspected rather than discarded. A bare
          // `void fetch(...)` raised an unhandled rejection into the page the
          // moment the network was down, and a 400 from the schema check was
          // indistinguishable from a successful save: the browser kept showing
          // state the bucket had refused. Neither is user-visible yet — the
          // local snapshot is still authoritative for this browser — but an
          // operator can now see which writes the backup is missing.
          void fetch(apiUrl("/api/memory"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.state) })
            .then((response) => {
              if (response.ok) return;
              console.warn(`[memory] backup write rejected (${response.status}); local state kept, server copy is behind`);
            })
            .catch((error: unknown) => {
              console.warn(`[memory] backup write failed: ${error instanceof Error ? error.message : String(error)}`);
            });
        } catch {
          // malformed local snapshot — skip this sync, try again next change
        }
      }, SYNC_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
