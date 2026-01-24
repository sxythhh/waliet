"use client";

interface BrowseTabProps {
  sellers?: any;
  isLoading?: boolean;
}

export function BrowseTab({ sellers, isLoading }: BrowseTabProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Browse Sellers</h2>
      <p className="text-muted-foreground">
        Browse available time sellers and book sessions.
      </p>
      {isLoading && <p className="mt-4">Loading...</p>}
    </div>
  );
}
