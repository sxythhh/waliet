import { Quote, Star } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { format } from "date-fns";

interface Testimonial {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  brand: {
    id: string;
    name: string;
    logo_url: string | null;
    is_verified: boolean;
  } | null;
}

interface DashboardReviewsSectionProps {
  testimonials: Testimonial[];
}

export function DashboardReviewsSection({
  testimonials,
}: DashboardReviewsSectionProps) {
  if (testimonials.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Quote className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="font-inter tracking-[-0.5px]">No reviews yet</p>
        <p className="text-sm mt-2 font-inter tracking-[-0.5px] max-w-sm mx-auto">
          Complete campaigns and deliver great work to receive reviews from brands
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Testimonial Cards */}
      <div className="grid gap-4">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="bg-card/50 border border-border/50 rounded-2xl p-5"
          >
            {/* Rating Stars */}
            {testimonial.rating && (
              <div className="flex items-center gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating!
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Quote */}
            <p className="text-foreground font-inter tracking-[-0.3px] leading-relaxed mb-4">
              "{testimonial.content}"
            </p>

            {/* Brand Attribution */}
            {testimonial.brand && (
              <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {testimonial.brand.logo_url ? (
                    <img
                      src={testimonial.brand.logo_url}
                      alt={testimonial.brand.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium font-inter tracking-[-0.5px]">
                    {testimonial.brand.name}
                  </span>
                  {testimonial.brand.is_verified && <VerifiedBadge size="sm" />}
                </div>
                <span className="text-xs text-muted-foreground ml-auto font-inter tracking-[-0.5px]">
                  {format(new Date(testimonial.created_at), "MMM yyyy")}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
