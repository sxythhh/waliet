import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface SettingsCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footerContent?: ReactNode;
  footerHint?: string;
  saveButton?: {
    label?: string;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
  };
  variant?: "default" | "danger";
}

export function SettingsCard({
  title,
  description,
  children,
  footerContent,
  footerHint,
  saveButton,
  variant = "default",
}: SettingsCardProps) {
  const isDanger = variant === "danger";

  return (
    <div
      className={`rounded-xl border ${
        isDanger ? "border-destructive/30" : "border-border"
      } bg-card overflow-hidden`}
    >
      {/* Header & Content */}
      <div className="p-6">
        <h3
          className="text-base font-semibold text-foreground mb-1"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        >
          {title}
        </h3>
        <p
          className="text-sm text-muted-foreground mb-4"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        >
          {description}
        </p>
        {children}
      </div>

      {/* Footer */}
      {(footerHint || footerContent || saveButton) && (
        <div
          className={`px-6 py-4 border-t ${
            isDanger
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-white dark:bg-muted/30"
          } flex items-center justify-between`}
        >
          <div className="flex-1">
            {footerContent || (
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
              >
                {footerHint}
              </p>
            )}
          </div>
          {saveButton && (
            <Button
              variant={isDanger ? "destructive" : "outline"}
              size="sm"
              disabled={saveButton.disabled}
              onClick={saveButton.onClick}
              className={isDanger ? "" : "text-muted-foreground dark:border-transparent"}
              style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
            >
              {saveButton.loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                saveButton.label || "Save Changes"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
