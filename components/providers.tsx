"use client";

import { ThemeProvider } from "next-themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { MemorySync } from "@/components/memory-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="catalyst:theme">
      <Tooltip.Provider delayDuration={250}>
        <MemorySync />
        {children}
      </Tooltip.Provider>
    </ThemeProvider>
  );
}
