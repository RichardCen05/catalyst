import { cn } from "@/lib/utils";

export function CatalystLogo({ className }: { className?: string }) {
  return (
    <svg className={cn("size-8", className)} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="currentColor" opacity="0.12" />
      <path d="M23.5 9.5A9 9 0 1 0 23.5 22.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M19 8v5M22 10v7M25 13v8M28 16v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
