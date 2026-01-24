"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MdArrowBack,
  MdAccessTime,
  MdStar,
  MdCalendarToday,
  MdAdd,
  MdClose,
  MdCheck,
  MdWarning,
} from "react-icons/md";
import { cn, formatCents, formatUnitsToHours } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface BookingFormProps {
  experienceId: string;
  seller: {
    id: string;
    name: string | null;
    avatar: string | null;
    sellerProfile: {
      hourlyRate: number;
      averageRating: number | null;
      totalSessionsCompleted: number;
      timezone: string;
      minNoticeHours: number;
    };
  };
  availableUnits: number;
  hasBalance: boolean;
}

const DURATION_OPTIONS = [
  { units: 1, label: "30 min" },
  { units: 2, label: "1 hour" },
  { units: 3, label: "1.5 hours" },
  { units: 4, label: "2 hours" },
];

export function BookingForm({
  experienceId,
  seller,
  availableUnits,
  hasBalance,
}: BookingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [units, setUnits] = useState(2); // Default 1 hour
  const [topic, setTopic] = useState("");
  const [proposedTimes, setProposedTimes] = useState<string[]>([""]);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const maxUnits = Math.min(4, availableUnits);
  const topicLength = topic.trim().length;
  const isTopicValid = topicLength >= 20 && topicLength <= 500;
  const hasValidTimes = proposedTimes.some((t) => t.length > 0);
  const canSubmit = hasBalance && units <= availableUnits && isTopicValid && hasValidTimes && !isSubmitting;

  const addProposedTime = () => {
    if (proposedTimes.length < 5) {
      setProposedTimes([...proposedTimes, ""]);
    }
  };

  const removeProposedTime = (index: number) => {
    if (proposedTimes.length > 1) {
      setProposedTimes(proposedTimes.filter((_, i) => i !== index));
    }
  };

  const updateProposedTime = (index: number, value: string) => {
    const updated = [...proposedTimes];
    updated[index] = value;
    setProposedTimes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Filter out empty times and convert to ISO strings
      const validTimes = proposedTimes
        .filter((t) => t.length > 0)
        .map((t) => new Date(t).toISOString());

      if (validTimes.length === 0) {
        throw new Error("Please select at least one proposed time");
      }

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: seller.id,
          units,
          topic: topic.trim(),
          proposedTimes: validTimes,
          timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create booking request");
      }

      setSuccess(true);
      // Redirect to sessions tab after a moment
      setTimeout(() => {
        router.push(`/experiences/${experienceId}?tab=sessions`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum datetime (minNoticeHours from now)
  const minDateTime = new Date(
    Date.now() + seller.sellerProfile.minNoticeHours * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 16);

  if (success) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
              <MdCheck className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Booking Request Sent
            </h2>
            <p className="text-muted-foreground mb-4">
              Your request has been sent to {seller.name || "the seller"}. They
              will review it and get back to you.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your sessions...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/experiences/${experienceId}/seller/${seller.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <MdArrowBack className="h-4 w-4" />
          Back to profile
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Book a Session</h1>
        <p className="text-muted-foreground mt-1">
          Request a session with {seller.name || "this seller"}
        </p>
      </div>

      {/* Seller Summary Card */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-border">
              <AvatarImage src={seller.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {seller.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {seller.name || "Anonymous"}
              </h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {seller.sellerProfile.averageRating && (
                  <span className="flex items-center gap-1">
                    <MdStar className="h-4 w-4 text-warning" />
                    {seller.sellerProfile.averageRating.toFixed(1)}
                  </span>
                )}
                <span>{seller.sellerProfile.totalSessionsCompleted} sessions</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">
                {formatCents(seller.sellerProfile.hourlyRate)}
              </p>
              <p className="text-xs text-muted-foreground">per hour</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No balance warning */}
      {!hasBalance && (
        <Card variant="bordered" className="mb-6 border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MdWarning className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-foreground">No hours available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You need to purchase hours with this seller before booking a session.
                </p>
                <Link href={`/experiences/${experienceId}/seller/${seller.id}?action=buy`}>
                  <Button size="sm" className="mt-3">
                    Buy Hours
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Form */}
      <form onSubmit={handleSubmit}>
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="text-lg">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Available Balance */}
            {hasBalance && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available balance</span>
                  <span className="font-semibold text-foreground">
                    {formatUnitsToHours(availableUnits)}
                  </span>
                </div>
              </div>
            )}

            {/* Duration Selector */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Duration</Label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((option) => {
                  const isDisabled = option.units > maxUnits;
                  const isSelected = units === option.units;
                  return (
                    <button
                      key={option.units}
                      type="button"
                      disabled={isDisabled || !hasBalance}
                      onClick={() => setUnits(option.units)}
                      className={cn(
                        "py-3 px-2 rounded-lg border text-sm font-medium transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/50",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {units > availableUnits && hasBalance && (
                <p className="text-xs text-destructive mt-2">
                  You only have {formatUnitsToHours(availableUnits)} available
                </p>
              )}
            </div>

            <Separator />

            {/* Topic */}
            <div>
              <Label htmlFor="topic" className="text-sm font-medium mb-2 block">
                What do you want to discuss?
              </Label>
              <Textarea
                id="topic"
                placeholder="Describe what you'd like to cover in this session. Be specific about your goals and questions..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
                maxLength={500}
                disabled={!hasBalance}
                className="resize-none"
              />
              <div className="flex justify-between mt-2">
                <p
                  className={cn(
                    "text-xs",
                    topicLength < 20 ? "text-muted-foreground" : "text-success"
                  )}
                >
                  {topicLength < 20
                    ? `${20 - topicLength} more characters needed`
                    : "Looking good!"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topicLength}/500
                </p>
              </div>
            </div>

            <Separator />

            {/* Proposed Times */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Propose times that work for you
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                The seller is in {seller.sellerProfile.timezone}. Add up to 5 options.
              </p>
              <div className="space-y-2">
                {proposedTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <MdCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="datetime-local"
                        value={time}
                        onChange={(e) => updateProposedTime(index, e.target.value)}
                        min={minDateTime}
                        disabled={!hasBalance}
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50"
                      />
                    </div>
                    {proposedTimes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProposedTime(index)}
                        disabled={!hasBalance}
                        className="h-11 w-11"
                      >
                        <MdClose className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {proposedTimes.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProposedTime}
                  disabled={!hasBalance}
                  className="mt-2 gap-1"
                >
                  <MdAdd className="h-4 w-4" />
                  Add another time
                </Button>
              )}
            </div>

            <Separator />

            {/* Timezone */}
            <div>
              <Label htmlFor="timezone" className="text-sm font-medium mb-2 block">
                Your timezone
              </Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!hasBalance}
                className="w-full h-11 px-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50"
              >
                {Intl.supportedValuesOf("timeZone").map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <MdAccessTime className="h-4 w-4" />
                    Request {formatUnitsToHours(units)} Session
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                {formatUnitsToHours(units)} will be reserved from your balance until the
                seller responds
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
