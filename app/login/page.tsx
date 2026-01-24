import { getDualAuthUser } from "@/lib/dual-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

interface PageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { error, next } = await searchParams;

  // If already authenticated, redirect to browse
  const auth = await getDualAuthUser();
  if (auth) {
    redirect(next || "/browse");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-background">
        <LoginForm error={error} redirectTo={next || "/browse"} />
      </div>
    </div>
  );
}
