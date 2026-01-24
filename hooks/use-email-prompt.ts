"use client";

import { useState, useEffect } from "react";

interface UseEmailPromptOptions {
  userEmail: string | null;
  isWhopUser: boolean;
  skip?: boolean; // Allow parent to skip the prompt
}

/**
 * Hook to determine if user should be prompted for email
 *
 * Shows prompt when:
 * - User is authenticated via Whop (app view)
 * - User doesn't have an email in database
 *
 * The prompt will appear every time until the user provides their email.
 */
export function useEmailPrompt({
  userEmail,
  isWhopUser,
  skip = false,
}: UseEmailPromptOptions) {
  const [shouldPrompt, setShouldPrompt] = useState(false);

  useEffect(() => {
    // Don't prompt if explicitly skipped by parent
    if (skip) {
      setShouldPrompt(false);
      return;
    }

    // Only prompt Whop users without email
    if (!isWhopUser || userEmail) {
      setShouldPrompt(false);
      return;
    }

    // Show prompt after a brief delay (better UX)
    const timer = setTimeout(() => {
      setShouldPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [userEmail, isWhopUser, skip]);

  const dismissPrompt = () => {
    setShouldPrompt(false);
  };

  return {
    shouldPrompt,
    dismissPrompt,
  };
}
