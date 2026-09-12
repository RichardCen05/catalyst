"use client";

import { Bot } from "lucide-react";
import { useCatalystStore } from "@/lib/store";
import type { CopilotContext } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function AskAgentButton({ context, label = "Tanya agent", className, tourAction }: { context: CopilotContext; label?: string; className?: string; tourAction?: string }) {
  const openCopilot = useCatalystStore((state) => state.openCopilot);
  return <Button variant="ghost" size="sm" className={className} onClick={() => openCopilot(context)} aria-label={label} data-tour-action={tourAction}><Bot aria-hidden="true" className="size-3.5" />{label}</Button>;
}
