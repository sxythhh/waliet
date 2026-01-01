import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, formatDistanceToNow } from "date-fns";
import { Plus, Send, Clock, Users, Eye, Megaphone, CalendarIcon, Trash2, FileEdit, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  brand_id: string;
  title: string;
  content: string;
  broadcast_type: string | null;
  status: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  read_count?: number;
}

interface Campaign {
  id: string;
  title: string;
}

interface Boost {
  id: string;
  title: string;
}

interface BrandBroadcastsTabProps {
  brandId: string;
}

type FilterType = "all" | "draft" | "scheduled" | "sent";

export function BrandBroadcastsTab({ brandId }: BrandBroadcastsTabProps) {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState<"all" | "campaigns" | "boosts">("all");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedBoosts, setSelectedBoosts] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("12:00");

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: broadcastsData, error: broadcastsError } = await supabase
        .from("brand_broadcasts")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (broadcastsError) throw broadcastsError;

      const broadcastsWithStats = await Promise.all(
        (broadcastsData || []).map(async (broadcast) => {
          const { count: readCount } = await supabase
            .from("brand_broadcast_reads")
            .select("id", { count: "exact", head: true })
            .eq("broadcast_id", broadcast.id);

          return { ...broadcast, read_count: readCount || 0 };
        })
      );

      setBroadcasts(broadcastsWithStats);

      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("brand_id", brandId)
        .order("title");

      setCampaigns(campaignsData || []);

      const { data: boostsData } = await supabase
        .from("bounty_campaigns")
        .select("id, title")
        .eq("brand_id", brandId)
        .order("title");

      setBoosts(boostsData || []);
    } catch (error) {
      console.error("Error fetching broadcasts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTargetType("all");
    setSelectedCampaigns([]);
    setSelectedBoosts([]);
    setScheduledDate(undefined);
    setScheduledTime("12:00");
  };

  const handleSendBroadcast = async (asDraft = false) => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in title and content");
      return;
    }

    if (targetType === "campaigns" && selectedCampaigns.length === 0) {
      toast.error("Please select at least one campaign");
      return;
    }

    if (targetType === "boosts" && selectedBoosts.length === 0) {
      toast.error("Please select at least one boost");
      return;
    }

    setIsSending(true);
    try {
      let status = asDraft ? "draft" : "sent";
      let scheduledAt: string | null = null;
      let sentAt: string | null = null;

      if (scheduledDate && !asDraft) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const scheduled = new Date(scheduledDate);
        scheduled.setHours(hours, minutes, 0, 0);

        if (scheduled > new Date()) {
          status = "scheduled";
          scheduledAt = scheduled.toISOString();
        } else {
          sentAt = new Date().toISOString();
        }
      } else if (!asDraft) {
        sentAt = new Date().toISOString();
      }

      const { data: broadcast, error: broadcastError } = await supabase
        .from("brand_broadcasts")
        .insert({
          brand_id: brandId,
          title: title.trim(),
          content: content.trim(),
          created_by: user?.id,
          status,
          broadcast_type: targetType,
          scheduled_at: scheduledAt,
          sent_at: sentAt
        })
        .select()
        .single();

      if (broadcastError) throw broadcastError;

      if (targetType === "campaigns" && selectedCampaigns.length > 0) {
        const targets = selectedCampaigns.map((campaignId) => ({
          broadcast_id: broadcast.id,
          campaign_id: campaignId
        }));
        await supabase.from("brand_broadcast_targets").insert(targets);
      }

      if (targetType === "boosts" && selectedBoosts.length > 0) {
        const targets = selectedBoosts.map((boostId) => ({
          broadcast_id: broadcast.id,
          boost_id: boostId
        }));
        await supabase.from("brand_broadcast_targets").insert(targets);
      }

      toast.success(
        asDraft ? "Broadcast saved as draft" : status === "scheduled" ? "Broadcast scheduled" : "Broadcast sent"
      );

      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error creating broadcast:", error);
      toast.error("Failed to create broadcast");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    try {
      const { error } = await supabase.from("brand_broadcasts").delete().eq("id", broadcastId);
      if (error) throw error;
      toast.success("Broadcast deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting broadcast:", error);
      toast.error("Failed to delete broadcast");
    }
  };

  const handleSendNow = async (broadcast: Broadcast) => {
    try {
      const { error } = await supabase
        .from("brand_broadcasts")
        .update({ status: "sent", sent_at: new Date().toISOString(), scheduled_at: null })
        .eq("id", broadcast.id);
      if (error) throw error;
      toast.success("Broadcast sent");
      fetchData();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
    }
  };

  // Filter counts
  const counts = {
    all: broadcasts.length,
    draft: broadcasts.filter((b) => b.status === "draft").length,
    scheduled: broadcasts.filter((b) => b.status === "scheduled").length,
    sent: broadcasts.filter((b) => b.status === "sent").length
  };

  const filteredBroadcasts = activeFilter === "all"
    ? broadcasts
    : broadcasts.filter((b) => b.status === activeFilter);

  const filterOptions: { key: FilterType; label: string; icon: typeof Megaphone }[] = [
    { key: "all", label: "All", icon: Megaphone },
    { key: "draft", label: "Drafts", icon: FileEdit },
    { key: "scheduled", label: "Scheduled", icon: Clock },
    { key: "sent", label: "Sent", icon: CheckCircle2 }
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">Broadcasts</h2>
          <p className="text-sm text-muted-foreground tracking-[-0.3px]">
            Send announcements to creators in your campaigns
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-inter tracking-[-0.3px]">
              <Plus className="h-4 w-4" />
              New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-inter tracking-[-0.5px]">Create Broadcast</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-medium">Title</Label>
                <Input
                  id="title"
                  placeholder="Broadcast title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-xs font-medium">Message</Label>
                <Textarea
                  id="content"
                  placeholder="Write your announcement..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Target Audience</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All creators in brand</SelectItem>
                    <SelectItem value="campaigns">Specific campaigns</SelectItem>
                    <SelectItem value="boosts">Specific boosts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "campaigns" && campaigns.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Select Campaigns</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/30">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center gap-2">
                        <Checkbox
                          id={campaign.id}
                          checked={selectedCampaigns.includes(campaign.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                            } else {
                              setSelectedCampaigns(selectedCampaigns.filter((id) => id !== campaign.id));
                            }
                          }}
                        />
                        <label htmlFor={campaign.id} className="text-sm cursor-pointer">
                          {campaign.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {targetType === "boosts" && boosts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Select Boosts</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/30">
                    {boosts.map((boost) => (
                      <div key={boost.id} className="flex items-center gap-2">
                        <Checkbox
                          id={boost.id}
                          checked={selectedBoosts.includes(boost.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBoosts([...selectedBoosts, boost.id]);
                            } else {
                              setSelectedBoosts(selectedBoosts.filter((id) => id !== boost.id));
                            }
                          }}
                        />
                        <label htmlFor={boost.id} className="text-sm cursor-pointer">
                          {boost.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium">Schedule (optional)</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal text-sm",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-[120px] text-sm"
                  />
                  {scheduledDate && (
                    <Button variant="ghost" size="sm" onClick={() => setScheduledDate(undefined)}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleSendBroadcast(true)} disabled={isSending} className="font-inter tracking-[-0.3px]">
                  Save as Draft
                </Button>
                <Button onClick={() => handleSendBroadcast(false)} disabled={isSending} className="gap-2 font-inter tracking-[-0.3px]">
                  {scheduledDate ? (
                    <>
                      <Clock className="h-4 w-4" />
                      Schedule
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-6">
        {filterOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              "font-inter tracking-[-0.3px]",
              activeFilter === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {counts[key] > 0 && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold",
                activeFilter === key ? "bg-primary-foreground/20" : "bg-background"
              )}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Broadcasts List */}
      {filteredBroadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
            <Megaphone className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="font-semibold text-base mb-1 font-inter tracking-[-0.5px]">
            {activeFilter === "all" ? "No broadcasts yet" : `No ${activeFilter} broadcasts`}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm tracking-[-0.3px]">
            {activeFilter === "all"
              ? "Create broadcasts to send announcements and updates to creators in your campaigns."
              : `You don't have any ${activeFilter} broadcasts at the moment.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBroadcasts.map((broadcast) => (
            <div
              key={broadcast.id}
              className="group relative rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title and Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-sm truncate font-inter tracking-[-0.3px]">{broadcast.title}</h3>
                    {broadcast.status === "draft" && (
                      <Badge variant="outline" className="text-[10px] bg-muted/50 border-border">
                        <FileEdit className="h-2.5 w-2.5 mr-1" />
                        Draft
                      </Badge>
                    )}
                    {broadcast.status === "scheduled" && (
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        Scheduled
                      </Badge>
                    )}
                    {broadcast.status === "sent" && (
                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                        Sent
                      </Badge>
                    )}
                  </div>

                  {/* Content Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 tracking-[-0.2px]">{broadcast.content}</p>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                      <Users className="h-3 w-3" />
                      {broadcast.broadcast_type === "all" ? "All creators" :
                       broadcast.broadcast_type === "campaigns" ? "Campaigns" : "Boosts"}
                    </span>

                    {broadcast.sent_at && (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Sent {formatDistanceToNow(new Date(broadcast.sent_at), { addSuffix: true })}
                      </span>
                    )}

                    {broadcast.scheduled_at && broadcast.status === "scheduled" && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-blue-500" />
                        {format(new Date(broadcast.scheduled_at), "PPp")}
                      </span>
                    )}

                    {broadcast.read_count !== undefined && broadcast.read_count > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Eye className="h-3 w-3" />
                        {broadcast.read_count} {broadcast.read_count === 1 ? "read" : "reads"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(broadcast.status === "draft" || broadcast.status === "scheduled") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendNow(broadcast)}
                      className="h-8 gap-1.5 text-xs font-inter tracking-[-0.3px]"
                    >
                      <Zap className="h-3 w-3" />
                      Send Now
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteBroadcast(broadcast.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
