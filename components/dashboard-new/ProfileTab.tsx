"use client";

import { useState, useEffect, useRef } from "react";
import {
  Edit2,
  Star,
  Calendar,
  DollarSign,
  Clock,
  Camera,
  Loader2,
  Link2,
  Check,
  X,
  MapPin,
  Users,
  TrendingUp,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserProfile {
  id: string;
  name: string | null;
  avatar: string | null;
  bannerUrl: string | null;
  email: string | null;
  bio: string | null;
  createdAt: string;
  location: string | null;
  sellerProfile: {
    id: string;
    hourlyRate: number;
    bio: string | null;
    tagline: string | null;
    averageRating: number | null;
    totalSessionsCompleted: number;
    totalReviews: number;
    totalEarnings: number;
    totalClients: number;
    isVerified: boolean;
    isActive: boolean;
  } | null;
}

export function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    location: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copied, setCopied] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/app/profile");

        if (!response.ok) {
          if (response.status === 401) {
            setError("Please sign in to view your profile");
          } else {
            setError("Failed to load profile");
          }
          return;
        }

        const data = await response.json();
        setProfile(data.user);
        setEditForm({
          name: data.user.name || "",
          bio: data.user.bio || data.user.sellerProfile?.bio || "",
          location: data.user.location || "",
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleOpenEditDialog = () => {
    if (profile) {
      setEditForm({
        name: profile.name || "",
        bio: profile.bio || profile.sellerProfile?.bio || "",
        location: profile.location || "",
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/app/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          bio: editForm.bio,
          location: editForm.location,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSaving(false);
      setIsEditDialogOpen(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("banner", file);

      const response = await fetch("/api/app/profile/banner", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) => prev ? { ...prev, bannerUrl: data.bannerUrl } : prev);
      }
    } catch (err) {
      console.error("Error uploading banner:", err);
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  };

  const handleRemoveBanner = async () => {
    if (!profile) return;

    setUploadingBanner(true);
    try {
      const response = await fetch("/api/app/profile/banner", {
        method: "DELETE",
      });

      if (response.ok) {
        setProfile((prev) => prev ? { ...prev, bannerUrl: null } : prev);
      }
    } catch (err) {
      console.error("Error removing banner:", err);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/app/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) => prev ? { ...prev, avatar: data.avatarUrl } : prev);
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleCopyProfileUrl = async () => {
    if (!profile) return;
    const profileUrl = `${window.location.origin}/profile/${profile.id}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error copying URL:", err);
    }
  };

  // Format date for display
  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
        <p className="text-muted-foreground">{error || "Profile not found"}</p>
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
  const displayBio = profile.bio || profile.sellerProfile?.bio || "";
  const displayTagline = profile.sellerProfile?.tagline || "";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header */}
      <Card className="bg-card border-border overflow-hidden">
        {/* Banner - Clickable to upload */}
        <div
          className="h-40 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 relative group cursor-pointer overflow-hidden"
          onClick={() => bannerInputRef.current?.click()}
        >
          {profile.bannerUrl ? (
            <img
              src={profile.bannerUrl}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
          )}

          {/* Upload overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              {uploadingBanner ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  <span>Change Banner</span>
                </>
              )}
            </div>
          </div>

          {/* Remove banner button */}
          {profile.bannerUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveBanner();
              }}
              disabled={uploadingBanner}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
              title="Remove banner"
            >
              {uploadingBanner ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          )}

          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerUpload}
          />
        </div>

        <CardContent className="relative pt-0 pb-6">
          {/* Avatar - Clickable to upload */}
          <div
            className="absolute -top-14 left-6 group cursor-pointer z-10"
            onClick={(e) => {
              e.stopPropagation();
              avatarInputRef.current?.click();
            }}
          >
            <Avatar className="w-28 h-28 border-4 border-background shadow-xl">
              <AvatarImage src={profile.avatar || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {displayName[0]}
              </AvatarFallback>
            </Avatar>

            {/* Upload overlay */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-2 gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 bg-muted/50 hover:bg-muted"
              onClick={handleCopyProfileUrl}
              title="Copy profile URL"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Link2 className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleOpenEditDialog}
            >
              <Edit2 className="w-3 h-3" />
              Edit Profile
            </Button>
          </div>

          {/* Profile Info */}
          <div className="mt-8 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                {profile.sellerProfile?.isVerified && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Check className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              {profile.email && (
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              )}
            </div>

            {displayTagline && (
              <p className="text-sm font-medium text-foreground">{displayTagline}</p>
            )}

            {displayBio ? (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{displayBio}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No bio yet. Click &quot;Edit Profile&quot; to add one.
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {formatMemberSince(profile.createdAt)}
              </span>
            </div>

            {/* Seller Badges */}
            {profile.sellerProfile && (
              <div className="flex flex-wrap gap-2 pt-2">
                {profile.sellerProfile.isActive && (
                  <Badge variant="secondary" className="gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Available
                  </Badge>
                )}
                {profile.sellerProfile.totalSessionsCompleted > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3" />
                    {profile.sellerProfile.totalSessionsCompleted} Sessions
                  </Badge>
                )}
                {profile.sellerProfile.averageRating && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    {profile.sellerProfile.averageRating.toFixed(1)} Rating
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seller Stats */}
      {profile.sellerProfile && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {profile.sellerProfile.totalSessionsCompleted}
                </p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  ${profile.sellerProfile.totalEarnings?.toLocaleString() || "0"}
                </p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {profile.sellerProfile.averageRating?.toFixed(1) || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {profile.sellerProfile.totalClients || 0}
                </p>
                <p className="text-xs text-muted-foreground">Clients</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pricing Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hourly Rate</span>
                  <span className="text-lg font-bold">${profile.sellerProfile.hourlyRate}/hr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Response Time</span>
                  <span className="text-sm font-medium">Usually within 24h</span>
                </div>
              </CardContent>
            </Card>

            {/* Reviews Summary Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Reviews</span>
                  <span className="text-lg font-bold">{profile.sellerProfile.totalReviews}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${((profile.sellerProfile.averageRating || 0) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {profile.sellerProfile.averageRating?.toFixed(1) || "0"}/5
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements/Milestones */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg text-center ${profile.sellerProfile.totalSessionsCompleted >= 1 ? "bg-green-500/10" : "bg-muted/50"}`}>
                  <p className="text-lg font-bold">1st Session</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.sellerProfile.totalSessionsCompleted >= 1 ? "Completed ✓" : "Not yet"}
                  </p>
                </div>
                <div className={`p-3 rounded-lg text-center ${profile.sellerProfile.totalSessionsCompleted >= 10 ? "bg-green-500/10" : "bg-muted/50"}`}>
                  <p className="text-lg font-bold">10 Sessions</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.sellerProfile.totalSessionsCompleted >= 10 ? "Completed ✓" : `${profile.sellerProfile.totalSessionsCompleted}/10`}
                  </p>
                </div>
                <div className={`p-3 rounded-lg text-center ${profile.sellerProfile.totalSessionsCompleted >= 50 ? "bg-green-500/10" : "bg-muted/50"}`}>
                  <p className="text-lg font-bold">50 Sessions</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.sellerProfile.totalSessionsCompleted >= 50 ? "Completed ✓" : `${profile.sellerProfile.totalSessionsCompleted}/50`}
                  </p>
                </div>
                <div className={`p-3 rounded-lg text-center ${(profile.sellerProfile.averageRating || 0) >= 4.5 ? "bg-green-500/10" : "bg-muted/50"}`}>
                  <p className="text-lg font-bold">Top Rated</p>
                  <p className="text-xs text-muted-foreground">
                    {(profile.sellerProfile.averageRating || 0) >= 4.5 ? "Achieved ✓" : "4.5+ rating needed"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border-border">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile.avatar || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                    {editForm.name[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Camera className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Photo is synced from your account</p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="City, Country"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
