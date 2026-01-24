import { getDualAuthUser } from "@/lib/dual-auth";
import { checkExperienceAccess } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { EmailPromptWrapper } from "@/components/auth/EmailPromptWrapper";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ experienceId: string }>;
}

export default async function ExampleLayout({
  children,
  params,
}: LayoutProps) {
  const { experienceId } = await params;

  // Get authenticated user (handles token verification + profile sync)
  const auth = await getDualAuthUser();

  if (!auth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Authentication Required
            </h1>
            <p className="text-muted-foreground">
              Please access this page through your Whop community.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check access to this experience
  const hasAccess = await checkExperienceAccess(experienceId, auth.user.providerId);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              You don&apos;t have access to this experience.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Simple layout without DashboardLayout - just render children
  return (
    <EmailPromptWrapper
      userEmail={auth.dbUser.email}
      userId={auth.dbUser.id}
      isWhopUser={auth.user.provider === "whop"}
    >
      {children}
    </EmailPromptWrapper>
  );
}
