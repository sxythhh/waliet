import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, borderRadius, spacing, typography } from '../../../theme/colors';
import { useAuth } from '../../../contexts/AuthContext';
import type { Member } from '../../../hooks/useCampaignDetail';

interface MembersSectionProps {
  members: Member[];
  onRefresh: () => void;
  isLoading: boolean;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

function getAvatarColor(name: string): string {
  const avatarColors = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
    '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
    '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

function getRankBadge(rank: number): { icon: string; color: string } | null {
  switch (rank) {
    case 1:
      return { icon: 'trophy', color: '#f5c518' }; // Gold
    case 2:
      return { icon: 'medal', color: '#a0aec0' }; // Silver
    case 3:
      return { icon: 'medal', color: '#cd7f32' }; // Bronze
    default:
      return null;
  }
}

interface MemberItemProps {
  member: Member;
  rank: number;
  isCurrentUser: boolean;
  onPress: () => void;
}

function MemberItem({ member, rank, isCurrentUser, onPress }: MemberItemProps) {
  const displayName = member.full_name || member.username || 'Creator';
  const rankBadge = getRankBadge(rank);

  return (
    <TouchableOpacity style={styles.memberItem} onPress={onPress} activeOpacity={0.7}>
      {/* Rank */}
      <View style={styles.rankContainer}>
        {rankBadge ? (
          <Icon name={rankBadge.icon} size={20} color={rankBadge.color} />
        ) : (
          <Text style={styles.rankNumber}>#{rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(displayName) }]}>
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.memberInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.memberName} numberOfLines={1}>
            {displayName}
          </Text>
          {isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>
        {member.username && (
          <Text style={styles.memberUsername}>@{member.username}</Text>
        )}
      </View>

      {/* Views */}
      <View style={styles.viewsContainer}>
        <Text style={styles.viewsValue}>{formatViews(member.total_views)}</Text>
        <Text style={styles.viewsLabel}>views</Text>
      </View>

      <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export function MembersSection({
  members,
  onRefresh,
  isLoading,
}: MembersSectionProps) {
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleMemberPress = (memberId: string) => {
    (navigation as any).navigate('UserProfile', { userId: memberId });
  };

  const totalViews = members.reduce((sum, m) => sum + m.total_views, 0);

  return (
    <View style={styles.container}>
      {/* Summary */}
      {members.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{members.length}</Text>
            <Text style={styles.summaryLabel}>Creators</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatViews(totalViews)}</Text>
            <Text style={styles.summaryLabel}>Total Views</Text>
          </View>
        </View>
      )}

      {/* Leaderboard */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <MemberItem
            member={item}
            rank={index + 1}
            isCurrentUser={item.id === user?.id}
            onPress={() => handleMemberPress(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          members.length > 0 ? (
            <Text style={styles.listHeader}>Ranked by Views</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="account-group-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No Members Yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to submit a video!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  // Summary
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  // List
  listContent: {
    paddingBottom: 120, // Extra space for floating submit button
  },
  listHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  // Member Item
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.mutedForeground,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
    maxWidth: '70%',
  },
  youBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  youBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  memberUsername: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  viewsContainer: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  viewsValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
  },
  viewsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
  },
  // Empty State
  emptyState: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
});
