export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse shrink-0" />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden">
              <div className="aspect-4/3 bg-muted animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-5 w-14 bg-muted rounded-full animate-pulse" />
                  <div className="h-5 w-12 bg-muted rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
