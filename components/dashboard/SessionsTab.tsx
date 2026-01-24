"use client";

interface SessionsTabProps {
  sessions?: any;
  isLoading?: boolean;
}

export function SessionsTab({ sessions, isLoading }: SessionsTabProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Your Sessions</h2>
      <p className="text-muted-foreground">
        View your upcoming and past sessions.
      </p>
      {isLoading && <p className="mt-4">Loading...</p>}
    </div>
  );
}
