import { useState, useCallback, useMemo } from "react";

/**
 * Validation rule for a form field
 */
export interface ValidationRule {
  /** Validation function - return true if valid */
  validate: (value: string) => boolean;
  /** Error message to display when validation fails */
  message: string;
}

/**
 * Configuration for a single form field
 */
export interface FieldConfig {
  /** Whether the field is required */
  required?: boolean;
  /** Custom validation rules */
  rules?: ValidationRule[];
  /** Custom error message for required validation */
  requiredMessage?: string;
}

/**
 * Common validation rules that can be reused across forms
 */
export const validationRules = {
  email: {
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: "Please enter a valid email address",
  },
  url: {
    validate: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: "Please enter a valid URL",
  },
  minLength: (min: number): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: `Must be at least ${min} characters`,
  }),
  maxLength: (max: number): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: `Must be no more than ${max} characters`,
  }),
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value: string) => regex.test(value),
    message,
  }),
  numeric: {
    validate: (value: string) => /^\d+$/.test(value),
    message: "Please enter a valid number",
  },
  alphanumeric: {
    validate: (value: string) => /^[a-zA-Z0-9]+$/.test(value),
    message: "Only letters and numbers are allowed",
  },
  noSpaces: {
    validate: (value: string) => !/\s/.test(value),
    message: "Spaces are not allowed",
  },
  username: {
    validate: (value: string) => /^[a-zA-Z0-9_]+$/.test(value),
    message: "Only letters, numbers, and underscores are allowed",
  },
};

/**
 * Hook for managing form validation state
 * 
 * @example
 * ```tsx
 * const { values, errors, touched, handleChange, handleBlur, validateAll, isValid } = useFormValidation(
 *   { email: "", password: "" },
 *   {
 *     email: { required: true, rules: [validationRules.email] },
 *     password: { required: true, rules: [validationRules.minLength(8)] },
 *   }
 * );
 * 
 * <input
 *   value={values.email}
 *   onChange={(e) => handleChange("email", e.target.value)}
 *   onBlur={() => handleBlur("email")}
 * />
 * {touched.email && errors.email && <span>{errors.email}</span>}
 * ```
 */
export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  config: Record<keyof T, FieldConfig>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback(
    (name: keyof T, value: string): string | undefined => {
      const fieldConfig = config[name];
      if (!fieldConfig) return undefined;

      // Required validation
      if (fieldConfig.required && !value.trim()) {
        return fieldConfig.requiredMessage || "This field is required";
      }

      // Skip other validations if field is empty and not required
      if (!value.trim()) {
        return undefined;
      }

      // Custom validation rules
      if (fieldConfig.rules) {
        for (const rule of fieldConfig.rules) {
          if (!rule.validate(value)) {
            return rule.message;
          }
        }
      }

      return undefined;
    },
    [config]
  );

  const handleChange = useCallback(
    (name: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Validate on change only if field has been touched
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [values, validateField]
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const name of Object.keys(config) as (keyof T)[]) {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched(
      Object.keys(config).reduce((acc, key) => {
        acc[key as keyof T] = true;
        return acc;
      }, {} as Partial<Record<keyof T, boolean>>)
    );

    return isValid;
  }, [config, values, validateField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((name: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name: keyof T, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const isValid = useMemo(() => {
    return Object.values(errors).every((error) => !error);
  }, [errors]);

  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      (key) => values[key as keyof T] !== initialValues[key as keyof T]
    );
  }, [values, initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues,
    setFieldValue,
    setFieldError,
    isValid,
    isDirty,
  };
}
