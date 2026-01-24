import { getAuthenticatedUser } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MdError, MdPerson, MdEmail, MdVerified } from "react-icons/md";

export default async function ExamplePage() {
  // Get authenticated user (same as experiences page)
  const auth = await getAuthenticatedUser();

  if (!auth) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
        <EmptyState
          icon={MdError}
          title="Authentication Required"
          description="Please access this page through your Whop community."
        />
      </div>
    );
  }

  const { user } = auth;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Whop Profile Information
          </h1>
          <p className="text-muted-foreground">
            Your profile data synced from Whop
          </p>
        </div>

        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar || undefined} alt={user.name || "User"} />
                <AvatarFallback className="text-2xl">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {user.name || "Anonymous User"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Whop User ID */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MdPerson className="h-4 w-4" />
                  <span>Whop User ID</span>
                </div>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                  {user.whopUserId}
                </p>
              </div>

              {/* Database ID */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MdPerson className="h-4 w-4" />
                  <span>Database ID</span>
                </div>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                  {user.id}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MdEmail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="text-sm bg-muted px-3 py-2 rounded-md">
                  {user.email || "Not provided"}
                </p>
              </div>

              {/* Created At */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MdVerified className="h-4 w-4" />
                  <span>Account Created</span>
                </div>
                <p className="text-sm bg-muted px-3 py-2 rounded-md">
                  {new Date(user.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Bio
                </div>
                <p className="text-sm bg-muted px-3 py-2 rounded-md">
                  {user.bio}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Profile Card */}
        {user.sellerProfile ? (
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-foreground">
                Seller Profile
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Hourly Rate
                  </div>
                  <p className="text-2xl font-semibold text-accent">
                    ${(user.sellerProfile.hourlyRate / 100).toFixed(2)}/hr
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Average Rating
                  </div>
                  <p className="text-2xl font-semibold text-foreground">
                    {user.sellerProfile.averageRating?.toFixed(1) || "N/A"}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Sessions Completed
                  </div>
                  <p className="text-2xl font-semibold text-foreground">
                    {user.sellerProfile.totalSessionsCompleted}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Reviews
                  </div>
                  <p className="text-2xl font-semibold text-foreground">
                    {user.sellerProfile.totalReviews}
                  </p>
                </div>
              </div>

              {user.sellerProfile.tagline && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Tagline
                  </div>
                  <p className="text-sm bg-muted px-3 py-2 rounded-md">
                    {user.sellerProfile.tagline}
                  </p>
                </div>
              )}

              {user.sellerProfile.bio && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Seller Bio
                  </div>
                  <p className="text-sm bg-muted px-3 py-2 rounded-md whitespace-pre-wrap">
                    {user.sellerProfile.bio}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No seller profile found. Set up a seller profile to start offering your time.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Raw Data Card (Debug) */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-foreground">
              Raw Profile Data
            </h3>
            <p className="text-sm text-muted-foreground">
              Full user object from database
            </p>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
