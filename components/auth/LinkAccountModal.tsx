"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface LinkAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function LinkAccountModal({
  isOpen,
  onClose,
  userId,
}: LinkAccountModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update email");
      }

      toast({
        title: "Email saved!",
        description:
          "Your account is now linked. You can access Waliet on the web.",
      });

      onClose();
      router.refresh();
    } catch (error) {
      console.error("Failed to update email:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save email",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Just close for now - will show again on next visit until email is provided
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-card border border-border p-6 shadow-lg">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Enable web access
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Add your email to sync your wallet across devices and access Waliet
            directly at{" "}
            <span className="text-foreground font-medium">waliet.com</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 pl-12 bg-background border border-border rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 font-semibold rounded-lg"
            disabled={loading || !email}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save email"
            )}
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </form>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
          We'll never share your email or send you spam. This is only used to
          link your account across authentication methods.
        </p>
      </div>
    </div>
  );
}
