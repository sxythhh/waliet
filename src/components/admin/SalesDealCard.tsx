import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, DollarSign } from "lucide-react";
import { EditSalesDealDialog } from "./EditSalesDealDialog";

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

interface SalesDealCardProps {
  deal: SalesDeal;
  isDragging?: boolean;
  onUpdate?: () => void;
}

export function SalesDealCard({ deal, isDragging = false, onUpdate }: SalesDealCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: deal.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50 rotate-3' : ''
      }`}
    >
      <EditSalesDealDialog deal={deal} onUpdate={onUpdate}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={deal.brands.logo_url || ''} />
              <AvatarFallback>{deal.brands.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{deal.brands.name}</p>
            </div>
          </div>

          {deal.deal_value && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              <span>${deal.deal_value.toLocaleString()}</span>
              {deal.probability && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {deal.probability}%
                </Badge>
              )}
            </div>
          )}

          {deal.close_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3" />
              <span>{new Date(deal.close_date).toLocaleDateString()}</span>
            </div>
          )}

          {deal.won_date && deal.stage === 'won' && (
            <Badge variant="default" className="w-fit text-xs bg-green-500">
              Won {new Date(deal.won_date).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </EditSalesDealDialog>
    </Card>
  );
}
