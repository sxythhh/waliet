import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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
import { LogoLoader } from '../components/LogoLoader';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REFERRAL_SHEET_HEIGHT = 450;

// Types
interface JoinedCampaign {
  id: string;
  campaign_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  submitted_at: string;
  total_earned?: number;
  campaign: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
    rpm_rate: number;
    status: string;
  };
}

interface WalletData {
  balance: number;
  totalEarned: number;
  transactions: Array<{
    amount: number;
    created_at: string;
    type: string;
  }>;
}

// Helper functions - values are stored in dollars, not cents
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

// Interactive earnings chart component with tooltip
function EarningsChart({
  data,
  width,
  height,
  transactions,
}: {
  data: number[];
  width: number;
  height: number;
  transactions?: Array<{ amount: number; created_at: string; type: string }>;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchX = useSharedValue(-1);

  const paddingH = 16;
  const paddingV = 12;
  const chartWidth = width - paddingH * 2;
  const chartHeight = height - paddingV * 2;

  // Calculate points with smooth curve
  const points = useMemo(() => {
    if (data.length < 2) return [];
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    return data.map((val, i) => ({
      x: paddingH + (i / (data.length - 1)) * chartWidth,
      y: paddingV + chartHeight - ((val - minVal) / range) * chartHeight * 0.85,
      value: val,
      date: transactions?.[i]?.created_at || '',
    }));
  }, [data, chartWidth, chartHeight, paddingH, paddingV, transactions]);

  // Create smooth bezier curve path
  const createSmoothPath = useCallback((pts: typeof points) => {
    if (pts.length < 2) return '';

    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const controlX = (current.x + next.x) / 2;

      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    return path;
  }, []);

  // Create area path for gradient fill
  const createAreaPath = useCallback((pts: typeof points, h: number) => {
    if (pts.length < 2) return '';

    const linePath = createSmoothPath(pts);
    const lastPoint = pts[pts.length - 1];
    const firstPoint = pts[0];

    return `${linePath} L ${lastPoint.x} ${h} L ${firstPoint.x} ${h} Z`;
  }, [createSmoothPath]);

  // Find nearest point to touch position
  const findNearestPoint = useCallback((x: number) => {
    if (points.length === 0) return -1;
    let nearestIndex = 0;
    let nearestDistance = Math.abs(points[0].x - x);

    for (let i = 1; i < points.length; i++) {
      const distance = Math.abs(points[i].x - x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }, [points]);

  const updateActiveIndex = useCallback((x: number) => {
    const index = findNearestPoint(x);
    setActiveIndex(index >= 0 ? index : null);
  }, [findNearestPoint]);

  const clearActiveIndex = useCallback(() => {
    setActiveIndex(null);
  }, []);

  // Auto-hide tooltip after tap
  const hideAfterDelay = useCallback(() => {
    setTimeout(() => {
      setActiveIndex(null);
    }, 2000);
  }, []);

  // Tap gesture for single taps
  const tapGesture = Gesture.Tap()
    .onStart((event) => {
      touchX.value = event.x;
      runOnJS(updateActiveIndex)(event.x);
    })
    .onEnd(() => {
      runOnJS(hideAfterDelay)();
    });

  // Pan gesture for dragging across the chart
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      touchX.value = event.x;
      runOnJS(updateActiveIndex)(event.x);
    })
    .onUpdate((event) => {
      touchX.value = event.x;
      runOnJS(updateActiveIndex)(event.x);
    })
    .onEnd(() => {
      touchX.value = -1;
      runOnJS(clearActiveIndex)();
    });

  // Combine tap and pan gestures
  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  // Empty state - subtle line
  if (data.length < 2) {
    return (
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          <Path
            d={`M ${paddingH} ${height / 2} L ${width - paddingH} ${height / 2}`}
            stroke="rgba(139, 92, 246, 0.2)"
            strokeWidth={2}
          />
        </Svg>
      </View>
    );
  }

  const linePath = createSmoothPath(points);
  const areaPath = createAreaPath(points, height);
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  // Format date for tooltip
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={{ width, height, position: 'relative' }}>
        {/* Tooltip */}
        {activePoint && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[
              chartStyles.tooltip,
              {
                left: Math.min(Math.max(activePoint.x - 40, 8), width - 88),
                top: -28,
              },
            ]}
          >
            <Text style={chartStyles.tooltipValue}>${activePoint.value.toFixed(2)}</Text>
            {activePoint.date && (
              <Text style={chartStyles.tooltipDate}>{formatDate(activePoint.date)}</Text>
            )}
          </Animated.View>
        )}

        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#8b5cf6" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Gradient fill under line */}
          <Path
            d={areaPath}
            fill="url(#areaGradient)"
          />

          {/* Main curve line */}
          <Path
            d={linePath}
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active point indicator */}
          {activePoint && (
            <>
              {/* Vertical line */}
              <Path
                d={`M ${activePoint.x} ${activePoint.y} L ${activePoint.x} ${height}`}
                stroke="rgba(139, 92, 246, 0.4)"
                strokeWidth={1}
              />
              {/* Outer glow */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={12}
                fill="rgba(139, 92, 246, 0.15)"
              />
              {/* Inner circle */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={6}
                fill="#8b5cf6"
              />
              {/* Center dot */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={3}
                fill="#fff"
              />
            </>
          )}
        </Svg>
      </View>
    </GestureDetector>
  );
}

const chartStyles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(23, 23, 23, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  tooltipValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  tooltipDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});

