import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Info } from "lucide-react";
import { Label } from "./label";

export interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Mark field as required with asterisk */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Show success state with checkmark */
  success?: boolean;
  /** Hint text displayed below input */
  hint?: string;
  /** Additional description under label */
  description?: string;
  /** The form input element */
  children: React.ReactNode;
  /** Optional className for the wrapper */
  className?: string;
  /** HTML id for the input (used for label htmlFor) */
  htmlFor?: string;
}

/**
 * FormField provides consistent layout and validation states for form inputs.
 * 
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   required
 *   error={errors.email}
 *   hint="We'll send a verification code here"
 *   htmlFor="email"
 * >
 *   <Input
 *     id="email"
 *     type="email"
 *     value={email}
 *     onChange={(e) => setEmail(e.target.value)}
 *     className={cn(errors.email && "border-destructive")}
 *   />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  required,
  error,
  success,
  hint,
  description,
  children,
  className,
  htmlFor,
}: FormFieldProps) {
  const inputId = htmlFor || React.useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <Label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium text-foreground",
            error && "text-destructive"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </Label>
        {success && !error && (
          <Check
            className="h-4 w-4 text-emerald-500"
            aria-label="Field is valid"
          />
        )}
      </div>

      {/* Description */}
      {description && (
        <p
          id={descriptionId}
          className="text-xs text-muted-foreground -mt-1"
        >
          {description}
        </p>
      )}

      {/* Input wrapper with optional error icon */}
      <div className="relative">
        {children}
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle
              className="h-4 w-4 text-destructive"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="text-xs text-destructive flex items-center gap-1.5"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Hint text (only show when no error) */}
      {hint && !error && (
        <p
          id={hintId}
          className="text-xs text-muted-foreground flex items-center gap-1.5"
        >
          <Info className="h-3 w-3 flex-shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

FormField.displayName = "FormField";
