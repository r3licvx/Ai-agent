import { LEOMA_IDENTITY } from "@/lib/constants";

export function ChatSkeletonLoader() {
  return (
    <div className="space-y-4 px-3 py-4 w-full animate-fade-in select-none pointer-events-none">
      {/* 1. Assistant Greeting Skeleton */}
      <div className="flex items-end gap-2.5 justify-start">
        <div className="size-7 rounded-full bg-primary/20 shrink-0 overflow-hidden relative skeleton-shimmer">
          <img
            src={LEOMA_IDENTITY.avatar}
            alt=""
            className="size-full object-cover opacity-40 grayscale"
          />
        </div>
        <div className="rounded-2xl rounded-bl-xs bg-muted/60 p-3.5 max-w-[75%] sm:max-w-[55%] space-y-2 skeleton-shimmer">
          <div className="h-3.5 w-44 rounded-md bg-foreground/10" />
          <div className="h-3 w-32 rounded-md bg-foreground/10" />
        </div>
      </div>

      {/* 2. User Message Skeleton */}
      <div className="flex items-end gap-2.5 justify-end">
        <div className="rounded-2xl rounded-br-xs bg-primary/15 p-3.5 max-w-[65%] sm:max-w-[45%] space-y-2 skeleton-shimmer">
          <div className="h-3.5 w-36 rounded-md bg-primary/20 ml-auto" />
          <div className="h-3 w-20 rounded-md bg-primary/20 ml-auto" />
        </div>
      </div>

      {/* 3. Assistant Photo Skeleton */}
      <div className="flex items-end gap-2.5 justify-start">
        <div className="size-7 rounded-full bg-primary/20 shrink-0 skeleton-shimmer" />
        <div className="rounded-2xl rounded-bl-xs bg-muted/60 p-2 w-[220px] sm:w-[260px] space-y-2.5 skeleton-shimmer">
          <div className="h-36 w-full rounded-xl bg-foreground/10 flex items-center justify-center">
            <div className="size-8 rounded-full bg-foreground/10" />
          </div>
          <div className="h-3 w-28 rounded-md bg-foreground/10 ml-1 mb-1" />
        </div>
      </div>

      {/* 4. Assistant Reply Skeleton */}
      <div className="flex items-end gap-2.5 justify-start">
        <div className="size-7 rounded-full bg-primary/20 shrink-0 skeleton-shimmer" />
        <div className="rounded-2xl rounded-bl-xs bg-muted/60 p-3.5 max-w-[70%] sm:max-w-[50%] space-y-2 skeleton-shimmer">
          <div className="h-3.5 w-48 rounded-md bg-foreground/10" />
          <div className="h-3 w-36 rounded-md bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}