// Referral Sheet Component
function ReferralSheet({
  visible,
  onClose,
  referralCode,
}: {
  visible: boolean;
  onClose: () => void;
  referralCode: string | null;
}) {
  const sheetTranslateY = useSharedValue(REFERRAL_SHEET_HEIGHT);
  const dragStartY = useSharedValue(0);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (visible) {
      sheetTranslateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      sheetTranslateY.value = withTiming(REFERRAL_SHEET_HEIGHT, { duration: 250 });
    }
  }, [visible]);

  const handleDragGesture = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = sheetTranslateY.value;
    })
    .onUpdate((event) => {
      const newY = Math.max(0, dragStartY.value + event.translationY);
      sheetTranslateY.value = newY;
    })
    .onEnd((event) => {
      if (sheetTranslateY.value > 80 || event.velocityY > 500) {
        sheetTranslateY.value = withTiming(REFERRAL_SHEET_HEIGHT, { duration: 250 });
        runOnJS(onClose)();
      } else {
        sheetTranslateY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const handleCopy = () => {
    // In a real app, use Clipboard API
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!visible && sheetTranslateY.value >= REFERRAL_SHEET_HEIGHT) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {visible && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>
      )}

      <Animated.View style={[styles.referralSheet, sheetStyle]}>
        <GestureDetector gesture={handleDragGesture}>
          <Animated.View style={styles.handleContainer}>
            <View style={styles.handle} />
          </Animated.View>
        </GestureDetector>

        <View style={styles.referralContent}>
          <Text style={styles.referralTitle}>Refer & Earn</Text>
          <Text style={styles.referralSubtitle}>
            Earn $50 for every friend who joins and completes their first campaign
          </Text>

          <View style={styles.referralCodeBox}>
            <Text style={styles.referralCodeLabel}>Your referral code</Text>
            <View style={styles.referralCodeRow}>
              <Text style={styles.referralCode}>{referralCode || 'N/A'}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                <Icon name={copied ? 'check' : 'content-copy'} size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.referralStats}>
            <View style={styles.referralStat}>
              <Text style={styles.referralStatValue}>0</Text>
              <Text style={styles.referralStatLabel}>Referrals</Text>
            </View>
            <View style={styles.referralStatDivider} />
            <View style={styles.referralStat}>
              <Text style={styles.referralStatValue}>$0.00</Text>
              <Text style={styles.referralStatLabel}>Earned</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareButtonText}>Share Referral Link</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

