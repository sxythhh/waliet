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
import { cn } from "@/lib/utils";

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
  { value: "low", label: "Low", description: "No rush" },
  { value: "normal", label: "Normal", description: "Standard" },
  { value: "high", label: "High", description: "Urgent" },
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
      <DialogContent className="max-w-md bg-card dark:bg-[#090909] border-border/50">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">
            Request an Asset
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Let the brand know what materials you need for your content.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium font-inter tracking-[-0.5px]">
                    What do you need?
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., High-resolution product photos"
                      className="h-11 bg-muted/30 dark:bg-muted/20 border-border/50 rounded-lg font-inter tracking-[-0.3px] placeholder:text-muted-foreground/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-inter" />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium font-inter tracking-[-0.5px]">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide details about what you need..."
                      rows={3}
                      className="bg-muted/30 dark:bg-muted/20 border-border/50 rounded-lg font-inter tracking-[-0.3px] placeholder:text-muted-foreground/50 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-inter" />
                </FormItem>
              )}
            />

            {/* Asset Type & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Asset Type (optional) */}
              <FormField
                control={form.control}
                name="asset_type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium font-inter tracking-[-0.5px]">
                      Type <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 bg-muted/30 dark:bg-muted/20 border-border/50 rounded-lg font-inter tracking-[-0.3px]">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover dark:bg-[#0e0e0e] border-border/50">
                        {TYPE_OPTIONS.map(({ value, label }) => (
                          <SelectItem
                            key={value}
                            value={value}
                            className="font-inter tracking-[-0.3px]"
                          >
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs font-inter" />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium font-inter tracking-[-0.5px]">
                      Priority
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-1.5"
                      >
                        {PRIORITY_OPTIONS.map(({ value, label }) => (
                          <Label
                            key={value}
                            htmlFor={`priority-${value}`}
                            className={cn(
                              "flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-center transition-all duration-200",
                              "border border-transparent bg-muted/30 hover:bg-muted/50",
                              field.value === value && "bg-white dark:bg-white text-black dark:text-black"
                            )}
                          >
                            <RadioGroupItem
                              value={value}
                              id={`priority-${value}`}
                              className="sr-only"
                            />
                            <span className="text-xs font-medium font-inter tracking-[-0.3px]">
                              {label}
                            </span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="text-xs font-inter" />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
                className="font-inter tracking-[-0.5px] hover:bg-muted/50 hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="font-inter tracking-[-0.5px]"
              >
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
