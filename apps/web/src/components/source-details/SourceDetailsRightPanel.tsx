import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSourceDetails } from "./SourceDetailsSidebarProvider";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import { Pin, ChevronDown, ChevronUp, TrendingUp, Calendar, DollarSign, Video, Clock } from "lucide-react";

// Types
interface MemberEntry {
  id: string;
  name: string;
  avatar_url?: string | null;
  username?: string;
  views?: number;
  joined_at?: string;
}

interface Announcement {
  id: string;
  content: string;
  created_at: string;
  is_pinned?: boolean;
  reactions?: {
    emoji: string;
    count: number;
    hasReacted?: boolean;
  }[];
}

interface CreatorStats {
  views: number;
  earnings: number;
  videos: number;
  percentile?: number; // e.g. 15 means "Top 15%"
}

interface Deadline {
  id: string;
  label: string;
  date: string;
  type: 'payout' | 'submission' | 'campaign_end';
}

interface SourceDetailsRightPanelProps {
  className?: string;
  // Members data
  members?: MemberEntry[];
  memberCount?: number;
  currentUserId?: string;
  // New sections
  announcements?: Announcement[];
  creatorStats?: CreatorStats;
  deadlines?: Deadline[];
  // Callbacks
  onReaction?: (announcementId: string, emoji: string) => void;
}

// Helper functions
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-rose-500/80",
    "bg-pink-500/80",
    "bg-fuchsia-500/80",
    "bg-purple-500/80",
    "bg-violet-500/80",
    "bg-indigo-500/80",
    "bg-blue-500/80",
    "bg-sky-500/80",
    "bg-cyan-500/80",
    "bg-teal-500/80",
    "bg-emerald-500/80",
    "bg-green-500/80",
    "bg-lime-500/80",
    "bg-yellow-500/80",
    "bg-amber-500/80",
    "bg-orange-500/80",
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Section Header Component
function SectionHeader({
  title,
  count,
  collapsed,
  onToggle
}: {
  title: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 transition-colors group"
    >
      <h3 className="text-[11px] font-semibold text-muted-foreground/70 group-hover:text-foreground font-inter tracking-[-0.5px] transition-colors">
        {title}
      </h3>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="text-[11px] font-semibold text-muted-foreground/50 group-hover:text-foreground font-inter tracking-[-0.5px] tabular-nums transition-colors">
            {count > 0 ? count.toLocaleString() : "—"}
          </span>
        )}
        {onToggle && (
          collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
          )
        )}
      </div>
    </button>
  );
}

// Announcements Section
function AnnouncementsSection({
  announcements,
  onReaction
}: {
  announcements: Announcement[];
  onReaction?: (announcementId: string, emoji: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pinnedAnnouncements = announcements.filter(a => a.is_pinned);
  const regularAnnouncements = announcements.filter(a => !a.is_pinned);
  const sortedAnnouncements = [...pinnedAnnouncements, ...regularAnnouncements].slice(0, 3);

  const REACTION_EMOJIS = ['👍', '❤️', '🔥', '🎉'];

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border/40">
      <SectionHeader
        title="Announcements"
        count={announcements.length}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {sortedAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className={cn(
                "p-3 rounded-lg transition-all",
                announcement.is_pinned
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-muted/30 dark:bg-muted/20"
              )}
            >
              {/* Pinned indicator */}
              {announcement.is_pinned && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Pin className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[9px] font-medium text-primary font-inter tracking-[-0.5px]">
                    Pinned
                  </span>
                </div>
              )}

              {/* Content */}
              <p className="text-[12px] text-foreground/90 font-inter tracking-[-0.5px] leading-relaxed line-clamp-3">
                {announcement.content}
              </p>

              {/* Timestamp */}
              <p className="text-[10px] text-muted-foreground/50 font-inter tracking-[-0.5px] mt-1.5">
                {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
              </p>

              {/* Reactions */}
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {announcement.reactions?.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => onReaction?.(announcement.id, reaction.emoji)}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] transition-all",
                      reaction.hasReacted
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-muted/50 hover:bg-muted/80 border border-transparent"
                    )}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="font-inter tracking-[-0.5px] font-medium tabular-nums">{reaction.count}</span>
                  </button>
                ))}
                {/* Add reaction button */}
                <div className="flex items-center gap-0.5 ml-1">
                  {REACTION_EMOJIS.filter(e => !announcement.reactions?.some(r => r.emoji === e)).slice(0, 2).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReaction?.(announcement.id, emoji)}
                      className="p-1 rounded-full text-[10px] opacity-40 hover:opacity-100 hover:bg-muted/50 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stats Section
