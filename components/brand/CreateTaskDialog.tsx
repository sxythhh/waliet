import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Check, X, Plus, Users, DollarSign, FileText, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName?: string;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, label: "Reward" },
  { id: 2, label: "Requirements" },
  { id: 3, label: "Details" },
  { id: 4, label: "Review" },
];

const TAG_SUGGESTIONS = [
  "Social Media", "Content Creation", "Video", "Photography", "Writing",
  "Design", "Marketing", "Research", "Data Entry", "Customer Service",
  "Translation", "Voice Over", "Music", "Animation", "Testing"
];

const VERIFICATION_TYPES = [
  { id: "screenshot", label: "Screenshot", description: "User submits a screenshot as proof" },
  { id: "url", label: "URL/Link", description: "User submits a link to their work" },
  { id: "manual", label: "Manual Review", description: "You manually verify completion" },
];

export function CreateTaskDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
  onSuccess,
}: CreateTaskDialogProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [unlimitedParticipants, setUnlimitedParticipants] = useState(false);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [verificationType, setVerificationType] = useState("screenshot");
  const [estimatedTime, setEstimatedTime] = useState("");

  // Fetch wallet balance
  useEffect(() => {
    if (open && businessId) {
      fetchWalletBalance();
    }
  }, [open, businessId]);

  const fetchWalletBalance = async () => {
    const { data } = await supabase
      .from("business_wallets")
      .select("balance")
      .eq("business_id", businessId)
      .maybeSingle();
    setWalletBalance(Number(data?.balance) || 0);
  };

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setRequirements("");
    setRewardAmount("");
    setMaxParticipants("");
    setUnlimitedParticipants(false);
    setDeadline(undefined);
    setTags([]);
    setTagInput("");
    setVerificationType("screenshot");
    setEstimatedTime("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return rewardAmount && Number(rewardAmount) > 0 && (unlimitedParticipants || (maxParticipants && Number(maxParticipants) > 0));
      case 2:
        return description.trim().length > 0;
      case 3:
        return title.trim().length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          business_id: businessId,
          title: title.trim(),
          description: description.trim(),
          requirements: requirements.trim() || null,
          reward_amount: Number(rewardAmount),
          max_participants: unlimitedParticipants ? 0 : Number(maxParticipants),
          deadline: deadline?.toISOString() || null,
          tags: tags.length > 0 ? tags : null,
          verification_type: verificationType,
          estimated_time_minutes: estimatedTime ? Number(estimatedTime) : null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Task created successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, idx) => (
        <div key={s.id} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              step === s.id
                ? "bg-primary text-primary-foreground"
                : step > s.id
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step > s.id ? <Check className="h-4 w-4" /> : s.id}
          </div>
          <span
            className={cn(
              "ml-2 text-sm font-medium font-inter tracking-[-0.3px]",
              step === s.id ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {s.label}
          </span>
          {idx < STEPS.length - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-3",
                step > s.id ? "bg-primary/50" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Reward
  const RewardStep = () => (
    <div className="space-y-6">
      {/* Total Budget Section */}
      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
            Reward per Completion
          </h3>
          <span className="text-sm text-muted-foreground font-inter">
            Balance: <span className="text-foreground font-medium">${walletBalance.toFixed(2)}</span>
          </span>
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="number"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            placeholder="0.00"
            className="pl-8 h-12 bg-muted/50 border-none rounded-lg text-lg font-inter"
          />
        </div>
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
          Amount paid to each user who completes the task
        </p>
      </div>

      {/* Max Participants Section */}
      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
              Unlimited Participants
            </h3>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
              No limit on how many can complete this task
            </p>
          </div>
          <Switch
            checked={unlimitedParticipants}
            onCheckedChange={setUnlimitedParticipants}
          />
        </div>

        {!unlimitedParticipants && (
          <>
            <Label className="text-sm text-muted-foreground font-inter">Max Participants</Label>
            <Input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder="100"
              className="h-12 bg-muted/50 border-none rounded-lg font-inter"
            />
          </>
        )}

        {rewardAmount && maxParticipants && !unlimitedParticipants && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-inter">Total potential cost</span>
              <span className="font-medium text-foreground font-inter">
                ${(Number(rewardAmount) * Number(maxParticipants)).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Step 2: Requirements
  const RequirementsStep = () => (
    <div className="space-y-6">
      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
          Task Description
        </h3>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what users need to do to complete this task..."
          className="min-h-[120px] bg-muted/50 border-none rounded-lg resize-none font-inter"
        />
      </div>

      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
          Requirements (Optional)
        </h3>
        <Textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Any specific requirements or eligibility criteria..."
          className="min-h-[80px] bg-muted/50 border-none rounded-lg resize-none font-inter"
        />
      </div>

      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
          Verification Type
        </h3>
        <div className="grid gap-2">
          {VERIFICATION_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setVerificationType(type.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                verificationType === type.id
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-muted/50 border-2 border-transparent hover:bg-muted"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2",
                  verificationType === type.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {verificationType === type.id && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground font-inter tracking-[-0.3px] text-sm">
                  {type.label}
                </p>
                <p className="text-xs text-muted-foreground font-inter">
                  {type.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Step 3: Details
  const DetailsStep = () => (
    <div className="space-y-6">
      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
          Task Title
        </h3>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Follow our Instagram account"
          className="h-12 bg-muted/50 border-none rounded-lg font-inter"
        />
      </div>

      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
          Deadline (Optional)
        </h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left font-normal bg-muted/50 border-none rounded-lg",
                !deadline && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {deadline ? format(deadline, "PPP") : "Select deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
          Estimated Time (Optional)
        </h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            placeholder="5"
            className="h-12 bg-muted/50 border-none rounded-lg font-inter w-24"
          />
          <span className="text-muted-foreground font-inter">minutes</span>
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
          Tags (Optional)
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1 font-inter"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Add a tag..."
            className="h-10 bg-muted/50 border-none rounded-lg font-inter"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim() || tags.length >= 5}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {TAG_SUGGESTIONS.filter(s => !tags.includes(s)).slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-inter"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Step 4: Review
  const ReviewStep = () => (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted/30 p-5 space-y-3">
        <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px] text-lg">
          {title || "Untitled Task"}
        </h3>
        <p className="text-sm text-muted-foreground font-inter">
          {description || "No description"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-inter">Reward</span>
          </div>
          <p className="font-semibold text-foreground font-inter text-lg">
            ${rewardAmount || "0"}
          </p>
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-inter">Participants</span>
          </div>
          <p className="font-semibold text-foreground font-inter text-lg">
            {unlimitedParticipants ? "Unlimited" : maxParticipants || "0"}
          </p>
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-inter">Verification</span>
          </div>
          <p className="font-semibold text-foreground font-inter text-sm capitalize">
            {verificationType}
          </p>
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-inter">Deadline</span>
          </div>
          <p className="font-semibold text-foreground font-inter text-sm">
            {deadline ? format(deadline, "MMM d, yyyy") : "No deadline"}
          </p>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="rounded-xl bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground font-inter mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-inter">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!unlimitedParticipants && rewardAmount && maxParticipants && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-inter">
              Maximum total cost
            </span>
            <span className="font-semibold text-foreground font-inter text-lg">
              ${(Number(rewardAmount) * Number(maxParticipants)).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return <RewardStep />;
      case 2:
        return <RequirementsStep />;
      case 3:
        return <DetailsStep />;
      case 4:
        return <ReviewStep />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] bg-background border-none shadow-2xl p-0 max-h-[90vh] overflow-hidden">
        <div className="p-6 pb-0">
          <StepIndicator />
        </div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[60vh]">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
            className="font-inter tracking-[-0.3px]"
          >
            {step > 1 ? "Back" : "Cancel"}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="font-inter tracking-[-0.3px] bg-primary hover:bg-primary/90"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="font-inter tracking-[-0.3px] bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
