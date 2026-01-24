import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Shield, Clock, AlertTriangle } from "lucide-react";
import { ScreenshotUploadWithStatus } from "./ScreenshotUpload";
import {
  useCreateSubmission,
  uploadScreenshot,
  generateFileHash,
} from "@/hooks/useTaskSubmissions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const submissionSchema = z.object({
  submission_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  submission_text: z.string().optional(),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

interface SubmitTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    reward_amount: number | null;
    verification_type?: string;
    estimated_time_minutes?: number;
  };
  application: {
    id: string;
  };
  onSuccess?: () => void;
}

export function SubmitTaskDialog({
  open,
  onOpenChange,
  task,
  application,
  onSuccess,
}: SubmitTaskDialogProps) {
  const { user } = useAuth();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [startTime] = useState(Date.now());

  const createSubmission = useCreateSubmission();

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      submission_url: "",
      submission_text: "",
    },
  });

  // Get device fingerprint (basic implementation)
  const getDeviceFingerprint = (): { fingerprint: string; data: Record<string, unknown> } => {
    const data = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touchSupport: "ontouchstart" in window,
    };

    // Simple hash of the data
    const fingerprint = btoa(JSON.stringify(data)).slice(0, 32);

    return { fingerprint, data };
  };

  const onSubmit = async (data: SubmissionFormData) => {
    if (!user?.id) {
      toast.error("Please sign in to submit");
      return;
    }

    try {
      setIsUploading(true);

      // Upload screenshot if provided
      let screenshotUrl: string | undefined;
      let screenshotHash: string | undefined;

      if (screenshot) {
        const result = await uploadScreenshot(screenshot, user.id, task.id);
        screenshotUrl = result.url;
        screenshotHash = result.hash;
      }

      // Get device fingerprint
      const { fingerprint, data: fingerprintData } = getDeviceFingerprint();

      // Calculate completion time
      const completionTimeSeconds = Math.floor((Date.now() - startTime) / 1000);

      // Create submission
      await createSubmission.mutateAsync({
        task_application_id: application.id,
        task_id: task.id,
        submission_url: data.submission_url || undefined,
        submission_text: data.submission_text || undefined,
        screenshot_url: screenshotUrl,
        screenshot_hash: screenshotHash,
        device_fingerprint: fingerprint,
        device_fingerprint_data: fingerprintData,
        started_at: new Date(startTime).toISOString(),
        completion_time_seconds: completionTimeSeconds,
      });

      toast.success("Task submitted successfully!", {
        description: "Your submission is being verified.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit task", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const verificationType = task.verification_type || "screenshot";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Task Completion</DialogTitle>
          <DialogDescription>
            Provide proof that you've completed the task "{task.title}"
          </DialogDescription>
        </DialogHeader>

        {/* Task Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {verificationType === "screenshot" && "Screenshot Required"}
              {verificationType === "api_webhook" && "Auto-Verified"}
              {verificationType === "reclaim_zktls" && "zkTLS Proof"}
            </Badge>
          </div>
          {task.reward_amount && (
            <span className="text-sm font-semibold text-green-500">
              ${task.reward_amount}
            </span>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Screenshot Upload */}
            <div className="space-y-2">
              <FormLabel>Screenshot Evidence</FormLabel>
              <ScreenshotUploadWithStatus
                value={screenshot}
                onChange={setScreenshot}
                isUploading={isUploading}
                disabled={createSubmission.isPending}
              />
              <FormDescription>
                Upload a screenshot showing proof of task completion
              </FormDescription>
            </div>

            {/* URL Field */}
            <FormField
              control={form.control}
              name="submission_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proof URL (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/proof"
                      {...field}
                      disabled={createSubmission.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to the completed task (profile page, post URL, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="submission_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about your submission..."
                      rows={3}
                      {...field}
                      disabled={createSubmission.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Verification Info */}
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Your submission will be automatically verified</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Verification usually completes within 24 hours
                </span>
              </div>
              {task.estimated_time_minutes && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    Expected completion time: ~{task.estimated_time_minutes} minutes
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createSubmission.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSubmission.isPending || (!screenshot && !form.getValues("submission_url"))}
              >
                {createSubmission.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