function StatsSection({ stats }: { stats: CreatorStats }) {
  const [collapsed, setCollapsed] = useState(false);

  const getPercentileBadge = (percentile: number) => {
    if (percentile <= 10) return { label: `Top ${percentile}%`, color: "text-amber-500 bg-amber-500/10" };
    if (percentile <= 25) return { label: `Top ${percentile}%`, color: "text-emerald-500 bg-emerald-500/10" };
    if (percentile <= 50) return { label: `Top ${percentile}%`, color: "text-blue-500 bg-blue-500/10" };
    return { label: `Top ${percentile}%`, color: "text-muted-foreground bg-muted/50" };
  };

  const percentileBadge = stats.percentile ? getPercentileBadge(stats.percentile) : null;

  return (
    <div className="border-b border-border/40">
      <SectionHeader
        title="Your Stats"
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Views */}
            <div className="p-2.5 rounded-lg bg-muted/30 dark:bg-muted/20 text-center">
              <p className="text-[13px] font-semibold text-foreground font-inter tracking-[-0.5px]">
                {formatNumber(stats.views)}
              </p>
              <p className="text-[9px] text-muted-foreground/60 font-inter tracking-[-0.5px]">
                Views
              </p>
            </div>

            {/* Earnings */}
            <div className="p-2.5 rounded-lg bg-muted/30 dark:bg-muted/20 text-center">
              <p className="text-[13px] font-semibold text-foreground font-inter tracking-[-0.5px]">
                ${stats.earnings.toFixed(0)}
              </p>
              <p className="text-[9px] text-muted-foreground/60 font-inter tracking-[-0.5px]">
                Earned
              </p>
            </div>

            {/* Videos */}
            <div className="p-2.5 rounded-lg bg-muted/30 dark:bg-muted/20 text-center">
              <p className="text-[13px] font-semibold text-foreground font-inter tracking-[-0.5px]">
                {stats.videos}
              </p>
              <p className="text-[9px] text-muted-foreground/60 font-inter tracking-[-0.5px]">
                Videos
              </p>
            </div>
          </div>

          {/* Percentile Badge */}
          {percentileBadge && (
            <div className={cn(
              "mt-2 px-3 py-2 rounded-lg flex items-center justify-center gap-1.5",
              percentileBadge.color
            )}>
              <TrendingUp className="h-3 w-3" />
              <span className="text-[11px] font-semibold tracking-[-0.5px]">
                {percentileBadge.label}
              </span>
              <span className="text-[10px] opacity-70">of creators</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Deadlines Section
function DeadlinesSection({ deadlines }: { deadlines: Deadline[] }) {
  const [collapsed, setCollapsed] = useState(false);

  // Sort by date, upcoming first
  const sortedDeadlines = [...deadlines]
    .filter(d => !isPast(new Date(d.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  if (sortedDeadlines.length === 0) {
    return null;
  }

  const getDeadlineIcon = (type: Deadline['type']) => {
    switch (type) {
      case 'payout': return DollarSign;
      case 'submission': return Video;
      case 'campaign_end': return Clock;
      default: return Calendar;
    }
  };

  const getDeadlineColor = (type: Deadline['type']) => {
    switch (type) {
      case 'payout': return 'text-emerald-500';
      case 'submission': return 'text-amber-500';
      case 'campaign_end': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="border-b border-border/40">
      <SectionHeader
        title="Upcoming"
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {sortedDeadlines.map((deadline) => {
            const Icon = getDeadlineIcon(deadline.type);
            const daysUntil = differenceInDays(new Date(deadline.date), new Date());
            const isUrgent = daysUntil <= 3;

            return (
              <div
                key={deadline.id}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-lg transition-all",
                  isUrgent ? "bg-red-500/5 border border-red-500/20" : "bg-muted/30 dark:bg-muted/20"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                  isUrgent ? "bg-red-500/10" : "bg-muted/50"
                )}>
                  <Icon className={cn("h-3.5 w-3.5", getDeadlineColor(deadline.type))} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground font-inter tracking-[-0.5px] truncate">
                    {deadline.label}
                  </p>
                  <p className={cn(
                    "text-[10px] font-inter tracking-[-0.5px]",
                    isUrgent ? "text-red-500 font-medium" : "text-muted-foreground/60"
                  )}>
                    {daysUntil === 0
                      ? "Today"
                      : daysUntil === 1
                        ? "Tomorrow"
                        : `${daysUntil} days`
                    } · {format(new Date(deadline.date), 'MMM d')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Member Row - Original design with online indicator, username, and views/date
function MemberRow({ member, isCurrentUser }: { member: MemberEntry; isCurrentUser?: boolean }) {
  const handleClick = () => {
    if (member.username) {
      window.open(`/${member.username}`, '_blank');
    }
  };

  // Format views
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  // Format join date
  const formatJoinDate = (date: string) => {
    return format(new Date(date), 'MMM d');
  };

  return (
    <button
      onClick={handleClick}
      disabled={!member.username}
      className={cn(
        "flex items-center gap-2.5 py-2 px-2 rounded-lg transition-all w-full text-left group",
        "hover:bg-muted/40",
        isCurrentUser && "bg-primary/5",
        member.username ? "cursor-pointer" : "cursor-default"
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full overflow-hidden",
          !member.avatar_url && getAvatarColor(member.name)
        )}>
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[11px] font-semibold text-white font-inter tracking-[-0.5px]">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
      </div>

      {/* Name and username */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[12px] font-medium truncate font-inter tracking-[-0.5px]",
          isCurrentUser ? "text-primary" : "text-foreground/90",
          member.username && "group-hover:underline"
        )}>
          {member.name}
          {isCurrentUser && (
            <span className="ml-1 text-[9px] text-primary/60 font-medium">(you)</span>
          )}
        </p>
        {member.username && (
          <p className="text-[10px] text-muted-foreground/50 font-inter tracking-[-0.5px] truncate">
            @{member.username}
          </p>
        )}
      </div>

      {/* Views or join date */}
      <div className="flex-shrink-0 text-right">
        {member.views !== undefined && member.views > 0 ? (
          <p className="text-[10px] text-muted-foreground/60 font-inter tracking-[-0.5px] tabular-nums">
            {formatViews(member.views)}
          </p>
        ) : member.joined_at ? (
          <p className="text-[10px] text-muted-foreground/50 font-inter">
            {formatJoinDate(member.joined_at)}
          </p>
        ) : null}
      </div>
    </button>
  );
}

// Members Section
function MembersSection({
  members,
  memberCount,
  currentUserId
}: {
  members: MemberEntry[];
  memberCount: number;
  currentUserId?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Sort: current user first
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  const displayMembers = sortedMembers.slice(0, 8);
  const hasMoreMembers = memberCount > displayMembers.length;

  return (
    <div>
      <SectionHeader
        title="Members"
        count={memberCount}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {!collapsed && (
        <div className="px-2 pb-3">
          {displayMembers.length > 0 ? (
            <div className="space-y-0.5">
              {displayMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isCurrentUser={member.id === currentUserId}
                />
              ))}

              {hasMoreMembers && (
                <button className="w-full py-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground font-inter tracking-[-0.5px] transition-colors mt-1">
                  +{(memberCount - displayMembers.length).toLocaleString()} more
                </button>
              )}
            </div>
          ) : (
            <div className="py-6 px-3 text-center">
              <p className="text-[11px] text-muted-foreground/50 font-inter">
                {memberCount > 0 ? `${memberCount} members` : "Be the first to join"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Component
export function SourceDetailsRightPanel({
  className,
  members = [],
  memberCount = 0,
  currentUserId,
  announcements = [],
  creatorStats,
  deadlines = [],
  onReaction,
}: SourceDetailsRightPanelProps) {
  const { sourceType } = useSourceDetails();

  return (
    <aside
      className={cn(
        "w-64 h-full flex-shrink-0 bg-white dark:bg-background overflow-y-auto border-l border-border/40",
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Announcements Section */}
        {announcements.length > 0 && (
          <AnnouncementsSection
            announcements={announcements}
            onReaction={onReaction}
          />
        )}

        {/* Stats Section */}
        {creatorStats && (
          <StatsSection stats={creatorStats} />
        )}

        {/* Deadlines Section */}
        {deadlines.length > 0 && (
          <DeadlinesSection deadlines={deadlines} />
        )}

        {/* Members Section */}
        <MembersSection
          members={members}
          memberCount={memberCount}
          currentUserId={currentUserId}
        />
      </div>
    </aside>
  );
}
