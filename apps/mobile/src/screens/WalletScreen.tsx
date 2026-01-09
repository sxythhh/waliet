import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PaymentLedgerEntry {
  id: string;
  source_type: 'campaign' | 'boost';
  source_id: string;
  status: 'pending' | 'clearing' | 'paid' | 'clawed_back';
  accrued_amount: number;
  paid_amount: number;
  payment_type: string;
  campaign_title?: string;
  created_at: string;
  clearing_ends_at?: string;
}

interface WalletSummary {
  available: number;
  pending: number;
  clearing: number;
  totalEarned: number;
}

function centsToDollars(cents: number): number {
  return cents / 100;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function getStatusColor(status: PaymentLedgerEntry['status']): string {
  switch (status) {
    case 'paid':
      return '#22c55e';
    case 'pending':
      return '#f59e0b';
    case 'clearing':
      return '#6366f1';
    case 'clawed_back':
      return '#ef4444';
    default:
      return '#888';
  }
}

function getStatusLabel(status: PaymentLedgerEntry['status']): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'pending':
      return 'Pending';
    case 'clearing':
      return 'Clearing';
    case 'clawed_back':
      return 'Reversed';
    default:
      return status;
  }
}

export function WalletScreen() {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async (): Promise<{ entries: PaymentLedgerEntry[]; summary: WalletSummary }> => {
      if (!user?.id) {
        return {
          entries: [],
          summary: { available: 0, pending: 0, clearing: 0, totalEarned: 0 },
        };
      }

      // Fetch payment ledger entries with campaign info
      const { data: entries, error } = await supabase
        .from('payment_ledger')
        .select(`
          id,
          source_type,
          source_id,
          status,
          accrued_amount,
          paid_amount,
          payment_type,
          created_at,
          clearing_ends_at,
          campaigns:source_id (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate summary from entries
      let available = 0;
      let pending = 0;
      let clearing = 0;
      let totalEarned = 0;

      const processedEntries = (entries || []).map((entry: any) => {
        const accrued = centsToDollars(entry.accrued_amount || 0);
        const paid = centsToDollars(entry.paid_amount || 0);
        const amount = accrued - paid;

        totalEarned += accrued;

        switch (entry.status) {
          case 'paid':
            // When status is 'paid', the full accrued amount is available
            available += accrued;
            break;
          case 'pending':
            pending += amount;
            break;
          case 'clearing':
            clearing += amount;
            break;
        }

        return {
          ...entry,
          campaign_title: entry.campaigns?.title || 'Unknown Campaign',
        };
      });

      return {
        entries: processedEntries,
        summary: { available, pending, clearing, totalEarned },
      };
    },
    enabled: !!user?.id,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderTransaction = ({ item }: { item: PaymentLedgerEntry }) => {
    const amount = centsToDollars((item.accrued_amount || 0) - (item.paid_amount || 0));
    const isPaid = item.status === 'paid';
    const displayAmount = isPaid
      ? centsToDollars(item.paid_amount || 0)
      : amount;

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: item.source_type === 'campaign' ? '#6366f1' : '#22c55e' }]}>
            <Icon
              name={item.source_type === 'campaign' ? 'video-outline' : 'rocket-launch-outline'}
              size={20}
              color="#fff"
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle} numberOfLines={1}>
              {item.campaign_title}
            </Text>
            <View style={styles.transactionMeta}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(item.status)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {getStatusLabel(item.status)}
                </Text>
              </View>
              <Text style={styles.transactionDate}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: isPaid ? '#22c55e' : '#f59e0b' },
          ]}
        >
          {isPaid ? '+' : ''}
          {formatCurrency(displayAmount)}
        </Text>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Wallet</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sign in to view your wallet</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Wallet</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Wallet</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading wallet</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { entries, summary } = data || { entries: [], summary: { available: 0, pending: 0, clearing: 0, totalEarned: 0 } };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Main Balance Card with iOS 26 Liquid Glass */}
      <View style={styles.balanceCard}>
        <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />
        <View style={styles.balanceCardOverlay}>
          <View style={styles.balanceLabelRow}>
            <Icon name="wallet" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(summary.available)}
          </Text>
          <TouchableOpacity style={styles.withdrawButton}>
            <Icon name="bank-transfer-out" size={18} color="#fff" style={styles.withdrawIcon} />
            <Text style={styles.withdrawButtonText}>Request Payout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Icon name="clock-outline" size={14} color="#f59e0b" />
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {formatCurrency(summary.pending)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Icon name="timer-sand" size={14} color="#6366f1" />
            <Text style={styles.statLabel}>Clearing</Text>
          </View>
          <Text style={[styles.statValue, { color: '#6366f1' }]}>
            {formatCurrency(summary.clearing)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Icon name="cash-check" size={14} color="#22c55e" />
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>
            {formatCurrency(summary.totalEarned)}
          </Text>
        </View>
      </View>

      {/* Transactions Header */}
      <View style={styles.transactionsHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="history" size={18} color="#fff" />
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        {entries.length > 0 && (
          <Text style={styles.transactionCount}>{entries.length} transactions</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Wallet</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyTransactions}>
            <Icon name="cash-remove" size={48} color="#333" />
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptySubtitle}>
              Apply to campaigns and start earning!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerContent: {
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  balanceCardOverlay: {
    padding: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  withdrawButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawIcon: {
    marginRight: 8,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  transactionCount: {
    fontSize: 13,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#333',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
  },
});
