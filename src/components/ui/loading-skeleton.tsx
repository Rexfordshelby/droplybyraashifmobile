import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-3 w-3 rounded-full flex-shrink-0 mt-1" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3 w-3 rounded-full flex-shrink-0 mt-1" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
      
      <div className="pt-3 border-t space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      
      <div className="pt-3 border-t">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
