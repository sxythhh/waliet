import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PublicFormSuccessProps {
  brandName: string;
  brandColor: string;
  successMessage?: string;
  isWaitlisted?: boolean;
}

export function PublicFormSuccess({
  brandName,
  brandColor,
  successMessage,
  isWaitlisted,
}: PublicFormSuccessProps) {
  const defaultMessage = isWaitlisted
    ? `You've been added to the waitlist! ${brandName} will contact you if a spot opens up.`
    : `Thank you for applying! ${brandName} will review your application and get back to you soon.`;

  return (
    <div className="text-center space-y-6 py-8">
      <div
        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
        style={{ backgroundColor: `${brandColor}20` }}
      >
        <CheckCircle2
          className="w-8 h-8"
          style={{ color: brandColor }}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-inter tracking-[-0.5px]">
          {isWaitlisted ? "Added to Waitlist" : "Application Submitted"}
        </h2>
        <p className="text-muted-foreground font-inter tracking-[-0.5px] max-w-md mx-auto">
          {successMessage || defaultMessage}
        </p>
      </div>

      <div className="pt-4 space-y-3">
        <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
          Want to track your application and discover more opportunities?
        </p>
        <Link to="/auth">
          <Button
            style={{ backgroundColor: brandColor }}
            className="font-inter tracking-[-0.5px] hover:opacity-90"
          >
            Create a Virality Account
          </Button>
        </Link>
      </div>
    </div>
  );
}
