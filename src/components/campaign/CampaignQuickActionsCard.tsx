import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ChevronRight } from "lucide-react";

interface CampaignQuickActionsCardProps {
  campaign: {
    id: string;
    brand_name: string;
    brand_slug?: string;
    blueprint_id?: string | null;
    payment_model?: string | null;
    slug?: string;
  };
  hasConnectedAccounts: boolean;
  onSubmitVideo: () => void;
  onLeaveCampaign?: () => void;
  className?: string;
}

export function CampaignQuickActionsCard({
  campaign,
  hasConnectedAccounts,
  onSubmitVideo,
  onLeaveCampaign,
  className
}: CampaignQuickActionsCardProps) {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'submit-video',
      label: 'Submit Video',
      description: 'Submit a new video for this campaign',
      icon: 'material-symbols:videocam',
      onClick: onSubmitVideo,
      disabled: !hasConnectedAccounts || campaign.payment_model !== 'pay_per_post',
      show: campaign.payment_model === 'pay_per_post'
    },
    {
      id: 'view-brand',
      label: 'View Brand',
      description: `Learn more about ${campaign.brand_name}`,
      icon: 'material-symbols:storefront',
      onClick: () => {
        if (campaign.brand_slug) {
          navigate(`/b/${campaign.brand_slug}`);
        }
      },
      disabled: !campaign.brand_slug,
      show: true
    },
    {
      id: 'view-blueprint',
      label: 'View Guidelines',
      description: 'Full content brief and guidelines',
      icon: 'material-symbols:description',
      onClick: () => {
        if (campaign.blueprint_id) {
          navigate(`/blueprint/${campaign.blueprint_id}`);
        }
      },
      disabled: !campaign.blueprint_id,
      show: !!campaign.blueprint_id
    },
    {
      id: 'campaign-page',
      label: 'Campaign Page',
      description: 'View public campaign page',
      icon: 'material-symbols:open-in-new',
      onClick: () => {
        if (campaign.slug) {
          window.open(`/c/${campaign.slug}`, '_blank');
        }
      },
      disabled: !campaign.slug,
      show: !!campaign.slug
    },
    {
      id: 'get-support',
      label: 'Get Support',
      description: 'Need help? Contact support',
      icon: 'material-symbols:support-agent',
      onClick: () => navigate('/support'),
      disabled: false,
      show: true
    },
    {
      id: 'leave-campaign',
      label: 'Leave Campaign',
      description: 'Withdraw from this campaign',
      icon: 'material-symbols:logout',
      onClick: onLeaveCampaign || (() => {}),
      disabled: !onLeaveCampaign,
      danger: true,
      show: !!onLeaveCampaign
    }
  ];

  const visibleActions = actions.filter(a => a.show);

  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      {visibleActions.map((action) => {
        const isDanger = 'danger' in action && action.danger;
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`group relative flex items-center gap-3 p-3 rounded-lg w-full text-left transition-all duration-200 ${
              action.disabled
                ? "opacity-50 cursor-not-allowed bg-muted/20 dark:bg-muted/30"
                : isDanger
                  ? "bg-white border border-border dark:border-0 dark:bg-muted/50 hover:bg-destructive/5 dark:hover:bg-destructive/10"
                  : "bg-white border border-border dark:border-0 dark:bg-muted/50 hover:bg-muted/30 dark:hover:bg-muted/70"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
              isDanger ? "bg-destructive/10" : "bg-muted dark:bg-muted/80"
            }`}>
              <Icon
                icon={action.icon}
                className={`w-4 h-4 ${isDanger ? "text-destructive" : "text-foreground"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-semibold font-inter tracking-[-0.3px] block ${
                isDanger ? "text-destructive" : "text-foreground"
              }`}>
                {action.label}
              </span>
              <span className={`text-[10px] font-inter tracking-[-0.2px] block truncate ${
                isDanger ? "text-destructive/70" : "text-muted-foreground"
              }`}>
                {action.description}
              </span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 group-hover:translate-x-0.5 transition-all ${
              isDanger ? "text-destructive/50" : "text-muted-foreground"
            }`} />
          </button>
        );
      })}
    </div>
  );
}
