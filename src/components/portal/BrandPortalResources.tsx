import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  FileText,
  Video,
  Download,
  ExternalLink,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Brand } from "@/pages/BrandPortal";

interface BrandPortalResourcesProps {
  brand: Brand;
  userId: string;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  content_url: string | null;
  content_text: string | null;
  file_url: string | null;
  sort_order: number;
}

export function BrandPortalResources({ brand, userId }: BrandPortalResourcesProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    fetchResources();
  }, [brand.id]);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("brand_resources")
        .select("*")
        .eq("brand_id", brand.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (data) {
        setResources(data);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "guideline":
        return <FileText className="h-5 w-5" />;
      case "tutorial":
        return <Video className="h-5 w-5" />;
      case "asset":
        return <Download className="h-5 w-5" />;
      case "faq":
        return <HelpCircle className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getResourceColor = (type: string) => {
    switch (type) {
      case "guideline":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "tutorial":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "asset":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "faq":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  const filteredResources =
    activeTab === "all"
      ? resources
      : resources.filter((r) => r.resource_type === activeTab);

  const resourceTypes = [
    { value: "all", label: "All" },
    { value: "guideline", label: "Guidelines" },
    { value: "tutorial", label: "Tutorials" },
    { value: "asset", label: "Assets" },
    { value: "faq", label: "FAQs" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-foreground tracking-[-0.5px]">
          Resources
        </h1>
        <p className="text-sm text-muted-foreground tracking-[-0.3px]">
          Guidelines, tutorials, and assets from {brand.name}
        </p>
      </div>

      {/* Welcome Card */}
      <Card
        className="border-0 shadow-sm overflow-hidden"
        style={{ backgroundColor: `${accentColor}10` }}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className="p-2.5 rounded-xl flex-shrink-0"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Sparkles className="h-6 w-6" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-foreground tracking-[-0.5px] mb-1">
                Create Amazing Content
              </h3>
              <p className="text-sm text-muted-foreground tracking-[-0.3px]">
                Use these resources to understand {brand.name}'s brand voice,
                style guidelines, and content requirements. Following these will
                help your submissions get approved faster!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {resources.length === 0 ? (
        /* Empty State */
        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-8 text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <BookOpen className="h-8 w-8" style={{ color: accentColor }} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-foreground mb-2 tracking-[-0.5px]">
              No Resources Yet
            </h3>
            <p className="text-sm text-muted-foreground tracking-[-0.3px] max-w-md mx-auto">
              {brand.name} hasn't added any resources yet. Check back later for
              brand guidelines, tutorials, and downloadable assets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
              {resourceTypes.map((type) => {
                const count =
                  type.value === "all"
                    ? resources.length
                    : resources.filter((r) => r.resource_type === type.value).length;
                if (count === 0 && type.value !== "all") return null;

                return (
                  <TabsTrigger
                    key={type.value}
                    value={type.value}
                    className="text-sm px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-background"
                  >
                    {type.label}
                    {count > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-2 h-5 px-1.5 text-[10px]"
                      >
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-3">
                {filteredResources.map((resource) => (
                  <Card
                    key={resource.id}
                    className="border-0 shadow-sm bg-white dark:bg-card hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2.5 rounded-xl flex-shrink-0 ${getResourceColor(resource.resource_type)}`}
                        >
                          {getResourceIcon(resource.resource_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-foreground tracking-[-0.3px]">
                              {resource.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {resource.resource_type}
                            </Badge>
                          </div>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground tracking-[-0.3px] line-clamp-2 mb-3">
                              {resource.description}
                            </p>
                          )}
                          {resource.content_text && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 bg-muted/50 rounded-lg p-3 mb-3 tracking-[-0.3px]">
                              <p className="whitespace-pre-wrap line-clamp-4">
                                {resource.content_text}
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {resource.content_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() =>
                                  window.open(resource.content_url!, "_blank")
                                }
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </Button>
                            )}
                            {resource.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() =>
                                  window.open(resource.file_url!, "_blank")
                                }
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Quick Tips */}
      <Card className="border-0 shadow-sm bg-white dark:bg-card">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-foreground mb-4 tracking-[-0.5px]">
            Content Tips
          </h3>
          <div className="space-y-3">
            {[
              "Review brand guidelines before creating content",
              "Match the brand's tone and visual style",
              "Include required hashtags and mentions",
              "Submit high-quality video with good lighting",
              "Follow the content brief requirements exactly",
            ].map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2
                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                  style={{ color: accentColor }}
                />
                <p className="text-sm text-muted-foreground tracking-[-0.3px]">
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
