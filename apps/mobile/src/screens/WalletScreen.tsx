import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { LogoLoader } from '../components/LogoLoader';
import { PayoutRequestSheet } from '../components/PayoutRequestSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_WIDTH = SCREEN_WIDTH * 0.85;

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: 'earning' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'team_earning' | 'affiliate_earning' | 'bonus' | 'balance_correction';
  status: 'pending' | 'completed' | 'failed' | 'in_transit' | 'rejected';
  description: string | null;
  created_at: string;
  metadata: {
    campaign_id?: string;
    boost_id?: string;
    video_url?: string;
    recipient_id?: string;
    sender_id?: string;
  } | null;
  // Enriched data
  campaign_title?: string;
  boost_title?: string;
  other_user?: UserProfile; // For P2P transfers
}

interface WalletSummary {
  available: number;
  pending: number;
  totalEarned: number;
  totalWithdrawn: number;
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
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

function getStatusLabel(status: WalletTransaction['status']): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'in_transit':
      return 'In Transit';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

function getTransactionIcon(type: WalletTransaction['type']): string {
  switch (type) {
    case 'earning':
      return 'cash-plus';
    case 'withdrawal':
      return 'bank-transfer-out';
    case 'transfer_sent':
      return 'send';
    case 'transfer_received':
      return 'call-received';
    case 'team_earning':
      return 'account-group';
    case 'affiliate_earning':
      return 'share-variant';
    case 'bonus':
      return 'gift';
    default:
      return 'cash';
  }
}

function getTransactionTypeLabel(type: WalletTransaction['type']): string {
  switch (type) {
    case 'earning':
      return 'Video Earning';
    case 'withdrawal':
      return 'Withdrawal';
    case 'transfer_sent':
      return 'Transfer Sent';
    case 'transfer_received':
      return 'Transfer Received';
    case 'team_earning':
      return 'Team Earning';
    case 'affiliate_earning':
      return 'Referral Bonus';
    case 'bonus':
      return 'Bonus';
    case 'balance_correction':
      return 'Balance Adjustment';
    default:
      return 'Transaction';
  }
}

function getAvatarColor(name: string): string {
  const avatarColors = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
    '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

// Transaction Detail Sheet Component
function TransactionDetailSheet({
  transaction,
  visible,
  onClose,
}: {
  transaction: WalletTransaction | null;
  visible: boolean;
  onClose: () => void;
}) {
  const translateX = useSharedValue(SCREEN_WIDTH);
  const dragStartX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(SCREEN_WIDTH - SHEET_WIDTH, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
    setTimeout(onClose, 250);
  }, [onClose, translateX]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragStartX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newX = Math.max(SCREEN_WIDTH - SHEET_WIDTH, dragStartX.value + event.translationX);
      translateX.value = newX;
    })
    .onEnd((event) => {
      if (event.translationX > 50 || event.velocityX > 500) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
        runOnJS(onClose)();
      } else {
        translateX.value = withTiming(SCREEN_WIDTH - SHEET_WIDTH, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!transaction) return null;

  const amount = Number(transaction.amount) || 0;
  const isPositive = amount > 0;
  const isP2P = transaction.type === 'transfer_sent' || transaction.type === 'transfer_received';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      {visible && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity
            style={sheetStyles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
      )}

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[sheetStyles.sheet, sheetStyle]}>
          {/* Handle */}
          <View style={sheetStyles.handleContainer}>
            <View style={sheetStyles.handle} />
          </View>

          {/* Header */}
          <View style={sheetStyles.header}>
            <View style={[sheetStyles.iconContainer, { backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
              <Icon
                name={getTransactionIcon(transaction.type)}
                size={28}
                color={isPositive ? '#22c55e' : '#ef4444'}
              />
            </View>
            <Text style={sheetStyles.typeLabel}>{getTransactionTypeLabel(transaction.type)}</Text>
            <Text style={[sheetStyles.amount, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
              {isPositive ? '+' : '-'}{formatCurrency(amount)}
            </Text>
          </View>

          {/* Details */}
          <View style={sheetStyles.details}>
            {/* P2P User */}
            {isP2P && transaction.other_user && (
              <View style={sheetStyles.detailRow}>
                <Text style={sheetStyles.detailLabel}>
                  {transaction.type === 'transfer_sent' ? 'Sent to' : 'Received from'}
                </Text>
                <View style={sheetStyles.userInfo}>
                  {transaction.other_user.avatar_url ? (
                    <Image
                      source={{ uri: transaction.other_user.avatar_url }}
                      style={sheetStyles.avatar}
                    />
                  ) : (
                    <View style={[sheetStyles.avatarPlaceholder, { backgroundColor: getAvatarColor(transaction.other_user.full_name || 'U') }]}>
                      <Text style={sheetStyles.avatarText}>
                        {(transaction.other_user.full_name || transaction.other_user.username || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={sheetStyles.userName}>
                    {transaction.other_user.full_name || transaction.other_user.username || 'User'}
                  </Text>
                </View>
              </View>
            )}

            {/* Status */}
            <View style={sheetStyles.detailRow}>
              <Text style={sheetStyles.detailLabel}>Status</Text>
              <View style={[
                sheetStyles.statusBadge,
                transaction.status === 'completed' && sheetStyles.statusCompleted,
                transaction.status === 'pending' && sheetStyles.statusPending,
                transaction.status === 'failed' && sheetStyles.statusFailed,
                transaction.status === 'rejected' && sheetStyles.statusFailed,
              ]}>
                <Text style={sheetStyles.statusText}>{getStatusLabel(transaction.status)}</Text>
              </View>
            </View>

            {/* Date */}
            <View style={sheetStyles.detailRow}>
              <Text style={sheetStyles.detailLabel}>Date</Text>
              <Text style={sheetStyles.detailValue}>
                {new Date(transaction.created_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Campaign/Boost */}
            {(transaction.campaign_title || transaction.boost_title) && (
              <View style={sheetStyles.detailRow}>
                <Text style={sheetStyles.detailLabel}>Source</Text>
                <Text style={sheetStyles.detailValue}>
                  {transaction.campaign_title || transaction.boost_title}
                </Text>
              </View>
            )}

            {/* Description */}
            {transaction.description && (
              <View style={sheetStyles.detailRow}>
                <Text style={sheetStyles.detailLabel}>Note</Text>
                <Text style={sheetStyles.detailValue}>{transaction.description}</Text>
              </View>
            )}

            {/* Transaction ID */}
            <View style={sheetStyles.detailRow}>
              <Text style={sheetStyles.detailLabel}>Transaction ID</Text>
              <Text style={[sheetStyles.detailValue, { fontSize: 12 }]}>
                {transaction.id.slice(0, 8)}...{transaction.id.slice(-4)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHEET_WIDTH,
    backgroundColor: colors.card,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingTop: 60,
  },
  handle: {
    width: 4,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'absolute',
    left: 8,
    top: '50%',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  details: {
    padding: 24,
    gap: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
    textAlign: 'right',
    maxWidth: '60%',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.muted,
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  statusFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
});

export function WalletScreen() {
  const { user } = useAuth();
  const [showPayoutSheet, setShowPayoutSheet] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [showTransactionSheet, setShowTransactionSheet] = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async (): Promise<{ transactions: WalletTransaction[]; summary: WalletSummary }> => {
      if (!user?.id) {
        return {
          transactions: [],
          summary: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
        };
      }

      // Fetch wallet balance directly from wallets table (source of truth)
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance, total_earned, total_withdrawn')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new users
        throw walletError;
      }

      // Fetch wallet transactions for transaction history
      const { data: transactions, error: txError } = await supabase
        .from('wallet_transactions')
        .select('id, amount, type, status, description, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;

      // Extract campaign, boost, and user IDs from metadata
      const campaignIds: string[] = [];
      const boostIds: string[] = [];
      const userIds: string[] = [];

      (transactions || []).forEach((tx: any) => {
        const metadata = tx.metadata as WalletTransaction['metadata'];
        if (metadata?.campaign_id && !campaignIds.includes(metadata.campaign_id)) {
          campaignIds.push(metadata.campaign_id);
        }
        if (metadata?.boost_id && !boostIds.includes(metadata.boost_id)) {
          boostIds.push(metadata.boost_id);
        }
        // Collect user IDs for P2P transfers
        if (tx.type === 'transfer_sent' && metadata?.recipient_id && !userIds.includes(metadata.recipient_id)) {
          userIds.push(metadata.recipient_id);
        }
        if (tx.type === 'transfer_received' && metadata?.sender_id && !userIds.includes(metadata.sender_id)) {
          userIds.push(metadata.sender_id);
        }
      });

      // Fetch campaign, boost titles, and user profiles
      const [campaignsData, boostsData, usersData] = await Promise.all([
        campaignIds.length > 0
          ? supabase.from('campaigns').select('id, title').in('id', campaignIds)
          : { data: [] },
        boostIds.length > 0
          ? supabase.from('bounty_campaigns').select('id, title').in('id', boostIds)
          : { data: [] },
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds)
          : { data: [] },
      ]);

      const campaignTitles: Record<string, string> = {};
      const boostTitles: Record<string, string> = {};
      const userProfiles: Record<string, UserProfile> = {};
      (campaignsData.data || []).forEach((c: any) => { campaignTitles[c.id] = c.title; });
      (boostsData.data || []).forEach((b: any) => { boostTitles[b.id] = b.title; });
      (usersData.data || []).forEach((u: any) => { userProfiles[u.id] = u; });

      // Calculate pending withdrawals
      let pending = 0;

      const processedTransactions: WalletTransaction[] = (transactions || []).map((tx: any) => {
        const metadata = tx.metadata as WalletTransaction['metadata'];

        // Track pending amounts
        if (tx.status === 'pending' || tx.status === 'in_transit') {
          if (tx.type === 'withdrawal') {
            pending += Math.abs(Number(tx.amount) || 0);
          }
        }

        // Get other user for P2P transfers
        let otherUser: UserProfile | undefined;
        if (tx.type === 'transfer_sent' && metadata?.recipient_id) {
          otherUser = userProfiles[metadata.recipient_id];
        } else if (tx.type === 'transfer_received' && metadata?.sender_id) {
          otherUser = userProfiles[metadata.sender_id];
        }

        return {
          ...tx,
          campaign_title: metadata?.campaign_id ? campaignTitles[metadata.campaign_id] : undefined,
          boost_title: metadata?.boost_id ? boostTitles[metadata.boost_id] : undefined,
          other_user: otherUser,
        };
      });

      // Use wallet table for balance totals (source of truth) - amounts are in dollars
      const available = Number(walletData?.balance) || 0;
      const totalEarned = Number(walletData?.total_earned) || 0;
      const totalWithdrawn = Number(walletData?.total_withdrawn) || 0;

      return {
        transactions: processedTransactions,
        summary: { available, pending, totalEarned, totalWithdrawn },
      };
    },
    enabled: !!user?.id,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTransactionPress = useCallback((transaction: WalletTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionSheet(true);
  }, []);

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const amount = Number(item.amount) || 0;
    const isPositive = amount > 0;
    const isP2P = item.type === 'transfer_sent' || item.type === 'transfer_received';

    // Determine display title based on type and available metadata
    let displayTitle = item.description || getTransactionTypeLabel(item.type);
    if (item.campaign_title) {
      displayTitle = item.campaign_title;
    } else if (item.boost_title) {
      displayTitle = item.boost_title;
    } else if (isP2P && item.other_user) {
      displayTitle = item.type === 'transfer_sent'
        ? `To ${item.other_user.full_name || item.other_user.username || 'User'}`
        : `From ${item.other_user.full_name || item.other_user.username || 'User'}`;
    }

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => handleTransactionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionLeft}>
          {/* Show profile picture for P2P, icon for others */}
          {isP2P && item.other_user ? (
            item.other_user.avatar_url ? (
              <Image
                source={{ uri: item.other_user.avatar_url }}
                style={styles.transactionAvatar}
              />
            ) : (
              <View style={[styles.transactionAvatarPlaceholder, { backgroundColor: getAvatarColor(item.other_user.full_name || 'U') }]}>
                <Text style={styles.transactionAvatarText}>
                  {(item.other_user.full_name || item.other_user.username || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )
          ) : (
            <View style={styles.transactionIcon}>
              <Icon
                name={getTransactionIcon(item.type)}
                size={20}
                color={colors.foreground}
              />
            </View>
          )}
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            <View style={styles.transactionMeta}>
              <Text style={styles.statusText}>
                {getStatusLabel(item.status)}
              </Text>
              <Text style={styles.transactionDate}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: isPositive ? '#22c55e' : colors.foreground }]}>
            {isPositive ? '+' : '-'}{formatCurrency(amount)}
          </Text>
          <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
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
          <LogoLoader size={56} />
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

  const { transactions, summary } = data || { transactions: [], summary: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 } };

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
          <TouchableOpacity style={styles.withdrawButton} onPress={() => setShowPayoutSheet(true)}>
            <Icon name="bank-transfer-out" size={18} color={colors.foreground} style={styles.withdrawIcon} />
            <Text style={styles.withdrawButtonText}>Request Payout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Earned</Text>
          <Text style={styles.statValue}>
            {formatCurrency(summary.totalEarned)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Withdrawn</Text>
          <Text style={styles.statValue}>
            {formatCurrency(summary.totalWithdrawn)}
          </Text>
        </View>
        {summary.pending > 0 && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>
              {formatCurrency(summary.pending)}
            </Text>
          </View>
        )}
      </View>

      {/* Transactions Header */}
      <View style={styles.transactionsHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="history" size={18} color={colors.foreground} />
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        {transactions.length > 0 && (
          <Text style={styles.transactionCount}>{transactions.length} transactions</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Wallet</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyTransactions}>
            <Icon name="cash-remove" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptySubtitle}>
              Apply to campaigns and start earning!
            </Text>
          </View>
        }
      />

      {/* Payout Request Sheet */}
      <PayoutRequestSheet
        visible={showPayoutSheet}
        onClose={() => setShowPayoutSheet(false)}
        availableBalance={summary.available}
      />

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        transaction={selectedTransaction}
        visible={showTransactionSheet}
        onClose={() => {
          setShowTransactionSheet(false);
          setTimeout(() => setSelectedTransaction(null), 300);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    letterSpacing: -0.5,
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
    color: colors.destructive,
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  balanceCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${colors.primary}80`,
  },
  balanceCardOverlay: {
    padding: 24,
    backgroundColor: colors.glassBg,
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
    color: colors.foreground,
    marginBottom: 16,
    letterSpacing: -1,
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
    color: colors.foreground,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
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
    color: colors.foreground,
  },
  transactionCount: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  transactionAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  transactionIconText: {
    color: colors.mutedForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    color: colors.foreground,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 16,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.muted,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
