"use client";

export function SellerProfileView({ userId }: { userId: string }) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Seller Profile</h2>
      <p className="text-muted-foreground">
        View seller profile for user: {userId}
      </p>
    </div>
  );
}
