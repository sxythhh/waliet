import { useState } from "react";
import { Play, Eye, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FeaturedVideo, ShowcaseItem } from "@/types/portfolio";

interface MediaGalleryProps {
  featuredVideos: FeaturedVideo[];
  showcaseItems: ShowcaseItem[];
}

export function MediaGallery({ featuredVideos, showcaseItems }: MediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allMedia = [
    ...featuredVideos.map((v) => ({ type: "video" as const, ...v })),
    ...showcaseItems.map((i) => ({ type: "showcase" as const, ...i })),
  ];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextItem = () => {
    setLightboxIndex((prev) => (prev + 1) % allMedia.length);
  };

  const prevItem = () => {
    setLightboxIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const formatViews = (views: number | undefined) => {
    if (!views) return null;
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {allMedia.map((item, index) => (
          <button
            key={item.id}
            onClick={() => openLightbox(index)}
            className="group relative aspect-video bg-muted rounded-lg overflow-hidden"
          >
            {item.thumbnailUrl || (item.type === "showcase" && item.type === "image") ? (
              <img
                src={item.thumbnailUrl || ("url" in item ? item.url : "")}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === "video" ? (
                  <Play className="h-10 w-10 text-white" />
                ) : (
                  <ExternalLink className="h-8 w-8 text-white" />
                )}
              </div>
            </div>

            {/* Video views badge */}
            {item.type === "video" && item.views && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                <Eye className="h-3 w-3" />
                {formatViews(item.views)}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-none">
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Navigation */}
            {allMedia.length > 1 && (
              <>
                <button
                  onClick={prevItem}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={nextItem}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}

            {/* Content */}
            <div className="aspect-video flex items-center justify-center">
              {allMedia[lightboxIndex]?.type === "video" ? (
                allMedia[lightboxIndex].externalUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                    {allMedia[lightboxIndex].thumbnailUrl && (
                      <img
                        src={allMedia[lightboxIndex].thumbnailUrl}
                        alt={allMedia[lightboxIndex].title}
                        className="max-h-64 rounded-lg"
                      />
                    )}
                    <Button
                      onClick={() => window.open(allMedia[lightboxIndex].externalUrl, "_blank")}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Watch on {allMedia[lightboxIndex].platform || "External Site"}
                    </Button>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-16 w-16 text-white/50" />
                  </div>
                )
              ) : (
                <img
                  src={allMedia[lightboxIndex]?.thumbnailUrl || ("url" in allMedia[lightboxIndex] ? allMedia[lightboxIndex].url : "")}
                  alt={allMedia[lightboxIndex]?.title}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Caption */}
            <div className="p-4 bg-black/80 text-white">
              <h3 className="font-medium">{allMedia[lightboxIndex]?.title}</h3>
              {allMedia[lightboxIndex]?.description && (
                <p className="text-sm text-white/70 mt-1">{allMedia[lightboxIndex].description}</p>
              )}
              {allMedia[lightboxIndex]?.type === "video" && allMedia[lightboxIndex]?.views && (
                <p className="text-sm text-white/50 mt-1 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {formatViews(allMedia[lightboxIndex].views)} views
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
