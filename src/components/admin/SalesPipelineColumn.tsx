import { useDroppable } from "@dnd-kit/core";
import { SalesDealCard } from "./SalesDealCard";
import { Card } from "@/components/ui/card";

type SalesStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
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

interface SalesPipelineColumnProps {
  stage: {
    value: SalesStage;
    label: string;
    color: string;
  };
  deals: SalesDeal[];
  onRefresh: () => void;
  onOpenSheet: (deal: SalesDeal) => void;
}

export function SalesPipelineColumn({ stage, deals, onRefresh, onOpenSheet }: SalesPipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.value,
  });

  const totalValue = deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);

  return (
    <div ref={setNodeRef} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h3 className="font-semibold text-sm">{stage.label}</h3>
          <span className="text-xs text-muted-foreground">({deals.length})</span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground pl-5">
            ${totalValue.toLocaleString()}
          </p>
        )}
      </div>

      <Card className={`min-h-[200px] p-3 transition-colors ${
        isOver ? 'bg-accent/50 border-primary' : ''
      }`}>
        <div className="flex flex-col gap-2">
          {deals.map(deal => (
            <SalesDealCard 
              key={deal.id} 
              deal={deal} 
              onUpdate={onRefresh}
              onOpenSheet={onOpenSheet}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
