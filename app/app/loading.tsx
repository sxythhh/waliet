import { Card, CardContent } from "@/components/ui/card";

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar Skeleton */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="hidden md:flex w-24" />
          <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 mt-2 bg-muted rounded animate-pulse" />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} variant="bordered">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile Nav Skeleton */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-3 py-2">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-3 w-10 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
