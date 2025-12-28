import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Crown, Gem, Award, Lock } from "lucide-react";

interface RankInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRank?: string;
  currentLevel?: number;
}

const ranks = [
  { 
    name: "Bronze", 
    icon: Award, 
    color: "text-amber-600", 
    bgColor: "bg-amber-600/20",
    xpRequired: 0,
    benefits: ["Access to basic campaigns", "Standard payout rates"]
  },
  { 
    name: "Silver", 
    icon: Star, 
    color: "text-gray-400", 
    bgColor: "bg-gray-400/20",
    xpRequired: 2500,
    benefits: ["5% bonus on payouts", "Priority campaign access", "Silver badge on profile"]
  },
  { 
    name: "Gold", 
    icon: Trophy, 
    color: "text-yellow-500", 
    bgColor: "bg-yellow-500/20",
    xpRequired: 10000,
    benefits: ["10% bonus on payouts", "Early access to new campaigns", "Gold badge on profile", "Dedicated support"]
  },
  { 
    name: "Platinum", 
    icon: Crown, 
    color: "text-cyan-400", 
    bgColor: "bg-cyan-400/20",
    xpRequired: 25000,
    benefits: ["15% bonus on payouts", "Exclusive platinum campaigns", "Platinum badge on profile", "Priority payouts"]
  },
  { 
    name: "Elite", 
    icon: Gem, 
    color: "text-purple-500", 
    bgColor: "bg-purple-500/20",
    xpRequired: 50000,
    benefits: ["20% bonus on payouts", "VIP campaign access", "Elite badge on profile", "Personal account manager", "Custom payout schedule"]
  },
];

export function RankInfoDialog({ open, onOpenChange, currentRank = "Bronze", currentLevel = 1 }: RankInfoDialogProps) {
  const currentRankIndex = ranks.findIndex(r => r.name === currentRank);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Creator Ranks
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Overview
            </TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Rewards
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground">Your Current Rank</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const rank = ranks.find(r => r.name === currentRank);
                    const Icon = rank?.icon || Award;
                    return (
                      <>
                        <Icon className={`h-4 w-4 ${rank?.color}`} />
                        <span className={rank?.color}>{currentRank}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Level {currentLevel} • Earn XP by completing campaigns and getting views on your content.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">All Ranks</h4>
              <div className="space-y-2">
                {ranks.map((rank, index) => {
                  const Icon = rank.icon;
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
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${rank.bgColor}`}>
                          <Icon className={`h-4 w-4 ${rank.color}`} />
                        </div>
                        <div>
                          <span className={`font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                            {rank.name}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {rank.xpRequired.toLocaleString()} XP required
                          </p>
                        </div>
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
            </div>
          </TabsContent>
          
          <TabsContent value="rewards" className="mt-4 space-y-3">
            {ranks.map((rank, index) => {
              const Icon = rank.icon;
              const isUnlocked = index <= currentRankIndex;
              
              return (
                <div 
                  key={rank.name}
                  className={`p-4 rounded-lg border ${
                    isUnlocked ? "border-border bg-muted/20" : "border-border/50 bg-muted/10 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${rank.bgColor}`}>
                      <Icon className={`h-5 w-5 ${rank.color}`} />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground">{rank.name} Benefits</span>
                    </div>
                    {!isUnlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <ul className="space-y-1 ml-12">
                    {rank.benefits.map((benefit, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isUnlocked ? "bg-primary" : "bg-muted-foreground"}`} />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