export function MyCampaignsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [showReferralSheet, setShowReferralSheet] = useState(false);
  const [showReferralBanner, setShowReferralBanner] = useState(true);

  // Query for wallet data
  const { data: walletData } = useQuery({
    queryKey: ['wallet-data', user?.id],
    queryFn: async (): Promise<WalletData> => {
      if (!user?.id) return { balance: 0, totalEarned: 0, transactions: [] };

      // Fetch wallet balance and total_earned directly from wallets table
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', user.id)
        .single();

      // Fetch all transactions for the chart to show balance changes over time
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at, type')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: true })
        .limit(30);

      return {
        balance: wallet?.balance || 0,
        totalEarned: wallet?.total_earned || 0,
        transactions: transactions || [],
      };
    },
    enabled: !!user?.id,
  });

  // Query for profile (referral code)
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Query for joined campaigns with earnings
  const {
    data: joinedCampaigns,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['my-campaigns-home', user?.id],
    queryFn: async (): Promise<JoinedCampaign[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('campaign_submissions')
        .select(`
          id,
          campaign_id,
          status,
          submitted_at,
          campaign:campaigns (
            id,
            title,
            brand_name,
            brand_logo_url,
            rpm_rate,
            status
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Get earnings per campaign
      const campaignIds = (data || []).map(d => d.campaign_id);
      const { data: earnings } = await supabase
        .from('wallet_transactions')
        .select('source_id, amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .in('source_id', campaignIds);

      const earningsBySource: Record<string, number> = {};
      (earnings || []).forEach(e => {
        earningsBySource[e.source_id] = (earningsBySource[e.source_id] || 0) + Math.abs(e.amount);
      });

      return (data || [])
        .filter(d => d.campaign !== null)
        .map(d => ({
          ...d,
          total_earned: earningsBySource[d.campaign_id] || 0,
          campaign: d.campaign as any,
        })) as JoinedCampaign[];
    },
    enabled: !!user?.id,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCampaignPress = useCallback(
    (campaign: JoinedCampaign) => {
      // @ts-expect-error - Navigation types not set up yet
      navigation.navigate('CreatorCampaignDetail', {
        campaignId: campaign.campaign_id,
        submissionId: campaign.id,
      });
    },
    [navigation]
  );

  const handleWalletPress = useCallback(() => {
    // @ts-expect-error - Navigation types not set up yet
    navigation.navigate('Main', { screen: 'Wallet' });
  }, [navigation]);

  // Generate chart data showing balance over time (running balance)
  const chartTransactions = useMemo(() => {
    if (!walletData?.transactions?.length) return [];

    // Calculate running balance for each transaction
    let runningBalance = 0;
    const transactionsWithBalance = walletData.transactions.map(t => {
      runningBalance += t.amount;
      return {
        ...t,
        balance: runningBalance,
      };
    });

    return transactionsWithBalance.slice(-20);
  }, [walletData?.transactions]);

  const chartData = useMemo(() => {
    return chartTransactions.map(t => t.balance);
  }, [chartTransactions]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Sign in to view your dashboard</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/virality-logo-white.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.headerTitle}>Virality</Text>
        </View>
        <TouchableOpacity style={styles.walletButton} onPress={handleWalletPress}>
          <Icon name="wallet-outline" size={16} color={colors.primary} />
          <Text style={styles.walletButtonText}>
            {formatCurrency(walletData?.balance || 0)}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Total Earnings */}
        <View style={styles.earningsSection}>
          <Text style={styles.totalEarnings}>
            {formatCurrency(walletData?.totalEarned || 0)}
          </Text>
        </View>

        {/* Earnings Chart */}
        <View style={styles.chartContainer}>
          <EarningsChart
            data={chartData}
            width={SCREEN_WIDTH - 32}
            height={80}
            transactions={chartTransactions}
          />
        </View>

        {/* Referral Banner */}
        {showReferralBanner && (
          <TouchableOpacity
            style={styles.referralBanner}
            onPress={() => setShowReferralSheet(true)}
            activeOpacity={0.8}
          >
            <View style={styles.referralBannerIcon}>
              <Icon name="gift-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.referralBannerContent}>
              <Text style={styles.referralBannerTitle}>Earn $50 & lifetime bonuses</Text>
              <Text style={styles.referralBannerSubtitle}>Refer a friend to Virality</Text>
            </View>
            <TouchableOpacity
              style={styles.referralBannerClose}
              onPress={() => setShowReferralBanner(false)}
            >
              <Icon name="close" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Campaign List Header */}
        <View style={styles.listHeader}>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>UGC</Text>
            <Icon name="chevron-down" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton}>
            <Text style={styles.sortButtonText}>Trending</Text>
            <Icon name="chevron-down" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Campaign List */}
        {joinedCampaigns && joinedCampaigns.length > 0 ? (
          <View style={styles.campaignList}>
            {joinedCampaigns.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.campaignRow}
                onPress={() => handleCampaignPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.campaignLogo}>
                  {item.campaign.brand_logo_url ? (
                    <Image
                      source={{ uri: item.campaign.brand_logo_url }}
                      style={styles.brandLogo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.brandLogoPlaceholder}>
                      <Text style={styles.brandInitial}>
                        {item.campaign.brand_name?.[0]?.toUpperCase() || 'V'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignTitle} numberOfLines={1}>
                    {item.campaign.title}
                  </Text>
                  <Text style={styles.campaignMeta}>
                    ${item.campaign.rpm_rate?.toFixed(0) || '0'} base • {formatCurrencyShort(item.total_earned || 0)} claimed
                  </Text>
                </View>
                <View style={styles.campaignEarnings}>
                  <Text style={styles.earningsValue}>
                    {formatCurrencyShort(item.total_earned || 0)}
                  </Text>
                  <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="briefcase-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>No campaigns yet</Text>
            <Text style={styles.emptySubtitle}>
              Browse and apply to campaigns in the Discover tab
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Referral Sheet */}
      <ReferralSheet
        visible={showReferralSheet}
        onClose={() => setShowReferralSheet(false)}
        referralCode={profile?.referral_code || null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  earningsSection: {
    marginTop: 8,
  },
  totalEarnings: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -2,
  },
  chartContainer: {
    marginTop: 40, // Extra space for tooltip above
    marginBottom: 16,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  referralBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  referralBannerContent: {
    flex: 1,
  },
  referralBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  referralBannerSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  referralBannerClose: {
    padding: 4,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  campaignList: {
    gap: 12,
  },
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  campaignLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  brandLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  campaignInfo: {
    flex: 1,
    marginRight: 12,
  },
  campaignTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  campaignMeta: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  campaignEarnings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  // Referral Sheet Styles
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  referralSheet: {
    position: 'absolute',
    bottom: 90, // Above the tab bar
    left: 0,
    right: 0,
    height: REFERRAL_SHEET_HEIGHT,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  referralContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  referralTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  referralSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 24,
    lineHeight: 20,
  },
  referralCodeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  referralCodeLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralCode: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: 2,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralStats: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  referralStat: {
    flex: 1,
    alignItems: 'center',
  },
  referralStatDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  referralStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
  },
  referralStatLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 28,
    borderTopWidth: 1,
    borderTopColor: '#589bfd',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
