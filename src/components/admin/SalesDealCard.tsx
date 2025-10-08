import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, DollarSign } from "lucide-react";
import { useRef } from "react";
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
  onOpenSheet?: (deal: SalesDeal) => void;
}
export function SalesDealCard({
  deal,
  isDragging = false,
  onUpdate,
  onOpenSheet
}: SalesDealCardProps) {
  const mouseDownTime = useRef<number>(0);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform
  } = useDraggable({
    id: deal.id
  });

  const handleMouseDown = () => {
    mouseDownTime.current = Date.now();
  };

  const handleClick = () => {
    const timeDiff = Date.now() - mouseDownTime.current;
    // Only open sheet if it was a quick click (< 200ms) and not a drag
    if (timeDiff < 200 && !transform && onOpenSheet) {
      onOpenSheet(deal);
    }
  };
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
  } : undefined;
  const cardContent = <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={deal.brands.logo_url || ''} />
          <AvatarFallback>{deal.brands.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{deal.brands.name}</p>
        </div>
      </div>

      {deal.deal_value && <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span>${deal.deal_value.toLocaleString()}</span>
          {deal.probability && <Badge variant="outline" className="ml-auto text-xs">
              {deal.probability}%
            </Badge>}
        </div>}

      {deal.close_date && <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="w-3 h-3" />
          <span>{new Date(deal.close_date).toLocaleDateString()}</span>
        </div>}
    </div>;
  if (isDragging) {
    return <Card className="p-3 opacity-50 rotate-3">
        {cardContent}
      </Card>;
  }
  
  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-[#181818] py-[5px] px-[10px]"
    >
      {cardContent}
    </Card>
  );
}