import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RankInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRank?: string;
  currentLevel?: number;
}

const ranks = [
  { 
    name: "Bronze", 
    xpRequired: 0,
  },
  { 
    name: "Silver", 
    xpRequired: 2500,
  },
  { 
    name: "Gold", 
    xpRequired: 10000,
  },
  { 
    name: "Platinum", 
    xpRequired: 25000,
  },
  { 
    name: "Elite", 
    xpRequired: 50000,
  },
];

export function RankInfoDialog({ open, onOpenChange, currentRank = "Bronze", currentLevel = 1 }: RankInfoDialogProps) {
  const currentRankIndex = ranks.findIndex(r => r.name === currentRank);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <div className="space-y-4">
          <div className="space-y-2">
            {ranks.map((rank, index) => {
              const isCurrentOrPast = index <= currentRankIndex;
              const isCurrent = rank.name === currentRank;
              
              return (
                <div 
                  key={rank.name}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCurrent 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div>
                    <span className={`font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                      {rank.name}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {rank.xpRequired.toLocaleString()} XP required
                    </p>
                  </div>
                  {!isCurrentOrPast && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  {isCurrent && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
