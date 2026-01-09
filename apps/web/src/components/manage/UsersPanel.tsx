import { RefreshCw, Download, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";

interface UsersPanelProps {
  users: any[];
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export function UsersPanel({ users, loading, onRefresh, onExport }: UsersPanelProps) {
  const getPlatformLogo = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok': return tiktokLogo;
      case 'instagram': return instagramLogo;
      case 'youtube': return youtubeLogo;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Campaign Users</h3>
            <p className="text-xs text-muted-foreground">{users.length} users</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={onRefresh} 
            disabled={loading}
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button 
            onClick={onExport} 
            disabled={users.length === 0}
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/10 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-sm mb-1">
            {loading ? 'Loading users...' : 'No users loaded'}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Click "Refresh" to fetch campaign users
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div 
              key={user.user_id} 
              className="flex items-center justify-between p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.profile?.avatar_url ? (
                    <img 
                      src={user.profile.avatar_url} 
                      alt={user.profile?.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {user.profile?.username || 'Unknown'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      user.status === 'approved' 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {user.profile?.email && (
                      <span className="truncate max-w-[180px]">{user.profile.email}</span>
                    )}
                    {user.profile?.phone_number && (
                      <span>{user.profile.phone_number}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Accounts */}
              <div className="flex items-center gap-2 px-4">
                {user.social_accounts?.slice(0, 3).map((account: any) => (
                  <span 
                    key={account.id} 
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted/30 text-muted-foreground"
                  >
                    <img 
                      src={getPlatformLogo(account.platform)} 
                      alt={account.platform}
                      className="w-3.5 h-3.5 object-contain"
                    />
                    @{account.username}
                  </span>
                ))}
                {user.social_accounts && user.social_accounts.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{user.social_accounts.length - 3}
                  </span>
                )}
                {(!user.social_accounts || user.social_accounts.length === 0) && (
                  <span className="text-xs text-muted-foreground/50">No accounts</span>
                )}
              </div>

              {/* Earnings & Date */}
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-right">
                  <span className="text-sm font-semibold text-green-500 tabular-nums">
                    ${user.campaign_earnings?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="text-right min-w-[80px]">
                  <span className="text-xs text-muted-foreground">
                    {user.joined_at ? new Date(user.joined_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    }) : '-'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
