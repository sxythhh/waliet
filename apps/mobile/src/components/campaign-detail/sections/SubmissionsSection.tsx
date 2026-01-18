import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, borderRadius, spacing, typography } from '../../../theme/colors';
import { platformConfig } from '../../../hooks/useSocialAccounts';
import type { VideoSubmission } from '../../../hooks/useCampaignDetail';

interface SubmissionsSectionProps {
  submissions: VideoSubmission[];
  onRefresh: () => void;
  isLoading: boolean;
}

function formatViews(views: number | null): string {
  if (!views) return '0';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

function formatCurrency(amount: number | null): string {
  if (!amount) return '$0.00';
  return `$${(amount / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
    case 'paid':
      return colors.success;
    case 'pending':
    case 'reviewing':
      return colors.warning;
    case 'rejected':
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'paid':
      return 'Paid';
    case 'pending':
      return 'Pending';
    case 'reviewing':
      return 'Reviewing';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}

function SubmissionItem({ item }: { item: VideoSubmission }) {
  const handlePress = () => {
    if (item.video_url) {
      Linking.openURL(item.video_url);
    }
  };

  const platform = (item.platform?.toLowerCase() || 'tiktok') as keyof typeof platformConfig;
  const config = platformConfig[platform];
  const statusColor = getStatusColor(item.status);

  return (
    <TouchableOpacity style={styles.submissionItem} onPress={handlePress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Icon name="video-outline" size={24} color={colors.mutedForeground} />
          </View>
        )}
        {/* Platform Badge */}
        <View style={[styles.platformBadge, { backgroundColor: config?.bg || '#666' }]}>
          {config ? (
            <Image source={config.logoWhite} style={styles.platformLogo} resizeMode="contain" />
          ) : (
            <Icon name="web" size={12} color="#fff" />
          )}
        </View>
      </View>

      {/* Info */}
      <View style={styles.submissionInfo}>
        <View style={styles.submissionHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.submissionDate}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="eye-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.statValue}>{formatViews(item.views)}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="cash" size={14} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(item.payout_amount)}
            </Text>
          </View>
        </View>
      </View>

      <Icon name="open-in-new" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export function SubmissionsSection({
  submissions,
  onRefresh,
  isLoading,
}: SubmissionsSectionProps) {
  const totalViews = submissions.reduce((sum, s) => sum + (s.views || 0), 0);
  const totalEarnings = submissions.reduce((sum, s) => sum + (s.payout_amount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Summary */}
      {submissions.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{submissions.length}</Text>
            <Text style={styles.summaryLabel}>Videos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatViews(totalViews)}</Text>
            <Text style={styles.summaryLabel}>Views</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalEarnings)}
            </Text>
            <Text style={styles.summaryLabel}>Earned</Text>
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SubmissionItem item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="video-off-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No Submissions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Submit your first video to start earning
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
    fontSize: typography.sizes.lg,
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
    marginHorizontal: spacing.sm,
  },
  // List
  listContent: {
    paddingBottom: 120, // Extra space for floating submit button
  },
  // Submission Item
  submissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailContainer: {
    width: 64,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformLogo: {
    width: 12,
    height: 12,
  },
  submissionInfo: {
    flex: 1,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  submissionDate: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
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
