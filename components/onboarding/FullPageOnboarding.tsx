"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type AccountType = "creator" | "brand" | null;
type OnboardingStep = "select-type" | "brand-business-info" | "brand-workspace" | "creator-profile";

interface FullPageOnboardingProps {
  onComplete?: (data: OnboardingData) => void;
}

interface OnboardingData {
  accountType: AccountType;
  website?: string;
  referralSource?: string;
  monthlyBudget?: string;
  workspaceName?: string;
  workspaceColor?: string;
}

const REFERRAL_SOURCES = [
  "Google Search",
  "Social Media",
  "Friend or Colleague",
  "YouTube",
  "Podcast",
  "Blog or Article",
  "Other",
];

const MONTHLY_BUDGETS = [
  "Under $1,000",
  "$1,000 - $5,000",
  "$5,000 - $10,000",
  "$10,000 - $25,000",
  "$25,000 - $50,000",
  "$50,000+",
];

export function FullPageOnboarding({ onComplete }: FullPageOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>("select-type");
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [website, setWebsite] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  // Get the current user's ID
  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.dbUser?.id) {
        setUserId(data.dbUser.id);
      }
    };
    fetchUser();
  }, []);

  const handleAccountTypeSelect = (type: AccountType) => {
    setAccountType(type);
    if (type === "brand") {
      setStep("brand-business-info");
    } else if (type === "creator") {
      setStep("creator-profile");
    }
  };

  const saveOnboarding = async (data: {
    accountType: AccountType;
    website?: string;
    referralSource?: string;
    monthlyBudget?: string;
  }) => {
    if (!userId) {
      console.error("No user ID found");
      return;
    }

    const { error } = await supabase
      .from("User")
      .update({
        accountType: data.accountType,
        website: data.website || null,
        referralSource: data.referralSource || null,
        monthlyBudget: data.monthlyBudget || null,
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Failed to save onboarding:", error);
      throw error;
    }
  };

  const handleBrandContinue = async () => {
    if (!monthlyBudget) return;

    setIsSubmitting(true);
    try {
      await saveOnboarding({
        accountType,
        website,
        referralSource,
        monthlyBudget,
      });

      onComplete?.({
        accountType,
        website,
        referralSource,
        monthlyBudget,
      });
    } catch (error) {
      console.error("Error saving onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Account Type Selection
  if (step === "select-type") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/content-rewards-logo.png"
              alt="Content Rewards"
              width={180}
              height={48}
              className="h-12 w-auto"
            />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Welcome to Content Rewards
            </h1>
            <p className="text-gray-400">
              How would you like to use the platform?
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <button
              onClick={() => handleAccountTypeSelect("creator")}
              className="w-full p-5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">I'm a Creator</p>
                  <p className="text-sm text-gray-400">
                    Create content & earn rewards
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAccountTypeSelect("brand")}
              className="w-full p-5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">I'm a Brand</p>
                  <p className="text-sm text-gray-400">
                    Launch campaigns & work with creators
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2 (Brand): Tell us more about your Business
  if (step === "brand-business-info") {
    return (
      <div className="min-h-screen bg-black flex">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12">
          <div className="max-w-md w-full mx-auto lg:mx-0">
            {/* Logo */}
            <div className="mb-12">
              <Image
                src="/content-rewards-logo.png"
                alt="Content Rewards"
                width={180}
                height={48}
                className="h-10 w-auto"
              />
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-10">
              Tell us more about your Business
            </h1>

            {/* Form */}
            <div className="space-y-6">
              {/* Website */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Website</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder=""
                  className="h-12 bg-[#0D0D0D] border-[#202020] text-white placeholder:text-gray-600 focus:border-[#303030] focus:ring-0 rounded-lg"
                />
              </div>

              {/* Where did you hear about us */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Where did you hear about us?</Label>
                <Select value={referralSource} onValueChange={setReferralSource}>
                  <SelectTrigger className="h-12 bg-[#0D0D0D] border-[#202020] text-white text-base focus:border-[#303030] focus:ring-0 rounded-lg">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D0D0D] border-[#202020]">
                    {REFERRAL_SOURCES.map((source) => (
                      <SelectItem
                        key={source}
                        value={source}
                        className="text-white text-base focus:bg-[#202020] focus:text-white"
                      >
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Monthly Budget */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-300">
                  Monthly Budget <span className="text-orange-500">*</span>
                </Label>
                <Select value={monthlyBudget} onValueChange={setMonthlyBudget}>
                  <SelectTrigger className="h-12 bg-[#0D0D0D] border-[#202020] text-white text-base focus:border-[#303030] focus:ring-0 rounded-lg">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D0D0D] border-[#202020]">
                    {MONTHLY_BUDGETS.map((budget) => (
                      <SelectItem
                        key={budget}
                        value={budget}
                        className="text-white text-base focus:bg-[#202020] focus:text-white"
                      >
                        {budget}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Continue Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleBrandContinue}
                  disabled={!monthlyBudget || isSubmitting}
                  className="h-12 px-8 bg-[#FF6207] hover:bg-[#FF6207]/90 text-white font-semibold tracking-[-0.4px] rounded-xl border-t border-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Dashboard Preview */}
        <div className="hidden lg:flex w-1/2 bg-gray-950 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-transparent to-purple-900/20" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
            {/* Generate Attention Badge */}
            <div className="absolute top-1/4 right-12 flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <span className="text-white font-medium">Generate Attention</span>
            </div>

            {/* Dashboard Preview Image */}
            <div className="w-full max-w-lg">
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 shadow-2xl">
                {/* Mini dashboard header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="ml-2 text-xs text-orange-500 font-medium">BETA</span>
                </div>

                {/* Nav */}
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                  </span>
                  <span className="flex items-center gap-1 text-white bg-gray-800 px-2 py-1 rounded">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics
                  </span>
                  <span>Users</span>
                  <span>Payouts</span>
                </div>

                {/* Analytics Title */}
                <div className="mb-4">
                  <h3 className="text-white font-semibold">Analytics</h3>
                  <p className="text-xs text-gray-500">Jan 15 - Jan 24, 2026</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Views
                    </div>
                    <p className="text-xl font-bold text-white">26,029,719</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      Total Payouts
                    </div>
                    <p className="text-xl font-bold text-white">$1,044.67</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      CPM
                    </div>
                    <p className="text-xl font-bold text-white">936</p>
                  </div>
                </div>

                {/* Chart placeholder */}
                <div className="h-24 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path
                      d="M0,80 Q50,70 100,60 T200,50 T300,30 T400,40"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="2"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* 30,000+ Creators Text */}
            <div className="mt-8 text-center">
              <p className="text-3xl font-bold text-white">30,000+ Creators</p>
              <p className="text-gray-400 mt-1">Ready to promote your brand</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step for Creator (placeholder - you can expand this)
  if (step === "creator-profile") {
    const handleCreatorContinue = async () => {
      setIsSubmitting(true);
      try {
        await saveOnboarding({ accountType: "creator" });
        onComplete?.({ accountType: "creator" });
      } catch (error) {
        console.error("Error saving onboarding:", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <Image
            src="/content-rewards-logo.png"
            alt="Content Rewards"
            width={180}
            height={48}
            className="h-12 w-auto mx-auto"
          />
          <h1 className="text-3xl font-semibold text-white">Creator Onboarding</h1>
          <p className="text-gray-400">Coming soon...</p>
          <Button
            onClick={handleCreatorContinue}
            disabled={isSubmitting}
            className="h-12 px-8 bg-[#FF6207] hover:bg-[#FF6207]/90 text-white font-semibold tracking-[-0.4px] rounded-xl border-t border-[#F59E0B]"
          >
            {isSubmitting ? "..." : "Continue to Dashboard"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
