import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendDiscordDM, DiscordColors } from "@/utils/discordDM";
import { Bell } from "lucide-react";

interface SendDiscordDMExampleProps {
  userId: string;
}

/**
 * Example component showing how to send Discord DMs
 * You can copy this pattern anywhere in your app
 */
export function SendDiscordDMExample({ userId }: SendDiscordDMExampleProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendNotification = async () => {
    setLoading(true);
    
    try {
      const result = await sendDiscordDM({
        userId: userId,
        message: "🎉 You have a new notification from Virality!",
        embedTitle: "Campaign Update",
        embedDescription: "Your campaign has been approved and is now live!",
        embedColor: DiscordColors.GREEN
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Discord notification sent!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to send notification",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSendNotification}
      disabled={loading}
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {loading ? "Sending..." : "Send Discord Notification"}
    </Button>
  );
}
