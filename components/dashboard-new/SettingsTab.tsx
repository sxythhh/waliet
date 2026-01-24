"use client";

import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Shield,
  Moon,
  Sun,
  Globe,
  Mail,
  Smartphone,
  LogOut,
  Trash2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface UserProfile {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string | null;
  bio: string | null;
  createdAt: string;
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
    sessions: Array<{
      id: string;
      device: string;
      location: string;
      lastActive: string;
    }>;
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
    sessions: [
      { id: "1", device: "Current Device", location: "Unknown", lastActive: "Now" },
    ],
  },
};

export function SettingsTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

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

    // Initialize theme from document
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

  const toggleTwoFactor = () => {
    setSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        twoFactor: !prev.security.twoFactor,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Profile</CardTitle>
          </div>
          <CardDescription className="text-xs">Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile.avatar || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                {displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">Avatar synced from your account</p>
            </div>
          </div>

          <Separator />

          {/* Profile Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-xs text-muted-foreground">{displayName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = "/dashboard?tab=profile"}>
                Edit
              </Button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">{profile.email || "Not set"}</p>
              </div>
              {profile.email && (
                <Badge variant="secondary" className="text-[10px]">
                  Verified
                </Badge>
              )}
            </div>

            {profile.sellerProfile && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Timezone</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.sellerProfile.timezone || "America/New_York"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Change
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Sun className="w-4 h-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base">Appearance</CardTitle>
          </div>
          <CardDescription className="text-xs">Customize how Waliet looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Select your preferred theme</p>
            </div>
            <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
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
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription className="text-xs">Choose what you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive emails about your activity</p>
              </div>
            </div>
            <Switch
              checked={settings.notifications.email}
              onCheckedChange={() => toggleNotification("email")}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Push notifications</p>
                <p className="text-xs text-muted-foreground">Receive push notifications on your device</p>
              </div>
            </div>
            <Switch
              checked={settings.notifications.push}
              onCheckedChange={() => toggleNotification("push")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Session reminders</p>
              <p className="text-xs text-muted-foreground">Get reminded before your sessions</p>
            </div>
            <Switch
              checked={settings.notifications.sessionReminders}
              onCheckedChange={() => toggleNotification("sessionReminders")}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Payment alerts</p>
              <p className="text-xs text-muted-foreground">Get notified about payments and refunds</p>
            </div>
            <Switch
              checked={settings.notifications.paymentAlerts}
              onCheckedChange={() => toggleNotification("paymentAlerts")}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Marketing emails</p>
              <p className="text-xs text-muted-foreground">Receive news and promotional content</p>
            </div>
            <Switch
              checked={settings.notifications.marketing}
              onCheckedChange={() => toggleNotification("marketing")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <CardDescription className="text-xs">Protect your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Switch checked={settings.security.twoFactor} onCheckedChange={toggleTwoFactor} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Change password</p>
              <p className="text-xs text-muted-foreground">Update your password</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              Change
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3">Active sessions</p>
            <div className="space-y-2">
              {settings.security.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{session.device}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.location} • {session.lastActive}
                    </p>
                  </div>
                  {session.lastActive === "Now" ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Current
                    </Badge>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription className="text-xs">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Sign out everywhere</p>
              <p className="text-xs text-muted-foreground">Sign out of all devices except this one</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <LogOut className="w-3 h-3" />
              Sign Out All
            </Button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-destructive">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
