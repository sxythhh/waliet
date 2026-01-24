import { getDualAuthUser } from "@/lib/dual-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExamplePage() {
  const auth = await getDualAuthUser();

  if (!auth) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
        <EmptyState
          icon={AlertCircle}
          title="Authentication Required"
          description="Please access this page through your Whop community."
        />
      </div>
    );
  }

  const { user, dbUser } = auth;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback>
                  {user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {user.name || "Anonymous User"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Authenticated via {user.provider}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  User ID
                </div>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                  {user.id}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Email
                </div>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                  {user.email || "Not available"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Provider
                </div>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                  {user.provider}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Provider ID
                </div>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                  {user.providerId}
                </p>
              </div>
            </div>

            {dbUser.sellerProfile && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-3">Seller Profile</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Hourly Rate:</span>{" "}
                    ${(dbUser.sellerProfile.hourlyRate / 100).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sessions:</span>{" "}
                    {dbUser.sellerProfile.totalSessionsCompleted}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reviews:</span>{" "}
                    {dbUser.sellerProfile.totalReviews}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verified:</span>{" "}
                    {dbUser.sellerProfile.isVerified ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
