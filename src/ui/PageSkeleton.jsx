import Skeleton from "./Skeleton";

/** Full-page branded skeleton, shown while a lazy route loads. */
export default function PageSkeleton() {
  return (
    <div className="bg-sand-50 pb-16 pt-32 md:pt-40" role="status" aria-label="Loading page">
      <div className="shell">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-5 h-12 w-full max-w-2xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />
        <Skeleton className="mt-2 h-5 w-2/3 max-w-lg" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="card h-44">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-4 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
          </div>
          <div className="card hidden h-44 md:block">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-4 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/6" />
          </div>
          <div className="card hidden h-44 md:block">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-4 h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}