import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const animatedButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 overflow-hidden",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "hover:shadow-glow hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.98]",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90 hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.98]",
        ].join(" "),
        outline: [
          "border-2 border-primary/50 bg-transparent text-primary",
          "hover:bg-primary/10 hover:border-primary hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.98]",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80 hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.98]",
        ].join(" "),
        ghost: [
          "text-foreground hover:bg-accent hover:text-accent-foreground",
          "active:scale-[0.98]",
        ].join(" "),
        glow: [
          "bg-primary text-primary-foreground shadow-glow",
          "hover:shadow-glow-intense hover:-translate-y-1",
          "active:translate-y-0 active:scale-[0.98] active:shadow-glow",
        ].join(" "),
        glass: [
          "glass-effect text-foreground",
          "hover:bg-card/90 hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.98]",
        ].join(" "),
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof animatedButtonVariants> {
  asChild?: boolean;
  ripple?: boolean;
  loading?: boolean;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, variant, size, asChild = false, ripple = true, loading = false, children, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
    const rippleIdRef = React.useRef(0);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !loading) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = rippleIdRef.current++;
        
        setRipples(prev => [...prev, { id, x, y }]);
        
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      
      onClick?.(e);
    };

    return (
      <Comp
        className={cn(
          animatedButtonVariants({ variant, size }),
          "transition-all duration-[var(--transition-fast)]",
          loading && "cursor-wait opacity-80",
          className
        )}
        ref={ref}
        onClick={handleClick}
        disabled={loading || props.disabled}
        style={{
          transitionTimingFunction: 'var(--ease-spring)',
        }}
        {...props}
      >
        {/* Ripple effects */}
        {ripples.map(({ id, x, y }) => (
          <span
            key={id}
            className="absolute pointer-events-none bg-white/30 rounded-full animate-[ripple_0.6s_ease-out]"
            style={{
              left: x,
              top: y,
              width: '10px',
              height: '10px',
              marginLeft: '-5px',
              marginTop: '-5px',
            }}
          />
        ))}
        
        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-inherit">
            <svg
              className="w-5 h-5 animate-spin-slow"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        
        {/* Content */}
        <span className={cn("relative z-10 flex items-center gap-2", loading && "invisible")}>
          {children}
        </span>
      </Comp>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton, animatedButtonVariants };
