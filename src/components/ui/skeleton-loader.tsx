import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text' | 'button' | 'card';
  lines?: number;
}

function Skeleton({ className, variant = 'default', lines = 1, ...props }: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 rounded skeleton",
              i === lines - 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  const variants = {
    default: "h-4 w-full rounded",
    circular: "rounded-full aspect-square",
    text: "h-4 w-3/4 rounded",
    button: "h-10 w-24 rounded-lg",
    card: "h-48 w-full rounded-xl",
  };

  return (
    <div
      className={cn("skeleton", variants[variant], className)}
      {...props}
    />
  );
}

// Pre-built skeleton compositions
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-4", className)}>
      <Skeleton variant="card" className="h-32" />
      <Skeleton variant="text" className="h-5 w-2/3" />
      <Skeleton variant="text" lines={2} />
      <div className="flex gap-2">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Skeleton variant="circular" className="w-12 h-12" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" className="h-4 w-1/3" />
        <Skeleton variant="text" className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton variant="circular" className="w-10 h-10" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="h-4 w-1/2" />
            <Skeleton variant="text" className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="card" className="aspect-square" />
          <Skeleton variant="text" className="h-4 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonProfile, SkeletonList, SkeletonGrid };
