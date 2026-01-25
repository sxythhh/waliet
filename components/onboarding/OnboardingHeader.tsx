"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OnboardingHeaderProps {
  userName?: string | null;
  userAvatar?: string | null;
}

export function OnboardingHeader({ userName, userAvatar }: OnboardingHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={userAvatar || undefined} />
          <AvatarFallback>{userName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Welcome{userName ? `, ${userName}` : ""}!
      </h1>
      <p className="text-muted-foreground">
        Go through the following steps to get started with Waliet.
      </p>
    </div>
  );
}
