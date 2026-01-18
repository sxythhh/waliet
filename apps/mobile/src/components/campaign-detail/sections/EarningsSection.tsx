import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, borderRadius, spacing, typography } from '../../../theme/colors';
import type { EarningTransaction } from '../../../hooks/useCampaignDetail';

interface EarningsSectionProps {
  earnings: EarningTransaction[];
  totalEarnings: number;
  onRefresh: () => void;
  isLoading: boolean;
}

function formatCurrency(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EarningItem({ item }: { item: EarningTransaction }) {
  const isPending = item.status !== 'completed';

  return (
    <View style={styles.earningItem}>
      <View style={[styles.earningIcon, isPending && styles.earningIconPending]}>
        <Icon
          name={isPending ? 'clock-outline' : 'check'}
          size={18}
          color={isPending ? colors.warning : colors.success}
        />
      </View>
      <View style={styles.earningInfo}>
        <Text style={styles.earningType}>
          {item.type === 'video_payout' ? 'Video Payout' : item.type}
        </Text>
        <Text style={styles.earningDate}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={styles.earningAmountContainer}>
        <Text style={[styles.earningAmount, isPending && styles.earningAmountPending]}>
          +{formatCurrency(item.amount)}
        </Text>
        {isPending && <Text style={styles.pendingLabel}>Pending</Text>}
      </View>
    </View>
  );
}

export function EarningsSection({
  earnings,
  totalEarnings,
  onRefresh,
  isLoading,
}: EarningsSectionProps) {
  const pendingEarnings = earnings
    .filter((e) => e.status !== 'completed')
    .reduce((sum, e) => sum + e.amount, 0);

  const paidEarnings = totalEarnings - pendingEarnings;

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Earned</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalEarnings)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(paidEarnings)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {formatCurrency(pendingEarnings)}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <Text style={styles.listTitle}>Transaction History</Text>
      <FlatList
        data={earnings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EarningItem item={item} />}
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
            <Icon name="cash-remove" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No Earnings Yet</Text>
            <Text style={styles.emptySubtitle}>
              Submit videos to start earning
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
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  // List
  listTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: 120, // Extra space for floating submit button
  },
  // Earning Item
  earningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  earningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  earningIconPending: {
    backgroundColor: colors.warningMuted,
  },
  earningInfo: {
    flex: 1,
  },
  earningType: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  earningDate: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  earningAmountContainer: {
    alignItems: 'flex-end',
  },
  earningAmount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.success,
  },
  earningAmountPending: {
    color: colors.warning,
  },
  pendingLabel: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
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
