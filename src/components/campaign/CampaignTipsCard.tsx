import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, MessageSquare, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, ExternalLink, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface HookItem {
  text: string;
}

interface TalkingPointItem {
  text: string;
}

interface Blueprint {
  id: string;
  title: string;
  hooks: (string | HookItem)[] | null;
  talking_points: (string | TalkingPointItem)[] | null;
  dos_and_donts: { dos?: string[]; donts?: string[] } | null;
  call_to_action: string | null;
}

interface CampaignTipsCardProps {
  blueprintId: string | null;
  className?: string;
}

export function CampaignTipsCard({ blueprintId, className }: CampaignTipsCardProps) {
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [dosOpen, setDosOpen] = useState(false);
  const [dontsOpen, setDontsOpen] = useState(false);

  useEffect(() => {
    const fetchBlueprint = async () => {
      if (!blueprintId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blueprints")
        .select("id, title, hooks, talking_points, dos_and_donts, call_to_action")
        .eq("id", blueprintId)
        .single();

      if (!error && data) {
        setBlueprint(data as Blueprint);
      }
      setLoading(false);
    };

    fetchBlueprint();
  }, [blueprintId]);

  const getItemText = (item: string | HookItem | TalkingPointItem): string => {
    return typeof item === 'string' ? item : item.text;
  };

  if (loading) {
    return (
      <div className={`rounded-2xl bg-card border border-border p-4 ${className || ""}`}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!blueprintId || !blueprint) {
    return (
      <div className={`rounded-2xl bg-card border border-border p-4 ${className || ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Tips & Guidelines
          </h3>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          No content guidelines available for this campaign.
        </p>
      </div>
    );
  }

  const hasDos = blueprint.dos_and_donts?.dos && blueprint.dos_and_donts.dos.length > 0;
  const hasDonts = blueprint.dos_and_donts?.donts && blueprint.dos_and_donts.donts.length > 0;
  const hasHooks = blueprint.hooks && blueprint.hooks.length > 0;
  const hasTalkingPoints = blueprint.talking_points && blueprint.talking_points.length > 0;
  const hasCTA = blueprint.call_to_action;

  const hasContent = hasDos || hasDonts || hasHooks || hasTalkingPoints || hasCTA;

  if (!hasContent) {
    return (
      <div className={`rounded-2xl bg-card border border-border p-4 ${className || ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Tips & Guidelines
          </h3>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          No content guidelines available.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-card border border-border p-4 space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Tips & Guidelines
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => navigate(`/blueprint/${blueprintId}`)}
        >
          View All
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {/* Hooks - Show first 2 */}
      {hasHooks && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Hooks</span>
          </div>
          <div className="space-y-1.5">
            {blueprint.hooks!.slice(0, 2).map((hook, idx) => (
              <p key={idx} className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                • {getItemText(hook)}
              </p>
            ))}
            {blueprint.hooks!.length > 2 && (
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                +{blueprint.hooks!.length - 2} more hooks
              </p>
            )}
          </div>
        </div>
      )}

      {/* Talking Points - Show first 2 */}
      {hasTalkingPoints && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Talking Points</span>
          </div>
          <div className="space-y-1.5">
            {blueprint.talking_points!.slice(0, 2).map((point, idx) => (
              <p key={idx} className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                • {getItemText(point)}
              </p>
            ))}
            {blueprint.talking_points!.length > 2 && (
              <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
                +{blueprint.talking_points!.length - 2} more points
              </p>
            )}
          </div>
        </div>
      )}

      {/* Do's - Collapsible */}
      {hasDos && (
        <Collapsible open={dosOpen} onOpenChange={setDosOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between hover:bg-emerald-500/15 transition-colors">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Do's ({blueprint.dos_and_donts!.dos!.length})
                </span>
              </div>
              {dosOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1.5 pl-2">
              {blueprint.dos_and_donts!.dos!.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-foreground/80" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Don'ts - Collapsible */}
      {hasDonts && (
        <Collapsible open={dontsOpen} onOpenChange={setDontsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center justify-between hover:bg-red-500/15 transition-colors">
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Don'ts ({blueprint.dos_and_donts!.donts!.length})
                </span>
              </div>
              {dontsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1.5 pl-2">
              {blueprint.dos_and_donts!.donts!.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-foreground/80" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  <X className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Call to Action */}
      {hasCTA && (
        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Call to Action</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
            {blueprint.call_to_action}
          </p>
        </div>
      )}
    </div>
  );
}
