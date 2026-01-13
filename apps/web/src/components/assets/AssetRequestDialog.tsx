import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAssetRequest } from "@/hooks/assets/useAssetRequests";
import type { AssetType, AssetRequestPriority } from "@/types/assets";

const requestSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(10, "Please provide more details").max(1000),
  asset_type: z.enum(["image", "video", "document", "link"]).optional(),
  priority: z.enum(["low", "normal", "high"]),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface AssetRequestDialogProps {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_OPTIONS: Array<{ value: AssetType; label: string }> = [
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "link", label: "Links / Resources" },
];

const PRIORITY_OPTIONS: Array<{
  value: AssetRequestPriority;
  label: string;
  description: string;
}> = [
  { value: "low", label: "Low", description: "No rush, whenever possible" },
  { value: "normal", label: "Normal", description: "Standard timeline" },
  { value: "high", label: "High", description: "Needed soon for upcoming content" },
];

export function AssetRequestDialog({
  brandId,
  open,
  onOpenChange,
}: AssetRequestDialogProps) {
  const createMutation = useCreateAssetRequest();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
    },
  });

  const onSubmit = async (values: RequestFormValues) => {
    try {
      await createMutation.mutateAsync({
        brand_id: brandId,
        title: values.title,
        description: values.description,
        asset_type: values.asset_type,
        priority: values.priority,
      });

      toast.success("Request submitted! The brand team will review it.");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Request error:", error);
      toast.error("Failed to submit request");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request an Asset</DialogTitle>
          <DialogDescription>
            Let the brand know what materials you need for your content.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you need?</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., High-resolution product photos"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe what you're looking for</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide details about what you need and how you plan to use it..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Asset Type (optional) */}
            <FormField
              control={form.control}
              name="asset_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Type (optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-3 gap-2"
                    >
                      {PRIORITY_OPTIONS.map(({ value, label, description }) => (
                        <Label
                          key={value}
                          htmlFor={`priority-${value}`}
                          className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                            field.value === value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem
                            value={value}
                            id={`priority-${value}`}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-center text-xs text-muted-foreground">
                            {description}
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
