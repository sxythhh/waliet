import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, DollarSign, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SkillType {
  id: string;
  name: string;
  category: string;
}

interface RateCard {
  id?: string;
  skill_type_id: string;
  rate_per_video: number | null;
  rate_per_1k_views: number | null;
  min_guarantee: number | null;
  retainer_monthly: number | null;
  turnaround_days: number;
  revisions_included: number;
  is_public: boolean;
}

interface RateCardEditorProps {
  userId: string;
  primarySkillTypeId?: string | null;
  onSave?: () => void;
}

export function RateCardEditor({ userId, primarySkillTypeId, onSave }: RateCardEditorProps) {
  const [skillTypes, setSkillTypes] = useState<SkillType[]>([]);
  const [rateCards, setRateCards] = useState<Map<string, RateCard>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(primarySkillTypeId || null);
  const { toast } = useToast();

  // Fetch skill types and existing rate cards
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch skill types
        const { data: skills, error: skillsError } = await supabase
          .from("creator_skill_types")
          .select("id, name, category")
          .eq("is_active", true)
          .order("sort_order");

        if (skillsError) throw skillsError;
        setSkillTypes(skills || []);

        // Set active skill if not set
        if (!activeSkillId && primarySkillTypeId) {
          setActiveSkillId(primarySkillTypeId);
        } else if (!activeSkillId && skills && skills.length > 0) {
          setActiveSkillId(skills[0].id);
        }

        // Fetch existing rate cards for this user
        const { data: existingCards, error: cardsError } = await supabase
          .from("creator_rate_cards")
          .select("*")
          .eq("creator_id", userId);

        if (cardsError) throw cardsError;

        // Build map of existing rate cards
        const cardsMap = new Map<string, RateCard>();
        for (const card of existingCards || []) {
          cardsMap.set(card.skill_type_id, {
            id: card.id,
            skill_type_id: card.skill_type_id,
            rate_per_video: card.rate_per_video,
            rate_per_1k_views: card.rate_per_1k_views,
            min_guarantee: card.min_guarantee,
            retainer_monthly: card.retainer_monthly,
            turnaround_days: card.turnaround_days || 3,
            revisions_included: card.revisions_included || 2,
            is_public: card.is_public ?? true,
          });
        }
        setRateCards(cardsMap);
      } catch (error) {
        console.error("Error fetching rate card data:", error);
        toast({
          variant: "destructive",
          title: "Error loading rates",
          description: "Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, primarySkillTypeId]);

  const getOrCreateRateCard = (skillId: string): RateCard => {
    return rateCards.get(skillId) || {
      skill_type_id: skillId,
      rate_per_video: null,
      rate_per_1k_views: null,
      min_guarantee: null,
      retainer_monthly: null,
      turnaround_days: 3,
      revisions_included: 2,
      is_public: true,
    };
  };

  const updateRateCard = (skillId: string, updates: Partial<RateCard>) => {
    const current = getOrCreateRateCard(skillId);
    const updated = { ...current, ...updates };
    setRateCards(new Map(rateCards.set(skillId, updated)));
  };

  const handleSave = async () => {
    if (!activeSkillId) return;

    setSaving(true);
    try {
      const card = getOrCreateRateCard(activeSkillId);

      const upsertData = {
        creator_id: userId,
        skill_type_id: activeSkillId,
        rate_per_video: card.rate_per_video,
        rate_per_1k_views: card.rate_per_1k_views,
        min_guarantee: card.min_guarantee,
        retainer_monthly: card.retainer_monthly,
        turnaround_days: card.turnaround_days,
        revisions_included: card.revisions_included,
        is_public: card.is_public,
      };

      const { error } = await supabase
        .from("creator_rate_cards")
        .upsert(upsertData, { onConflict: "creator_id,skill_type_id" });

      if (error) throw error;

      toast({
        title: "Rates saved",
        description: "Your rate card has been updated.",
      });

      onSave?.();
    } catch (error) {
      console.error("Error saving rate card:", error);
      toast({
        variant: "destructive",
        title: "Error saving rates",
        description: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCard = activeSkillId ? getOrCreateRateCard(activeSkillId) : null;
  const activeSkill = skillTypes.find(s => s.id === activeSkillId);

  return (
    <div className="space-y-6">
      {/* Skill Type Tabs */}
      {skillTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {skillTypes.map((skill) => {
            const hasRates = rateCards.has(skill.id);
            return (
              <button
                key={skill.id}
                onClick={() => setActiveSkillId(skill.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-inter tracking-[-0.3px] transition-all",
                  activeSkillId === skill.id
                    ? "bg-primary text-primary-foreground"
                    : hasRates
                    ? "bg-muted text-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {skill.name}
                {hasRates && activeSkillId !== skill.id && (
                  <span className="ml-1.5 text-xs opacity-60">•</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeCard && activeSkill && (
        <div className="space-y-6">
          {/* Per-Video Rate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium font-inter tracking-[-0.5px] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Rate per Video
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="10"
                value={activeCard.rate_per_video ?? ""}
                onChange={(e) => updateRateCard(activeSkillId!, {
                  rate_per_video: e.target.value ? Number(e.target.value) : null
                })}
                placeholder="e.g., 150"
                className="pl-7 h-11 bg-muted/30 border-0 font-inter"
              />
            </div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Your base rate for a single video project
            </p>
          </div>

          {/* Performance Rate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium font-inter tracking-[-0.5px] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              Performance Bonus (per 1K views)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={activeCard.rate_per_1k_views ?? ""}
                onChange={(e) => updateRateCard(activeSkillId!, {
                  rate_per_1k_views: e.target.value ? Number(e.target.value) : null
                })}
                placeholder="e.g., 1.50"
                className="pl-7 h-11 bg-muted/30 border-0 font-inter"
              />
            </div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Additional pay based on video performance (for hybrid campaigns)
            </p>
          </div>

          {/* Minimum Guarantee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
              Minimum Guarantee
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="10"
                value={activeCard.min_guarantee ?? ""}
                onChange={(e) => updateRateCard(activeSkillId!, {
                  min_guarantee: e.target.value ? Number(e.target.value) : null
                })}
                placeholder="e.g., 100"
                className="pl-7 h-11 bg-muted/30 border-0 font-inter"
              />
            </div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Minimum you'll accept for performance-only deals
            </p>
          </div>

          {/* Monthly Retainer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
              Monthly Retainer Rate
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="100"
                value={activeCard.retainer_monthly ?? ""}
                onChange={(e) => updateRateCard(activeSkillId!, {
                  retainer_monthly: e.target.value ? Number(e.target.value) : null
                })}
                placeholder="e.g., 2000"
                className="pl-7 h-11 bg-muted/30 border-0 font-inter"
              />
            </div>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Your rate for ongoing monthly work
            </p>
          </div>

          {/* Turnaround & Revisions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium font-inter tracking-[-0.5px] flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Turnaround
              </Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={activeCard.turnaround_days}
                onChange={(e) => updateRateCard(activeSkillId!, {
                  turnaround_days: Number(e.target.value) || 3
                })}
                className="h-11 bg-muted/30 border-0 font-inter"
              />
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Days</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                Revisions Included
              </Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={activeCard.revisions_included}
                onChange={(e) => updateRateCard(activeSkillId!, {
                  revisions_included: Number(e.target.value) || 2
                })}
                className="h-11 bg-muted/30 border-0 font-inter"
              />
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Rounds</p>
            </div>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <div>
              <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                Show rates publicly
              </Label>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Brands can see your rates before reaching out
              </p>
            </div>
            <Switch
              checked={activeCard.is_public}
              onCheckedChange={(checked) => updateRateCard(activeSkillId!, { is_public: checked })}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 font-inter font-medium tracking-[-0.5px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Rates"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
