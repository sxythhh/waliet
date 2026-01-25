import { headers } from "next/headers";
import { getDualAuthUser } from "@/lib/dual-auth";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle } from "lucide-react";
import { OnboardingClient } from "./OnboardingClient";

export const dynamic = "force-dynamic";

async function getWhopTheme(): Promise<"light" | "dark"> {
  const headersList = await headers();
  const theme = headersList.get("x-whop-theme");
  return theme === "light" ? "light" : "dark";
}

export default async function ExamplePage() {
  const [auth, initialTheme] = await Promise.all([
    getDualAuthUser(),
    getWhopTheme(),
  ]);

  if (!auth) {
    return (
      <div className={`min-h-screen ${initialTheme === 'dark' ? 'bg-[#111111]' : 'bg-[#f7f7f8]'} p-4 sm:p-6 md:p-8 flex items-center justify-center`}>
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
    <OnboardingClient
      user={{
        id: dbUser.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
        bio: dbUser.bio,
      }}
      initialTheme={initialTheme}
      accountType={dbUser.accountType as "creator" | "brand" | null}
    />
  );
}
