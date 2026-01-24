import { redirect } from "next/navigation";
import { getDualAuthUser } from "@/lib/dual-auth";
import { AppProviders } from "@/components/app/AppProviders";

export const metadata = {
  title: "Waliet - Dashboard",
  description: "Manage your time wallet and sessions",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const auth = await getDualAuthUser();

  if (!auth) {
    // Not authenticated - redirect to login
    redirect("/login?next=/app");
  }

  // If user is authenticated via Whop, redirect them to the experiences view
  if (auth.user.provider === "whop") {
    redirect("/experiences");
  }

  return <AppProviders>{children}</AppProviders>;
}
