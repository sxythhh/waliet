import { getDualAuthUser } from "@/lib/dual-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MdError, MdPerson, MdEmail, MdVerified, MdStore } from "react-icons/md";

interface PageProps {
  params: Promise<{ experienceId: string }>;
}

export default async function ExampleExperiencePage({ params }: PageProps) {
  const { experienceId } = await params;

  // Get authenticated user (same as experiences page)
  const auth = await getDualAuthUser();

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

  const { user, dbUser } = auth;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-semibold text-foreground">
              Whop Profile Information
            </h1>
            <Badge variant="outline" className="text-xs">
              Experience: {experienceId}
            </Badge>
          </div>
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
                  Member since {new Date(dbUser.createdAt).toLocaleDateString()}
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
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
                  {dbUser.whopUserId || user.providerId}
                </p>
              </div>

              {/* Database ID */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MdStore className="h-4 w-4" />
                  <span>Database ID</span>
                </div>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
                  {dbUser.id}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MdEmail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="text-sm bg-muted px-3 py-2 rounded-md break-all">
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
                  {new Date(dbUser.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Bio */}
            {dbUser.bio && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Bio
                </div>
                <p className="text-sm bg-muted px-3 py-2 rounded-md">
                  {dbUser.bio}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auth Info Card */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-foreground">
              Authentication Info
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Whop Username
              </div>
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                {dbUser.username || "Not set"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Profile Picture URL
              </div>
              <p className="text-xs font-mono bg-muted px-3 py-2 rounded-md break-all">
                {user.avatar || "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Raw Data Card (Debug) */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-foreground">
              Raw Profile Data
            </h3>
            <p className="text-sm text-muted-foreground">
              Full user object from database and Whop auth
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Auth Provider Data:</h4>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Database Record:</h4>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(dbUser, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
