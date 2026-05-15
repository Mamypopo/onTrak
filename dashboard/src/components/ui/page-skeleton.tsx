import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/app-layout";

// ── Building blocks ────────────────────────────────────────────────────────

function PageHeader({ hasButton = false }: { hasButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      {hasButton && <Skeleton className="h-9 w-32 shrink-0" />}
    </div>
  );
}

function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted px-4 py-3 flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-3 items-center">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-60" />
      <div className="space-y-3 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

// ── Per-page skeletons ─────────────────────────────────────────────────────

export function DashboardIndexSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        <PageHeader hasButton />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export function UsersSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        <PageHeader hasButton />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <TableSkeleton rows={7} cols={5} />
      </div>
    </AppLayout>
  );
}

export function CheckoutsSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        <PageHeader hasButton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    </AppLayout>
  );
}

export function CheckoutDetailSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <CardSkeleton lines={4} />
            <TableSkeleton rows={4} cols={4} />
          </div>
          <div><CardSkeleton lines={3} /></div>
        </div>
      </div>
    </AppLayout>
  );
}

export function MaintenanceSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        <PageHeader hasButton />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export function BulkCommandSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        <PageHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4"><CardSkeleton lines={4} /></div>
          <div className="lg:col-span-2 space-y-4">
            <CardSkeleton lines={3} />
            <CardSkeleton lines={2} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function DeviceDetailSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
      </div>
    </AppLayout>
  );
}

export function SettingsSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 max-w-4xl space-y-6">
        <PageHeader />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <CardSkeleton lines={3} />
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </AppLayout>
  );
}

export function ImportSkeleton() {
  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 max-w-5xl space-y-6">
        <PageHeader />
        <CardSkeleton lines={1} />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
