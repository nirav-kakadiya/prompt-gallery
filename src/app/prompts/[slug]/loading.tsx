export default function PromptLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image skeleton */}
          <div className="aspect-square rounded-xl bg-muted animate-pulse" />

          {/* Content skeleton */}
          <div className="space-y-6">
            {/* Title */}
            <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>

            {/* Tags */}
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-14 bg-muted rounded-full animate-pulse" />
            </div>

            {/* Prompt text */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
              <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Related prompts skeleton */}
        <div className="mt-12">
          <div className="h-6 w-40 bg-muted rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
