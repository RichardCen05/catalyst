"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Canonical "has this hydrated yet" read: false on the server, true on the client. */
const subscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

/**
 * Light/dark switch.
 *
 * The visual state is driven entirely by the `dark:` variants, never by React
 * state, so the server and the first client render emit identical markup and the
 * control cannot flash the wrong mode before hydration. Only `aria-pressed` waits
 * for hydration, because there is no way to express it in CSS — and that attribute
 * is what carries the current mode to assistive tech, since the icons are
 * decorative.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Ganti tema"
      aria-pressed={hydrated ? resolvedTheme === "dark" : undefined}
      className={cn(
        "relative inline-flex h-8 w-[62px] shrink-0 cursor-pointer items-center rounded-[5px] border border-border bg-background p-[3px] transition-colors duration-200 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-[3px] top-[3px] h-6 w-[27px] rounded-[3px] bg-foreground transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] dark:translate-x-[27px]"
      />
      <span aria-hidden="true" className="relative z-10 grid h-6 w-[27px] place-items-center text-background dark:text-muted-foreground">
        <IconSun className="size-3.5" />
      </span>
      <span aria-hidden="true" className="relative z-10 grid h-6 w-[27px] place-items-center text-muted-foreground dark:text-background">
        <IconMoon className="size-3.5" />
      </span>
    </button>
  );
}
