import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SalesPipelineColumn } from "./SalesPipelineColumn";
import { SalesDealCard } from "./SalesDealCard";
import { SalesDealSheet } from "./SalesDealSheet";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type SalesStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_type: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
  is_active: boolean;
  created_at: string;
}

interface SalesDeal {
  id: string;
  brand_id: string;
  stage: SalesStage;
  deal_value: number | null;
  probability: number | null;
  close_date: string | null;
  next_payment_date: string | null;
  payment_amount: number | null;
  notes: string | null;
  won_date: string | null;
  lost_reason: string | null;
  brands: Brand;
}

const STAGES: { value: SalesStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-slate-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export function SalesPipelineView() {
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<SalesDeal | null>(null);
  const [sheetDeal, setSheetDeal] = useState<SalesDeal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_deals')
        .select(`
          *,
          brands (
            id,
            name,
            slug,
            description,
            logo_url,
            brand_type,
            home_url,
            account_url,
            assets_url,
            show_account_tab,
            is_active,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    if (deal) setActiveDeal(deal);
  };

  const handleOpenSheet = (deal: SalesDeal) => {
    setSheetDeal(deal);
    setSheetOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over || active.id === over.id) return;

    const dealId = active.id as string;
    const newStage = over.id as SalesStage;

    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    setDeals(deals.map(d => 
      d.id === dealId ? { ...d, stage: newStage } : d
    ));

    try {
      const updates: any = { stage: newStage };
      
      // If moving to won, set won_date
      if (newStage === 'won' && !deal.won_date) {
        updates.won_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('sales_deals')
        .update(updates)
        .eq('id', dealId);

      if (error) throw error;
      
      toast.success(`Deal moved to ${STAGES.find(s => s.value === newStage)?.label}`);
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
      // Revert on error
      fetchDeals();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pb-8">
        {STAGES.map(stage => (
          <SalesPipelineColumn
            key={stage.value}
            stage={stage}
            deals={deals.filter(d => d.stage === stage.value)}
            onRefresh={fetchDeals}
            onOpenSheet={handleOpenSheet}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? <SalesDealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>

      <SalesDealSheet
        deal={sheetDeal}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchDeals}
      />
    </DndContext>
  );
}
