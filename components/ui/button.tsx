import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100",
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:shadow-[0_0_0_3px_var(--muted)]",
        secondary: "border border-border-strong bg-background text-foreground hover:shadow-[0_0_0_3px_var(--muted)]",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "border border-foreground bg-background text-foreground hover:bg-muted",
      },
      size: { default: "h-11", sm: "h-9 min-h-9 px-3 text-sm", icon: "size-11 px-0" },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
