import { Skeleton } from "@/components/ui/skeleton"

const MetricCardSkeleton = () => {
  return (
    <div className="relative overflow-hidden bg-white p-6">
      <div className="absolute top-0 right-0 p-4">
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="mt-4">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

const TimeSectionSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <div className="h-[1px] flex-1 mx-4 bg-slate-200" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    </div>
  )
}

const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-8">
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-1 bg-blue-500 rounded-full" />
            <div>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-48 mt-1" />
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <TimeSectionSkeleton />
          <TimeSectionSkeleton />
          <TimeSectionSkeleton />
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton