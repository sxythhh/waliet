"use client";

import { useEmailPrompt } from "@/hooks/use-email-prompt";
import { LinkAccountModal } from "./LinkAccountModal";

interface EmailPromptWrapperProps {
  children: React.ReactNode;
  userEmail: string | null;
  userId: string;
  isWhopUser: boolean;
  skip?: boolean;
}

/**
 * Wrapper component that prompts Whop app view users to add their email
 * for account linking and web access
 */
export function EmailPromptWrapper({
  children,
  userEmail,
  userId,
  isWhopUser,
  skip = false,
}: EmailPromptWrapperProps) {
  const { shouldPrompt, dismissPrompt } = useEmailPrompt({
    userEmail,
    isWhopUser,
    skip,
  });

  return (
    <>
      {children}
      <LinkAccountModal
        isOpen={shouldPrompt}
        onClose={dismissPrompt}
        userId={userId}
      />
    </>
  );
}
