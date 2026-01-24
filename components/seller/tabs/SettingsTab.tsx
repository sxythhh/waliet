"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Upload,
  Globe,
  Bell,
  Shield,
  Trash2,
} from "lucide-react";

interface SettingsTabProps {
  workspace: {
    id: string;
    name: string;
    logoUrl?: string | null;
    color?: string;
  };
}

export function SettingsTab({ workspace }: SettingsTabProps) {
  const [name, setName] = useState(workspace.name);
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [bookingNotifications, setBookingNotifications] = useState(true);
  const [payoutNotifications, setPayoutNotifications] = useState(true);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Workspace Profile */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Workspace Profile
          </CardTitle>
          <CardDescription>
            Customize your workspace appearance and details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            {workspace.logoUrl ? (
              <img
                src={workspace.logoUrl}
                alt={workspace.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-semibold"
                style={{ backgroundColor: workspace.color || "#8B5CF6" }}
              >
                {workspace.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Change Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, or GIF. Max 2MB.
              </p>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="pl-10"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell clients about your workspace..."
              rows={3}
            />
          </div>

          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Booking Alerts</p>
              <p className="text-xs text-muted-foreground">
                Get notified when you receive a new booking
              </p>
            </div>
            <Switch
              checked={bookingNotifications}
              onCheckedChange={setBookingNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Payout Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get notified about payout status changes
              </p>
            </div>
            <Switch
              checked={payoutNotifications}
              onCheckedChange={setPayoutNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Shield className="w-4 h-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions for your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div>
              <p className="text-sm font-medium">Delete Workspace</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete this workspace and all its data
              </p>
            </div>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
