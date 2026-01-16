import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogoLoader } from '../components/LogoLoader';
import { colors } from '../theme/colors';

// Platform icon config
const platformConfig: Record<string, { bg: string; icon: string }> = {
  tiktok: { bg: '#000', icon: 'music-note' },
  instagram: { bg: '#E1306C', icon: 'instagram' },
  youtube: { bg: '#FF0000', icon: 'youtube' },
};

interface VideoSubmission {
  id: string;
  source_id: string;
  source_type: 'campaign' | 'boost';
  video_url: string;
  platform: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'paid';
  views: number;
  payout_amount: number;
  created_at: string;
  title: string | null;
  // Joined campaign data (when source_type is 'campaign')
  campaign?: {
    id: string;
    title: string;
    brand_name: string;
    brand_color: string;
    rpm_rate: number;
  } | null;
  // Joined boost data (when source_type is 'boost')
  boost?: {
    id: string;
    title: string;
    brands?: {
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusConfig(status: VideoSubmission['status']): { color: string; label: string; bg: string } {
  switch (status) {
    case 'approved':
      return { color: '#22c55e', label: 'Approved', bg: 'rgba(34,197,94,0.15)' };
    case 'pending_review':
      return { color: '#f59e0b', label: 'Pending', bg: 'rgba(245,158,11,0.15)' };
    case 'rejected':
      return { color: '#ef4444', label: 'Rejected', bg: 'rgba(239,68,68,0.15)' };
    case 'paid':
      return { color: '#6366f1', label: 'Paid', bg: 'rgba(99,102,241,0.15)' };
    default:
      return { color: '#888', label: status, bg: 'rgba(136,136,136,0.15)' };
  }
}

function getPlatformConfig(platform: string): { bg: string; icon: string } {
  return platformConfig[platform.toLowerCase()] || { bg: '#666', icon: 'web' };
}

export function MyCampaignsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const {
    data: submissions,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['my-submissions', user?.id],
    queryFn: async (): Promise<VideoSubmission[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('video_submissions')
        .select(`
          id,
          source_id,
          source_type,
          video_url,
          platform,
          status,
          views,
          payout_amount,
          created_at,
          title
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []) as VideoSubmission[];
    },
    enabled: !!user?.id,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSubmissionPress = useCallback(
    (submission: VideoSubmission) => {
      // @ts-expect-error - Navigation types not set up yet
      navigation.navigate('SubmissionDetail', { submissionId: submission.id });
    },
    [navigation]
  );

  const renderSubmission = ({ item }: { item: VideoSubmission }) => {
    const statusConfig = getStatusConfig(item.status);
    const earned = item.payout_amount || 0;
    const platConfig = getPlatformConfig(item.platform);
    const sourceColor = item.source_type === 'boost' ? '#8b5cf6' : '#6366f1';

    return (
      <TouchableOpacity
        style={styles.submissionCard}
        onPress={() => handleSubmissionPress(item)}
        activeOpacity={0.7}
      >
        {/* Header with source type color stripe */}
        <View
          style={[
            styles.colorStripe,
            { backgroundColor: sourceColor },
          ]}
        />

        <View style={styles.cardContent}>
          {/* Top Row: Submission Info */}
          <View style={styles.topRow}>
            <View style={styles.campaignInfo}>
              <View style={styles.brandNameRow}>
                <Icon
                  name={item.source_type === 'boost' ? 'lightning-bolt' : 'bullhorn'}
                  size={12}
                  color="#666"
                  style={styles.brandIcon}
                />
                <Text style={styles.brandName} numberOfLines={1}>
                  {item.source_type === 'boost' ? 'Boost' : 'Campaign'}
                </Text>
              </View>
              <Text style={styles.campaignTitle} numberOfLines={1}>
                {item.title || 'Video Submission'}
              </Text>
            </View>
            <View style={[styles.platformBadge, { backgroundColor: platConfig.bg }]}>
              <Icon name={platConfig.icon} size={16} color="#fff" />
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {/* Views */}
            <View style={styles.statItem}>
              <View style={styles.statLabelRow}>
                <Icon name="eye-outline" size={12} color="#666" />
                <Text style={styles.statLabel}>Views</Text>
              </View>
              <Text style={styles.statValue}>{formatViews(item.views || 0)}</Text>
            </View>

            {/* Earned */}
            <View style={styles.statItem}>
              <View style={styles.statLabelRow}>
                <Icon name="cash" size={12} color="#22c55e" />
                <Text style={styles.statLabel}>Earned</Text>
              </View>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                {formatCurrency(earned / 100)}
              </Text>
            </View>

            {/* Status */}
            <View style={styles.statItem}>
              <View style={styles.statLabelRow}>
                <Icon name="checkbox-marked-circle-outline" size={12} color="#666" />
                <Text style={styles.statLabel}>Status</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Date */}
          <Text style={styles.dateText}>Submitted {formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Summary stats
  const stats = React.useMemo(() => {
    if (!submissions) return { total: 0, approved: 0, pending: 0, views: 0, earned: 0 };

    return submissions.reduce(
      (acc, s) => ({
        total: acc.total + 1,
        approved: acc.approved + (s.status === 'approved' || s.status === 'paid' ? 1 : 0),
        pending: acc.pending + (s.status === 'pending_review' ? 1 : 0),
        views: acc.views + (s.views || 0),
        earned: acc.earned + (s.payout_amount || 0),
      }),
      { total: 0, approved: 0, pending: 0, views: 0, earned: 0 }
    );
  }, [submissions]);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Stats Cards */}
      <View style={styles.statsCards}>
        <View style={styles.statCard}>
          <Icon name="check-circle-outline" size={20} color={colors.primary} style={styles.statCardIcon} />
          <Text style={styles.statCardValue}>{stats.approved}</Text>
          <Text style={styles.statCardLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="clock-outline" size={20} color="#f59e0b" style={styles.statCardIcon} />
          <Text style={styles.statCardValue}>{stats.pending}</Text>
          <Text style={styles.statCardLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="eye-outline" size={20} color="#6366f1" style={styles.statCardIcon} />
          <Text style={[styles.statCardValue, { color: '#6366f1' }]}>
            {formatViews(stats.views)}
          </Text>
          <Text style={styles.statCardLabel}>Total Views</Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Icon name="video-box" size={18} color="#fff" />
        <Text style={styles.sectionTitle}>Submissions</Text>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>My Campaigns</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sign in to view your submissions</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>My Campaigns</Text>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>My Campaigns</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading submissions</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>My Campaigns</Text>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubmission}
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
          <View style={styles.emptyContainer}>
            <Icon name="video-off-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptySubtitle}>
              Apply to campaigns and submit your videos
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
  header: {
    marginBottom: 8,
  },
  statsCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  statCardIcon: {
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#888',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  submissionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  colorStripe: {
    height: 4,
  },
  cardContent: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  campaignInfo: {
    flex: 1,
    marginRight: 12,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandIcon: {
    marginRight: 4,
  },
  brandName: {
    fontSize: 12,
    color: '#888',
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  platformBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#333',
    marginBottom: 16,
    fontWeight: 'bold',
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
    textAlign: 'center',
  },
});
