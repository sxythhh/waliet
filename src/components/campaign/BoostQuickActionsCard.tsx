import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VideocamIcon from "@mui/icons-material/Videocam";
import StorefrontIcon from "@mui/icons-material/Storefront";
import DescriptionIcon from "@mui/icons-material/Description";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LogoutIcon from "@mui/icons-material/Logout";

interface BoostQuickActionsCardProps {
  boost: {
    id: string;
    brand_name?: string;
    brand_slug?: string;
    blueprint_id?: string | null;
  };
  onSubmitVideo: () => void;
  onLeaveBoost?: () => void;
  canSubmit?: boolean;
  className?: string;
}

export function BoostQuickActionsCard({
  boost,
  onSubmitVideo,
  onLeaveBoost,
  canSubmit = true,
  className
}: BoostQuickActionsCardProps) {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'submit-video',
      label: 'Submit Video',
      description: 'Submit a new video for this boost',
      icon: VideocamIcon,
      onClick: onSubmitVideo,
      disabled: !canSubmit,
      primary: true,
      show: true
    },
    {
      id: 'view-brand',
      label: 'View Brand',
      description: `Learn more about ${boost.brand_name || 'the brand'}`,
      icon: StorefrontIcon,
      onClick: () => {
        if (boost.brand_slug) {
          navigate(`/b/${boost.brand_slug}`);
        }
      },
      disabled: !boost.brand_slug,
      show: true
    },
    {
      id: 'view-blueprint',
      label: 'View Guidelines',
      description: 'Full content brief and guidelines',
      icon: DescriptionIcon,
      onClick: () => {
        if (boost.blueprint_id) {
          navigate(`/blueprint/${boost.blueprint_id}`);
        }
      },
      disabled: !boost.blueprint_id,
      show: !!boost.blueprint_id
    },
    {
      id: 'get-support',
      label: 'Get Support',
      description: 'Need help? Contact support',
      icon: SupportAgentIcon,
      onClick: () => navigate('/support'),
      disabled: false,
      show: true
    },
    {
      id: 'leave-boost',
      label: 'Leave Boost',
      description: 'Withdraw from this boost',
      icon: LogoutIcon,
      onClick: onLeaveBoost || (() => {}),
      disabled: !onLeaveBoost,
      danger: true,
      show: !!onLeaveBoost
    }
  ];

  const visibleActions = actions.filter(a => a.show);

  return (
    <div className={`rounded-2xl bg-card border border-border p-4 ${className || ""}`}>
      <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
        Quick Actions
      </h3>

      <div className="space-y-2">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          const isDanger = 'danger' in action && action.danger;
          return (
            <Button
              key={action.id}
              variant={action.primary ? "default" : "outline"}
              size="sm"
              className={`w-full justify-start h-auto py-2.5 px-3 ${
                action.primary
                  ? "bg-[#2061de] hover:bg-[#1a4db8] text-white border-t border-[#4b85f7]"
                  : isDanger
                    ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    : "hover:bg-muted/50"
              }`}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <Icon
                sx={{ fontSize: 18 }}
                className={`mr-2.5 flex-shrink-0 ${
                  action.primary
                    ? "text-white"
                    : isDanger
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              />
              <div className="text-left">
                <p className={`text-xs font-medium ${isDanger ? "text-destructive" : ""}`} style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  {action.label}
                </p>
                <p className={`text-[10px] ${
                  action.primary
                    ? "text-white/70"
                    : isDanger
                      ? "text-destructive/70"
                      : "text-muted-foreground"
                }`} style={{ fontFamily: 'Inter' }}>
                  {action.description}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
