import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
    {
        variants: {
            variant: {
                primary:
                    "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/20 border-b-4 border-[var(--primary-border)] active:border-b-0 active:translate-y-1",
                secondary:
                    "bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] text-gray-200 border-b-4 border-[var(--secondary-border)] active:border-b-0 active:translate-y-1",
                outline:
                    "border-2 border-neutral-600 hover:border-neutral-400 text-neutral-300 hover:text-white",
                ghost: "hover:bg-neutral-800 text-neutral-400 hover:text-white",
            },
            size: {
                sm: "px-3 py-1.5 text-sm",
                md: "px-6 py-3 text-base",
                lg: "px-8 py-4 text-xl",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    }
);

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
