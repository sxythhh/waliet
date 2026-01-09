import { useState } from "react";
import PhoneInputWithCountry from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({ value, onChange, placeholder, className }: PhoneInputProps) {
  return (
    <div className={cn("relative", className)}>
      <PhoneInputWithCountry
        international
        defaultCountry="US"
        value={value}
        onChange={(val) => onChange(val || "")}
        placeholder={placeholder || "Enter phone number"}
        className="phone-input-wrapper"
      />
    </div>
  );
}
