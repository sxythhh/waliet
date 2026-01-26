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

  const handleToggleTask = async (taskId: string) => {
    try {
      // Optimistic update
      const newSet = new Set(completedTasks);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      setCompletedTasks(newSet);

      // Save to server
      const updated = await toggleTask(taskId);
      setCompletedTasks(new Set(updated));
    } catch (error) {
      console.error("Failed to toggle task:", error);
      // Revert on error
      const progress = await loadProgress();
      setCompletedTasks(new Set(progress));
    }
  };

  const progress = calculateProgress(completedTasks, onboardingSections);
  const isComplete = progress.completed === progress.total;

  // Theme-based styles
  const theme = {
    bg: isDark ? "bg-[#111111]" : "bg-[#f7f7f8]",
    text: isDark ? "text-white" : "text-[#1a1a1a]",
    textMuted: isDark ? "text-gray-400" : "text-gray-500",
    textSecondary: isDark ? "text-gray-300" : "text-gray-600",
    border: isDark ? "border-[#252525]" : "border-[#e5e5e5]",
    cardBg: isDark ? "bg-[#191919]" : "bg-white",
    progressBg: isDark ? "bg-[#252525]" : "bg-gray-200",
    avatarBg: isDark ? "bg-[#252525]" : "bg-gray-200",
    checkboxBorder: isDark ? "border-[#252525]" : "border-gray-300",
    logo: isDark ? "/Logo%20-%20Gradient%20White.png" : "/Logo%20-%20Gradient.png",
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`} style={{ scrollbarWidth: 'none' }}>
        <Loader2 className={`h-8 w-8 animate-spin ${theme.textMuted}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center`} style={{ scrollbarWidth: 'none' }}>
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
          <p className={theme.textSecondary}>
            {accountType === "brand"
              ? "Complete the following steps to launch your first campaign and start working with creators."
              : "Go through the following steps to get started with Content Rewards."}
          </p>
        </div>

        {/* Progress bar - centered */}
        <div className="mb-8 space-y-1.5 mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${theme.textSecondary}`}>
              Checklist ({progress.completed} of {progress.total} Completed)
            </span>
            <span className={`text-xs ${theme.textMuted}`}>{progress.percentage}%</span>
          </div>
          <div className={`w-full ${theme.progressBg} rounded-full h-1.5 overflow-hidden`}>
            <div
              className="bg-[#FF6207] h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Completion banner - centered */}
        {isComplete && (
          <div className={`mb-8 p-3 ${theme.cardBg} border border-[#FF6207]/30 rounded-lg flex items-center justify-center gap-3`}>
            <CheckCircle2 className="w-5 h-5 text-[#FF6207] flex-shrink-0" />
            <div>
              <p className="font-semibold text-orange-500 text-sm">
                All caught up
              </p>
              <p className={`text-xs ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
                You&apos;ve completed all onboarding steps!
              </p>
            </div>
          </div>
        )}

        {/* Tasks - single column, centered */}
        <div className="space-y-6">
          {onboardingSections.map((section) => (
            <div key={section.id}>
              <h2 className={`text-lg font-bold ${theme.text} mb-4 text-center`} style={{ letterSpacing: '-0.4px' }}>
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.tasks.map((task) => {
                  const isCompleted = completedTasks.has(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-4 p-4 rounded-xl ${theme.cardBg} border ${theme.border}`}
                    >
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

                      {/* Button - same row */}
                      {!isCompleted && (
                        accountType === "creator" ? (
                          // Creator: clicking marks task as complete
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className="flex-shrink-0 px-4 py-2 bg-[#FF6207] text-white text-sm font-semibold rounded-lg hover:bg-[#FF6207]/90 transition-colors"
                            style={{ letterSpacing: '-0.3px' }}
                          >
                            Get started
                          </button>
                        ) : task.link ? (
                          // Brand: navigate to link
                          <a
                            href={task.link}
                            target="_parent"
                            className="flex-shrink-0 px-4 py-2 bg-[#FF6207] text-white text-sm font-semibold rounded-lg hover:bg-[#FF6207]/90 transition-colors"
                            style={{ letterSpacing: '-0.3px' }}
                          >
                            Get started
                          </a>
                        ) : null
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
