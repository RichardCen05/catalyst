"use client";

import { ThemeProvider } from "next-themes";
import * as Tooltip from "@radix-ui/react-tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="catalyst:theme">
      <Tooltip.Provider delayDuration={250}>{children}</Tooltip.Provider>
    </ThemeProvider>
  );
}
