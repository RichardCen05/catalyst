import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The mark reads as a catalysed reaction: an open arc that never closes,
 * with four rising ticks for the four pillars. Knockout glyph so it
 * inverts with the theme without a second asset.
 */
export function CatalystLogo({ className }: { className?: string }) {
  return (
    <span className={cn("relative block size-8 shrink-0 overflow-hidden rounded-lg bg-black", className)} aria-hidden="true">
      <Image src="/catalyst-mark.png" alt="" fill sizes="32px" className="scale-[1.18] object-contain grayscale contrast-125" priority />
    </span>
  );
}
