"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const WORKSPACE_COLORS = [
  "#8B5CF6", "#3B82F6", "#0EA5E9", "#14B8A6",
  "#22C55E", "#EAB308", "#F97316", "#EF4444", "#EC4899",
  "#A855F7", "#D946EF", "#F43F5E", "#64748B", "#1E293B",
];

const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(100),
  website: z.string().trim().max(255).optional().or(z.literal("")),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (workspace: { name: string; color: string; logoUrl: string | null }) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [workspaceColor, setWorkspaceColor] = useState("#8B5CF6");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      website: "",
    },
  });

  const workspaceName = form.watch("name");

  // Generate initials from workspace name
  const getInitials = (name: string) => {
    if (!name) return "W";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: WorkspaceFormValues) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Call onSuccess callback if provided - parent handles navigation
      onSuccess?.({
        name: values.name,
        color: workspaceColor,
        logoUrl: logoPreview,
      });

      // Reset form
      form.reset();
      setLogoFile(null);
      setLogoPreview(null);
      setWorkspaceColor("#8B5CF6");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating workspace:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setLogoFile(null);
    setLogoPreview(null);
    setWorkspaceColor("#8B5CF6");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-card border-0 p-0 overflow-hidden rounded-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Create Workspace
                </DialogTitle>
                <p className="text-sm text-muted-foreground tracking-[-0.3px] text-left">
                  Create and customize your workspace to manage your sessions and clients.
                </p>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              {/* Icon Section */}
              <div className="space-y-2">
                <label className="text-sm text-foreground tracking-[-0.5px]">
                  Workspace Logo & Colour
                </label>

                <div className="flex items-center gap-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Logo Preview or Initials with Color */}
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: logoPreview ? undefined : workspaceColor }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Workspace logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-sm font-semibold">
                        {getInitials(workspaceName)}
                      </span>
                    )}
                  </div>

                  {/* Color Picker */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {WORKSPACE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-[18px] h-[18px] rounded transition-all flex-shrink-0 ${
                          workspaceColor === color
                            ? "ring-1 ring-offset-1 ring-offset-background ring-white/80"
                            : "hover:opacity-80"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setWorkspaceColor(color)}
                      />
                    ))}
                  </div>

                  {/* Upload/Remove Buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs tracking-[-0.3px] gap-1.5 px-2.5 bg-muted border-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    >
                      <Upload className="h-3 w-3" />
                      {logoPreview ? "Change" : "Upload"}
                    </Button>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeLogo}
                        className="h-7 text-xs tracking-[-0.3px] px-2.5 bg-muted border-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-foreground tracking-[-0.5px]">
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter workspace name"
                        className="h-10 bg-transparent border-border text-sm tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/80 rounded-lg transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Website URL Field */}
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-foreground tracking-[-0.5px]">
                      Website URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://yourwebsite.com"
                        className="h-10 bg-transparent border-border text-sm tracking-[-0.3px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/80 rounded-lg transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                className="h-9 px-4 text-sm font-medium tracking-[-0.3px] hover:bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 text-sm font-medium tracking-[-0.5px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Create Workspace"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
