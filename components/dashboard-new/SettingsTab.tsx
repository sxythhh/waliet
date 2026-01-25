"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Moon,
  Sun,
  Mail,
  Smartphone,
  LogOut,
  Trash2,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { SettingsCard } from "./settings";

interface UserProfile {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string | null;
  bio: string | null;
  createdAt: string;
  whopUserId: string | null;
  supabaseUserId: string | null;
  sellerProfile: {
    id: string;
    timezone: string;
  } | null;
}

interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    sessionReminders: boolean;
    paymentAlerts: boolean;
  };
  security: {
    twoFactor: boolean;
  };
}

const defaultSettings: Settings = {
  notifications: {
    email: true,
    push: true,
    marketing: false,
    sessionReminders: true,
    paymentAlerts: true,
  },
  security: {
    twoFactor: false,
  },
};

export function SettingsTab() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [linkMessage, setLinkMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Handle URL params for link results
  useEffect(() => {
    const success = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (success) {
      const messages: Record<string, string> = {
        account_linked: "Account linked successfully!",
        accounts_merged: "Accounts merged successfully! Your data has been combined.",
        already_linked: "This account is already linked.",
      };
      setLinkMessage({ type: "success", text: messages[success] || "Success!" });

      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());
    } else if (errorParam) {
      const messages: Record<string, string> = {
        already_linked: "This account is already linked to your profile.",
        link_expired: "Link session expired. Please try again.",
        oauth_failed: "OAuth authentication failed. Please try again.",
        merge_failed: "Failed to merge accounts. Please contact support.",
        link_failed: "Failed to link account. Please try again.",
        no_oauth_data: "No authentication data received. Please try again.",
      };
      setLinkMessage({ type: "error", text: messages[errorParam] || "An error occurred." });

      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      url.searchParams.delete("provider");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Fetch user profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/app/profile");

        if (!response.ok) {
          if (response.status === 401) {
            setError("Please sign in to view settings");
          } else {
            setError("Failed to load settings");
          }
          return;
        }

        const data = await response.json();
        setProfile(data.user);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();

    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleNotification = (key: keyof Settings["notifications"]) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">{error || "Failed to load settings"}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  const displayName = profile.name || "User";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Link message banner */}
      {linkMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            linkMessage.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-500"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {linkMessage.type === "success" ? (
              <Check className="w-4 h-4" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
              {linkMessage.text}
            </p>
          </div>
          <button
            onClick={() => setLinkMessage(null)}
            className="text-current hover:opacity-70 transition-opacity"
          >
            ×
          </button>
        </div>
      )}

      {/* Profile Card */}
      <SettingsCard
        title="Profile"
        description="Your personal information and avatar"
        footerHint="Avatar is synced from your connected account."
      >
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile.avatar || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xl">
              {displayName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
              {profile.email || "No email set"}
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Email Card */}
      <SettingsCard
        title="Your Email"
        description="This is the email used for notifications and account recovery"
        footerHint="Contact support to change your email address."
      >
        <Input
          type="email"
          value={profile.email || ""}
          disabled
          className="h-11 max-w-md bg-background border border-border"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        />
      </SettingsCard>

      {/* Linked Accounts - Google */}
      <SettingsCard
        title="Google Account"
        description="Link your Google account for additional sign-in options"
        footerHint={profile.supabaseUserId ? "Your Google account is connected." : "Connect to sign in with Google."}
      >
        <div className="flex items-center justify-between max-w-md h-11 px-3 bg-background border border-border rounded-md">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
              {profile.supabaseUserId ? "Connected" : "Not connected"}
            </span>
          </div>
          {profile.supabaseUserId ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Check className="w-3 h-3" />
              Linked
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => window.location.href = "/api/auth/link?provider=google"}
            >
              <ExternalLink className="w-3 h-3" />
              Link
            </Button>
          )}
        </div>
      </SettingsCard>

      {/* Linked Accounts - Whop */}
      <SettingsCard
        title="Whop Account"
        description="Link your Whop account to access community features"
        footerHint={profile.whopUserId ? "Your Whop account is connected." : "Connect to access Whop features."}
      >
        <div className="flex items-center justify-between max-w-md h-11 px-3 bg-background border border-border rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#FF6243] flex items-center justify-center">
              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <span className="text-sm" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
              {profile.whopUserId ? "Connected" : "Not connected"}
            </span>
          </div>
          {profile.whopUserId ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Check className="w-3 h-3" />
              Linked
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => window.location.href = "/api/auth/link?provider=whop"}
            >
              <ExternalLink className="w-3 h-3" />
              Link
            </Button>
          )}
        </div>
      </SettingsCard>

      {/* Appearance Card */}
      <SettingsCard
        title="Appearance"
        description="Customize how Waliet looks on your device"
        footerHint={`Currently using ${theme} mode.`}
      >
        <div className="flex items-center gap-2 p-1 rounded-lg bg-muted w-fit">
          <button
            onClick={() => handleThemeChange("light")}
            className={`p-2 rounded-md transition-colors ${
              theme === "light" ? "bg-background shadow-sm" : "hover:bg-background/50"
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleThemeChange("dark")}
            className={`p-2 rounded-md transition-colors ${
              theme === "dark" ? "bg-background shadow-sm" : "hover:bg-background/50"
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>
      </SettingsCard>

      {/* Notifications Card */}
      <SettingsCard
        title="Notifications"
        description="Choose how you want to be notified about activity"
        footerHint="Configure your notification preferences."
      >
        <div className="space-y-0 max-w-md">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                  Email notifications
                </p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                  Receive emails about your activity
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notifications.email}
              onCheckedChange={() => toggleNotification("email")}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                  Push notifications
                </p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                  Receive push notifications on your device
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notifications.push}
              onCheckedChange={() => toggleNotification("push")}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Session reminders
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Get reminded before your sessions
              </p>
            </div>
            <Switch
              checked={settings.notifications.sessionReminders}
              onCheckedChange={() => toggleNotification("sessionReminders")}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Payment alerts
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Get notified about payments and refunds
              </p>
            </div>
            <Switch
              checked={settings.notifications.paymentAlerts}
              onCheckedChange={() => toggleNotification("paymentAlerts")}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Marketing emails
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Receive news and promotional content
              </p>
            </div>
            <Switch
              checked={settings.notifications.marketing}
              onCheckedChange={() => toggleNotification("marketing")}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Security Card */}
      <SettingsCard
        title="Security"
        description="Protect your account with additional security measures"
        footerHint="Keep your account secure."
      >
        <div className="space-y-0 max-w-md">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Two-factor authentication
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Add an extra layer of security
              </p>
            </div>
            <Switch
              checked={settings.security.twoFactor}
              onCheckedChange={() => setSettings(prev => ({
                ...prev,
                security: { ...prev.security, twoFactor: !prev.security.twoFactor }
              }))}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Change password
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
                Update your password regularly
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Change
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* Sign Out Everywhere Card */}
      <SettingsCard
        title="Sign Out Everywhere"
        description="Sign out of all devices except this one"
        footerHint="This will end all other active sessions."
      >
        <Button variant="outline" size="sm" className="gap-2">
          <LogOut className="w-3 h-3" />
          Sign Out All Devices
        </Button>
      </SettingsCard>

      {/* Delete Account Card */}
      <SettingsCard
        title="Delete Account"
        description="Permanently delete your account and all associated data"
        footerHint="This action cannot be undone."
        variant="danger"
      >
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="w-3 h-3" />
          Delete Account
        </Button>
      </SettingsCard>
    </div>
  );
}
