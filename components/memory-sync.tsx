"use client";

import { useEffect, useRef } from "react";
import { useCatalystStore } from "@/lib/store";
import { parseMemorySnapshot } from "@/lib/memory/snapshot";
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
      .then((body: { data?: unknown }) => {
        if (cancelled || hydratedRemote.current) return;
        /**
         * Migrated and checked before anything reaches the store.
         *
         * `setState(remote)` used to put the bucket's bytes straight into the
         * store: an object written by an older build kept its old shape, and a
         * wrong-shaped key became wrong-shaped state. The parser runs the same
         * migration `persist` runs and validates every key; one bad key
         * discards the whole snapshot rather than hydrating half of it, and
         * the reader keeps the local state they already had.
         */
        const remote = parseMemorySnapshot(body.data);
        if (!remote) {
          if (body.data && Object.keys(body.data).length > 0) {
            console.warn("[memory] backup snapshot rejected; local state kept");
          }
          return;
        }
        const profile = remote.profile as { hasOnboarded?: boolean } | undefined;
        const local = useCatalystStore.getState();
        if (profile?.hasOnboarded && !local.profile.hasOnboarded) {
          hydratedRemote.current = true;
          useCatalystStore.setState(remote as Partial<ReturnType<typeof useCatalystStore.getState>>);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    /**
     * The snapshot zustand `persist` last wrote, as the request body, or null
     * when there is nothing sendable. Both the debounce timer and the page-hide
     * flush read through here so they cannot send different bytes for the same
     * edit.
     */
    const readSnapshot = (): string | null => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
        if (!parsed.state) return null;
        return JSON.stringify(parsed.state);
      } catch {
        // malformed local snapshot — skip this sync, try again next change
        return null;
      }
    };

    const warnRejected = (status: number) => {
      console.warn(`[memory] backup write rejected (${status}); local state kept, server copy is behind`);
    };
    const warnFailed = (error: unknown) => {
      console.warn(`[memory] backup write failed: ${error instanceof Error ? error.message : String(error)}`);
    };

    /**
     * The ordinary path. The result is inspected rather than discarded. A bare
     * `void fetch(...)` raised an unhandled rejection into the page the moment
     * the network was down, and a 400 from the schema check was
     * indistinguishable from a successful save: the browser kept showing state
     * the bucket had refused. Neither is user-visible yet — the local snapshot
     * is still authoritative for this browser — but an operator can now see
     * which writes the backup is missing.
     */
    const postSnapshot = (body: string, keepalive: boolean) => {
      void fetch(apiUrl("/api/memory"), { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive })
        .then((response) => {
          if (response.ok) return;
          warnRejected(response.status);
        })
        .catch(warnFailed);
    };

    /**
     * Send a pending edit before the page goes away.
     *
     * Without this the debounce window was a write-loss window: closing the tab
     * inside SYNC_DEBOUNCE_MS ran the effect cleanup, which cleared the timer,
     * and nothing was sent. localStorage still held the edit, so only the GCS
     * backup fell behind — but it fell behind on every edit, for the full
     * 1500ms.
     *
     * A no-op when no timer is armed, and it clears the one that is, so the
     * snapshot cannot also go out on the debounce path.
     */
    const flushSnapshot = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      const body = readSnapshot();
      if (body === null) return;
      // An ordinary fetch is cancelled with the document during unload.
      // sendBeacon is queued by the browser and outlives the page; keepalive is
      // the fallback where it is missing or refuses (it returns false when the
      // browser's beacon quota is already spent).
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        try {
          if (navigator.sendBeacon(apiUrl("/api/memory"), new Blob([body], { type: "application/json" }))) return;
        } catch {
          // fall through to the keepalive fetch
        }
      }
      postSnapshot(body, true);
    };

    const unsubscribe = useCatalystStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const body = readSnapshot();
        if (body === null) return;
        postSnapshot(body, false);
      }, SYNC_DEBOUNCE_MS);
    });

    const onPageHide = () => flushSnapshot();
    const onVisibilityChange = () => {
      // The only transition a closing or backgrounded tab is guaranteed to
      // reach on mobile; `pagehide` alone misses an app switch.
      if (document.visibilityState === "hidden") flushSnapshot();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
