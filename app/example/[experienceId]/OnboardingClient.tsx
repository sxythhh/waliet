"use client";

import { useState, useEffect } from "react";
import { getOnboardingSections, calculateProgress } from "@/lib/onboarding-steps";
import { CheckCircle2, Loader2, Check } from "lucide-react";

interface UserInfo {
  id: string;
  name?: string | null;
  avatar?: string | null;
  email?: string | null;
  bio?: string | null;
}

interface OnboardingClientProps {
  user: UserInfo;
  initialTheme?: "light" | "dark";
  accountType?: "creator" | "brand" | null;
}

async function loadProgress(): Promise<string[]> {
  try {
    const response = await fetch("/api/onboarding/progress");
    if (!response.ok) return [];
    const data = await response.json();
    return data.completedTasks || [];
  } catch {
    return [];
  }
}

async function toggleTask(taskId: string): Promise<string[]> {
  const response = await fetch("/api/onboarding/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId }),
  });

  if (!response.ok) {
    throw new Error("Failed to toggle task");
  }

  const data = await response.json();
  return data.completedTasks || [];
}

export function OnboardingClient({ user, initialTheme = "dark", accountType = "creator" }: OnboardingClientProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(initialTheme === "dark");

  // Get the appropriate onboarding sections based on account type
  const onboardingSections = getOnboardingSections(accountType);

  useEffect(() => {
    // Listen for Whop theme changes via postMessage
    function handleMessage(event: MessageEvent) {
      // Whop sends theme updates via postMessage
      if (event.data?.type === "whop:theme" || event.data?.theme) {
        const newTheme = event.data.theme || event.data.value;
        if (newTheme === "light" || newTheme === "dark") {
          setIsDark(newTheme === "dark");
        }
      }
    }

    window.addEventListener("message", handleMessage);

    // Also check URL params as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get("theme");
    if (themeParam === "light") {
      setIsDark(false);
    } else if (themeParam === "dark") {
      setIsDark(true);
    }

    // Check for system preference as last fallback
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      // Only use system preference if no explicit theme is set
      if (!urlParams.get("theme")) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("message", handleMessage);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const progressData = await loadProgress();
        setCompletedTasks(new Set(progressData));
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const [togglingTask, setTogglingTask] = useState<string | null>(null);

  const handleToggleTask = async (taskId: string) => {
    // Prevent double-clicks
    if (togglingTask) return;

    setTogglingTask(taskId);

    // Optimistic update
    const previousTasks = new Set(completedTasks);
    const newSet = new Set(completedTasks);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setCompletedTasks(newSet);

    try {
      // Save to server (don't overwrite local state with response)
      await toggleTask(taskId);
    } catch (error) {
      console.error("Failed to toggle task:", error);
      // Revert on error
      setCompletedTasks(previousTasks);
    } finally {
      setTogglingTask(null);
    }
  };

  const progress = calculateProgress(completedTasks, onboardingSections);
  const isComplete = progress.completed === progress.total;

  // Theme-based styles
  const theme = {
    bg: isDark ? "" : "bg-[#f7f7f8]",
    bgStyle: isDark ? {
      background: 'radial-gradient(89.14% 100% at 50% 0%, rgba(251, 191, 36, 0.04) 0%, rgba(251, 191, 36, 0) 100%), #090A0C'
    } : {},
    text: isDark ? "text-white" : "text-[#1a1a1a]",
    textMuted: isDark ? "text-gray-400" : "text-gray-500",
    textSecondary: isDark ? "text-gray-300" : "text-gray-600",
    border: isDark ? "" : "border-[#e5e5e5]",
    cardBg: isDark ? "" : "bg-white",
    cardStyle: isDark ? {
      background: 'radial-gradient(50% 100% at 50% 0%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%), rgba(251, 191, 36, 0.02)',
      border: '1px solid rgba(251, 191, 36, 0.12)',
    } : {},
    progressBg: isDark ? "bg-[#252525]" : "bg-gray-200",
    avatarBg: isDark ? "bg-[#252525]" : "bg-gray-200",
    checkboxBorder: isDark ? "border-[#252525]" : "border-gray-300",
    logo: isDark ? "/Logo%20-%20Gradient%20White.png" : "/Logo%20-%20Gradient.png",
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`} style={{ scrollbarWidth: 'none', ...theme.bgStyle }}>
        <Loader2 className={`h-8 w-8 animate-spin ${theme.textMuted}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center`} style={{ scrollbarWidth: 'none', ...theme.bgStyle }}>
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        body, html, * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>

      {/* Main content - centered */}
      <div className="py-12 px-4 sm:px-6 lg:px-8 w-full max-w-2xl">
        {/* Header - centered */}
        <div className="mb-8 text-center">
          <h1 className={`text-3xl font-bold ${theme.text} mb-2`} style={{ letterSpacing: '-0.4px' }}>
            Welcome{user.name ? `, ${user.name}` : ""}!
          </h1>
          <p style={{ color: '#8e8e8c' }}>
            {accountType === "brand"
              ? "Complete the following steps to launch your first campaign and start working with creators."
              : "Go through the following steps to get started with Content Rewards."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${theme.text}`}>
              Checklist ({progress.completed} of {progress.total} Completed)
            </span>
            <span style={{ color: '#8e8e8c' }} className="text-sm">
              {progress.percentage}%
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress.percentage}%`,
                background: '#FF6207',
                transition: 'width 0.5s ease-out',
              }}
            />
          </div>
        </div>

        {/* Completion banner - centered */}
        {isComplete && (
          <div className="mb-8 flex items-center justify-center gap-2">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)',
              }}
            >
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                All caught up
              </span>
            </div>
          </div>
        )}

        {/* Tasks - single column, centered */}
        <div className="space-y-6">
          {onboardingSections.map((section, sectionIndex) => {
            // Find the first incomplete task for "Take me to..." link
            const firstIncompleteTask = section.tasks.find(task => !completedTasks.has(task.id));

            return (
            <div key={section.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${theme.text}`} style={{ letterSpacing: '-0.4px' }}>
                  {section.title}
                </h2>
                {firstIncompleteTask?.link && (
                  <a
                    href={firstIncompleteTask.link}
                    target="_parent"
                    className="text-sm text-[#8e8e8c] transition-colors hover:text-[#FF6207]"
                  >
                    {firstIncompleteTask.linkText || `Take me to ${firstIncompleteTask.shortTitle || firstIncompleteTask.title}`} →
                  </a>
                )}
              </div>
              <div className="space-y-3">
                {section.tasks.map((task) => {
                  const isCompleted = completedTasks.has(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between rounded-xl ${theme.cardBg} ${theme.border ? `border ${theme.border}` : ''}`}
                      style={{
                        padding: '16px 16px 16px 24px',
                        gap: '16px',
                        ...theme.cardStyle,
                      }}
                    >
                      {/* Left side: Checkbox + Title & Description */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isCompleted
                              ? "bg-[#FF6207] border-[#FF6207]"
                              : `${theme.checkboxBorder} hover:border-[#FF6207]/50`
                          }`}
                          aria-label={
                            isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`
                          }
                        >
                          {isCompleted && <Check className="w-4 h-4 text-white" />}
                        </button>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`font-semibold ${theme.text} ${
                              isCompleted ? "line-through opacity-50" : ""
                            }`}
                            style={{ letterSpacing: '-0.3px' }}
                          >
                            {task.title}
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} ${isCompleted ? "opacity-50" : ""}`}>
                            {task.description}
                          </p>
                        </div>
                      </div>

                      {/* Button - right side */}
                      {!isCompleted && (
                        accountType === "creator" ? (
                          // Creator: clicking marks task as complete
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className="flex-shrink-0 flex items-center justify-center text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                            style={{
                              height: '32px',
                              padding: '0 12px',
                              letterSpacing: '-0.3px',
                              ...(isDark ? {
                                background: 'radial-gradient(50% 100% at 50% 0%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%), rgba(251, 191, 36, 0.24)',
                                border: '1px solid rgba(251, 191, 36, 0.8)',
                              } : {
                                background: '#FF6207',
                                borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                              }),
                            }}
                          >
                            Mark completed
                          </button>
                        ) : task.link ? (
                          // Brand: navigate to link
                          <a
                            href={task.link}
                            target="_parent"
                            className="flex-shrink-0 flex items-center justify-center text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                            style={{
                              height: '32px',
                              padding: '0 12px',
                              letterSpacing: '-0.3px',
                              ...(isDark ? {
                                background: 'radial-gradient(50% 100% at 50% 0%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%), rgba(251, 191, 36, 0.24)',
                                border: '1px solid rgba(251, 191, 36, 0.8)',
                              } : {
                                background: '#FF6207',
                                borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                              }),
                            }}
                          >
                            Mark completed
                          </a>
                        ) : null
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
          })}
        </div>
      </div>

    </div>
  );
}
