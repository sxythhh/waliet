import { FileText, Image as ImageIcon, Video, Link2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PortfolioItem {
  id: string;
  type: "image" | "video" | "pdf" | "link";
  url: string;
  title: string;
  description?: string;
  order_index: number;
}

interface PortfolioDisplayProps {
  portfolioItems: PortfolioItem[];
  resumeUrl?: string | null;
}

export function PortfolioDisplay({ portfolioItems, resumeUrl }: PortfolioDisplayProps) {
  const hasContent = portfolioItems.length > 0 || resumeUrl;

  if (!hasContent) return null;

  const getItemIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      default:
        return <Link2 className="h-4 w-4" />;
    }
  };

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)/i.test(url);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-[-0.5px]">Portfolio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resume */}
        {resumeUrl && (
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="p-2 bg-muted rounded-md">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Resume / CV</p>
              <p className="text-xs text-muted-foreground">View PDF</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )}

        {/* Portfolio Items */}
        {portfolioItems.length > 0 && (
          <div className="grid gap-3">
            {portfolioItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                {item.type === "image" && isImageUrl(item.url) ? (
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-white/80 truncate">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="p-2 bg-muted rounded-md">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
