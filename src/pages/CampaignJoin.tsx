import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  guidelines: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  allowed_platforms: string[];
  application_questions: string[];
  slug: string;
}

interface ApplicationForm {
  platform: string;
  content_url: string;
  answers: Record<number, string>;
}

export default function CampaignJoin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ApplicationForm>();

  useEffect(() => {
    fetchCampaign();
  }, [slug]);

  const fetchCampaign = async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Campaign not found or inactive");
        return;
      }

      // Parse application_questions from JSON to array
      const parsedData = {
        ...data,
        application_questions: Array.isArray(data.application_questions) 
          ? data.application_questions 
          : []
      };

      setCampaign(parsedData as Campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ApplicationForm) => {
    if (!campaign) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to apply");
        navigate("/auth");
        return;
      }

      // Prepare answers as JSON
      const answersJson = campaign.application_questions.map((question, index) => ({
        question,
        answer: data.answers[index] || ""
      }));

      const { error } = await supabase
        .from("campaign_submissions")
        .insert({
          campaign_id: campaign.id,
          creator_id: user.id,
          platform: data.platform,
          content_url: data.content_url,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Campaign not found</div>
          <Button onClick={() => navigate("/discover")} className="bg-primary">
            Browse Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#191919]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/discover")}
            className="text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discover
          </Button>
        </div>

        {/* Campaign Banner */}
        {campaign.banner_url && (
          <div className="mb-6 rounded-2xl overflow-hidden">
            <img
              src={campaign.banner_url}
              alt={campaign.title}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Campaign Details */}
        <Card className="bg-[#202020] border-none mb-6">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              {campaign.brand_logo_url && (
                <img
                  src={campaign.brand_logo_url}
                  alt={campaign.brand_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{campaign.title}</h1>
                <p className="text-white/60 text-lg">{campaign.brand_name}</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Active
              </Badge>
            </div>

            {campaign.description && (
              <p className="text-white/80 mb-6">{campaign.description}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#191919] rounded-lg">
              <div>
                <div className="text-white/60 text-sm mb-1">Budget</div>
                <div className="text-2xl font-bold text-white">
                  ${campaign.budget.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-1">RPM Rate</div>
                <div className="text-2xl font-bold text-white flex items-center gap-2">
                  ${campaign.rpm_rate}
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Allowed Platforms</h3>
              <div className="flex gap-2">
                {campaign.allowed_platforms.map((platform) => (
                  <Badge key={platform} variant="outline" className="border-white/20 text-white">
                    {platform === "tiktok" ? "TikTok" : "Instagram"}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Guidelines */}
            {campaign.guidelines && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Campaign Guidelines</h3>
                <p className="text-white/70 whitespace-pre-wrap">{campaign.guidelines}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card className="bg-[#202020] border-none">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Apply to Campaign</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Platform Selection */}
              <div className="space-y-2">
                <label className="text-white font-medium">Select Platform</label>
                <select
                  {...register("platform", { required: "Platform is required" })}
                  className="w-full bg-[#191919] border border-white/10 text-white rounded-lg p-3 focus:border-primary focus:outline-none"
                >
                  <option value="">Choose a platform</option>
                  {campaign.allowed_platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform === "tiktok" ? "TikTok" : "Instagram"}
                    </option>
                  ))}
                </select>
                {errors.platform && (
                  <p className="text-destructive text-sm">{errors.platform.message}</p>
                )}
              </div>

              {/* Content URL */}
              <div className="space-y-2">
                <label className="text-white font-medium">Your Content URL</label>
                <Input
                  {...register("content_url", { required: "Content URL is required" })}
                  placeholder="https://..."
                  className="bg-[#191919] border-white/10 text-white placeholder:text-white/40"
                />
                {errors.content_url && (
                  <p className="text-destructive text-sm">{errors.content_url.message}</p>
                )}
              </div>

              {/* Application Questions */}
              {campaign.application_questions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Application Questions</h3>
                  {campaign.application_questions.map((question, index) => (
                    <div key={index} className="space-y-2">
                      <label className="text-white/80">{question}</label>
                      <Textarea
                        {...register(`answers.${index}` as any, { required: "This answer is required" })}
                        placeholder="Your answer..."
                        rows={3}
                        className="bg-[#191919] border-white/10 text-white placeholder:text-white/40"
                      />
                      {errors.answers?.[index] && (
                        <p className="text-destructive text-sm">{errors.answers[index].message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
