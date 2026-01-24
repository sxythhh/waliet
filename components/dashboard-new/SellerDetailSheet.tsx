"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  CheckCircle2,
  MapPin,
  Globe,
  Clock,
  Calendar,
  MessageCircle,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  ExternalLink,
} from "lucide-react";

interface Seller {
  id: string;
  name: string;
  title: string;
  avatar: string | null;
  coverColor: string;
  verified: boolean;
  rating: number;
  reviews: number;
  hourlyRate: number;
  category: string;
  bio: string;
  availability: string;
  availableNow: boolean;
  responseTime: string;
  completedSessions: number;
  repeatClients: number;
  skills: string[];
  languages: string[];
  location: string;
  featured: boolean;
}

interface SellerDetailSheetProps {
  seller: Seller | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate available time slots for booking
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    const time = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
    const time30 = `${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? "PM" : "AM"}`;
    slots.push({ time, available: Math.random() > 0.3 });
    if (hour < 17) {
      slots.push({ time: time30, available: Math.random() > 0.3 });
    }
  }
  return slots;
};

// Generate available dates for the next 7 days
const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      date,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: date.getDate(),
      available: i !== 0 || Math.random() > 0.5, // Today might not be available
    });
  }
  return dates;
};


export function SellerDetailSheet({
  seller,
  open,
  onOpenChange,
}: SellerDetailSheetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState<30 | 60>(60);
  const [message, setMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dates = generateDates();
  const timeSlots = generateTimeSlots();

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);

    // Reset form and close
    setSelectedDate(null);
    setSelectedTime(null);
    setMessage("");
    onOpenChange(false);

    // In a real app, show success toast
    alert("Session booked successfully!");
  };

  if (!seller) return null;

  const totalCost = (sessionDuration / 60) * seller.hourlyRate;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        width="xl"
        className="w-full flex flex-col p-0 overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Cover Image / Gradient */}
          <div className={`relative h-32 bg-gradient-to-r ${seller.coverColor}`}>
            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  }`}
                />
              </button>
              <button className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors">
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="relative px-6 pb-32">
            {/* Avatar */}
            <div className="absolute -top-12 left-6">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={seller.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 text-muted-foreground text-2xl font-semibold">
                  {seller.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Header Info */}
            <div className="pt-16 space-y-4">
              <SheetHeader className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-xl font-bold">
                    {seller.name}
                  </SheetTitle>
                  {seller.verified && (
                    <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{seller.title}</p>
              </SheetHeader>

              {/* Stats Row */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-semibold">{seller.rating}</span>
                  <span className="text-muted-foreground">({seller.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{seller.completedSessions} sessions</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>{seller.repeatClients}% repeat</span>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {seller.bio}
                </p>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {seller.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {seller.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {seller.languages.join(", ")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Responds {seller.responseTime}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Booking Section */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold">Book a Session</h3>

                {/* Session Duration */}
                <div className="space-y-2">
                  <Label className="text-sm">Session Duration</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSessionDuration(30)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        sessionDuration === 30
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      30 min - ${seller.hourlyRate / 2}
                    </button>
                    <button
                      onClick={() => setSessionDuration(60)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        sessionDuration === 60
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      60 min - ${seller.hourlyRate}
                    </button>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">Select Date</Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {dates.map((d) => (
                      <button
                        key={d.dayNum}
                        onClick={() => d.available && setSelectedDate(d.date)}
                        disabled={!d.available}
                        className={`flex-shrink-0 w-16 py-3 rounded-lg text-center transition-all ${
                          selectedDate?.getDate() === d.date.getDate()
                            ? "bg-primary text-primary-foreground shadow-md"
                            : d.available
                            ? "bg-muted text-muted-foreground hover:bg-muted/80"
                            : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wider">{d.dayName}</p>
                        <p className="text-lg font-semibold">{d.dayNum}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div className="space-y-2">
                    <Label className="text-sm">Select Time</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                            selectedTime === slot.time
                              ? "bg-primary text-primary-foreground shadow-md"
                              : slot.available
                              ? "bg-muted text-muted-foreground hover:bg-muted/80"
                              : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed line-through"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="space-y-2">
                  <Label className="text-sm">Message (optional)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share what you'd like to discuss in this session..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Reviews Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Reviews</h3>
                  {seller.reviews > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs text-primary">
                      See all {seller.reviews} reviews
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
                {seller.reviews === 0 ? (
                  <div className="text-center py-6 px-4 bg-muted/30 rounded-lg">
                    <Star className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No reviews yet. Be the first to book a session!
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      <span className="text-lg font-bold">{seller.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({seller.reviews} reviews)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reviews will appear here after sessions are completed
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">${totalCost}</p>
            </div>
            <div className="text-right">
              {selectedDate && selectedTime ? (
                <div className="text-sm">
                  <p className="font-medium">
                    {selectedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-muted-foreground">{selectedTime}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select date & time
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedDate || !selectedTime || isSubmitting}
              onClick={handleBookSession}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {isSubmitting ? "Booking..." : "Book Session"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
