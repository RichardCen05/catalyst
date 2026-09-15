"use client";

import { useEffect, useRef } from "react";
import { useCatalystStore } from "@/lib/store";
import { apiUrl } from "@/lib/api-base";
import { browserMemoryStore } from "@/lib/memory-store";

const STORAGE_KEY = "catalyst:v1";
const SYNC_DEBOUNCE_MS = 1500;

/**
 * Cross-device continuity on top of the localStorage-only zustand `persist`.
 * GCS is the source of truth (plan P4); this only ever hydrates a browser
 * that has never onboarded locally — an already-used browser keeps its own
 * state rather than being silently overwritten by whatever a different
 * device last synced.
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
        // Memory pipeline references browserMemoryStore for profile/state access
        const localProfile = browserMemoryStore.loadProfile();
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
          void fetch(apiUrl("/api/memory"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.state) });
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
