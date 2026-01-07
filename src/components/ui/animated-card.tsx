import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: 'lift' | 'glow' | 'tilt' | 'none';
  glass?: boolean;
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, hover = 'lift', glass = false, children, onMouseMove, onMouseLeave, ...props }, ref) => {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [transform, setTransform] = React.useState('');
    const [glowPosition, setGlowPosition] = React.useState({ x: 50, y: 50 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (hover === 'tilt' && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
        setGlowPosition({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
      }
      
      onMouseMove?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      if (hover === 'tilt') {
        setTransform('');
      }
      onMouseLeave?.(e);
    };

    const hoverClasses = {
      lift: 'hover-lift',
      glow: 'hover-glow hover:border-primary/30',
      tilt: '',
      none: '',
    };

    return (
      <div
        ref={(node) => {
          (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "rounded-xl border bg-card text-card-foreground",
          "transition-all duration-[var(--transition-normal)]",
          glass && "glass-effect",
          hoverClasses[hover],
          className
        )}
        style={{
          transform: hover === 'tilt' ? transform : undefined,
          transitionTimingFunction: 'var(--ease-spring)',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* Glow overlay for tilt effect */}
        {hover === 'tilt' && transform && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none opacity-50"
            style={{
              background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, hsl(var(--primary) / 0.15), transparent 50%)`,
            }}
          />
        )}
        {children}
      </div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

const AnimatedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
AnimatedCardHeader.displayName = "AnimatedCardHeader";

const AnimatedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AnimatedCardTitle.displayName = "AnimatedCardTitle";

const AnimatedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AnimatedCardDescription.displayName = "AnimatedCardDescription";

const AnimatedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
AnimatedCardContent.displayName = "AnimatedCardContent";

const AnimatedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
AnimatedCardFooter.displayName = "AnimatedCardFooter";

export {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
  AnimatedCardFooter,
};
