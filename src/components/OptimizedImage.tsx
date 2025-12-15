import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}
export function OptimizedImage({
  src,
  alt,
  className,
  fallback,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  return <div className={cn("relative overflow-hidden", className)}>
      {isLoading && <div className="absolute inset-0 bg-muted animate-pulse" />}
      
    </div>;
}