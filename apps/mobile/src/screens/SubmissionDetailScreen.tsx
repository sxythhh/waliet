import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { Card, Badge } from '../components/ui';
import { LogoLoader } from '../components/LogoLoader';

type RootStackParamList = {
  SubmissionDetail: { submissionId: string };
};

interface Submission {
  id: string;
  video_url: string;
  platform: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'paid';
  views: number;
  payout_amount: number;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  title: string | null;
  source_id: string;
  source_type: 'campaign' | 'boost';
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusConfig(status: Submission['status']): { variant: 'success' | 'pending' | 'destructive' | 'secondary'; label: string } {
  switch (status) {
    case 'approved':
      return { variant: 'success', label: 'Approved' };
    case 'pending_review':
      return { variant: 'pending', label: 'Pending Review' };
    case 'rejected':
      return { variant: 'destructive', label: 'Rejected' };
    case 'paid':
      return { variant: 'success', label: 'Paid' };
    default:
      return { variant: 'secondary', label: status };
  }
}

function getPlatformConfig(platform: string): { name: string; icon: string; bg: string } {
  switch (platform.toLowerCase()) {
    case 'tiktok':
      return { name: 'TikTok', icon: 'music-note', bg: '#000' };
    case 'instagram':
      return { name: 'Instagram', icon: 'instagram', bg: '#E1306C' };
    case 'youtube':
      return { name: 'YouTube', icon: 'youtube', bg: '#FF0000' };
    default:
      return { name: platform, icon: 'web', bg: colors.muted };
  }
}

export function SubmissionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'SubmissionDetail'>>();
  const { user } = useAuth();
  const { submissionId } = route.params;

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async (): Promise<Submission | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('video_submissions')
        .select(`
          id,
          video_url,
          platform,
          status,
          views,
          payout_amount,
          created_at,
          reviewed_at,
          rejection_reason,
          title,
          source_id,
          source_type
        `)
        .eq('id', submissionId)
        .eq('creator_id', user.id)
        .single();

      if (error) throw error;

      return data as Submission;
    },
    enabled: !!user?.id && !!submissionId,
  });

  const handleOpenVideo = () => {
    if (submission?.video_url) {
      Linking.openURL(submission.video_url);
    }
  };

  const handleViewSource = () => {
    if (submission?.source_id && submission?.source_type) {
      if (submission.source_type === 'boost') {
        // @ts-expect-error - Navigation types not set up yet
        navigation.navigate('BoostDetail', { boostId: submission.source_id });
      } else {
        // @ts-expect-error - Navigation types not set up yet
        navigation.navigate('CampaignDetail', { campaignId: submission.source_id });
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submission</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !submission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submission</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>Failed to load submission</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(submission.status);
  const platformConfig = getPlatformConfig(submission.platform);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submission</Text>
        <TouchableOpacity onPress={handleOpenVideo} style={styles.backButton}>
          <Icon name="open-in-new" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Card variant="bordered" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Badge variant={statusConfig.variant} size="default">
              {statusConfig.label}
            </Badge>
            <View style={[styles.platformBadge, { backgroundColor: platformConfig.bg }]}>
              <Icon name={platformConfig.icon} size={16} color={colors.foreground} />
            </View>
          </View>
          <Text style={styles.submittedDate}>
            Submitted {formatDateTime(submission.created_at)}
          </Text>
          {submission.reviewed_at && (
            <Text style={styles.reviewedDate}>
              Reviewed {formatDateTime(submission.reviewed_at)}
            </Text>
          )}
        </Card>

        {/* Rejection Reason */}
        {submission.status === 'rejected' && submission.rejection_reason && (
          <Card variant="bordered" style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Icon name="alert-circle" size={20} color={colors.destructive} />
              <Text style={styles.rejectionTitle}>Rejection Reason</Text>
            </View>
            <Text style={styles.rejectionText}>{submission.rejection_reason}</Text>
          </Card>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card variant="bordered" style={styles.statCard}>
            <Icon name="eye-outline" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{formatViews(submission.views || 0)}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </Card>
          <Card variant="bordered" style={styles.statCard}>
            <Icon name="cash" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(submission.payout_amount || 0)}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </Card>
        </View>

        {/* Source Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon
              name={submission.source_type === 'boost' ? 'lightning-bolt' : 'bullhorn-outline'}
              size={18}
              color={colors.foreground}
            />
            <Text style={styles.sectionTitle}>
              {submission.source_type === 'boost' ? 'Boost' : 'Campaign'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleViewSource} activeOpacity={0.7}>
            <Card variant="bordered" style={styles.campaignCard}>
              <View
                style={[
                  styles.campaignStripe,
                  { backgroundColor: submission.source_type === 'boost' ? '#8b5cf6' : colors.primary },
                ]}
              />
              <View style={styles.campaignContent}>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignBrand}>
                    {submission.source_type === 'boost' ? 'Boost Submission' : 'Campaign Submission'}
                  </Text>
                  <Text style={styles.campaignTitle}>
                    {submission.title || 'Video Submission'}
                  </Text>
                </View>
                <View style={styles.campaignMeta}>
                  <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Video Link */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="video-outline" size={18} color={colors.foreground} />
            <Text style={styles.sectionTitle}>Video</Text>
          </View>
          <TouchableOpacity onPress={handleOpenVideo} activeOpacity={0.7}>
            <Card variant="bordered" style={styles.videoCard}>
              <View style={styles.videoContent}>
                <View style={[styles.videoIcon, { backgroundColor: platformConfig.bg }]}>
                  <Icon name={platformConfig.icon} size={24} color={colors.foreground} />
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoLabel}>View on {platformConfig.name}</Text>
                  <Text style={styles.videoUrl} numberOfLines={1}>
                    {submission.video_url}
                  </Text>
                </View>
                <Icon name="open-in-new" size={20} color={colors.mutedForeground} />
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="timeline" size={18} color={colors.foreground} />
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>
          <Card variant="bordered" style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineAction}>Submitted</Text>
                <Text style={styles.timelineDate}>{formatDateTime(submission.created_at)}</Text>
              </View>
            </View>
            {submission.reviewed_at && (
              <View style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor:
                        submission.status === 'rejected' ? colors.destructive : colors.success,
                    },
                  ]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineAction}>
                    {submission.status === 'rejected' ? 'Rejected' : 'Approved'}
                  </Text>
                  <Text style={styles.timelineDate}>{formatDateTime(submission.reviewed_at)}</Text>
                </View>
              </View>
            )}
            {submission.status === 'paid' && (
              <View style={[styles.timelineItem, { borderLeftWidth: 0 }]}>
                <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineAction}>Paid Out</Text>
                  <Text style={styles.timelineDate}>
                    {formatCurrency(submission.payout_amount || 0)}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
    minWidth: 48,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
  },
  headerSpacer: {
    minWidth: 48,
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
    fontSize: 16,
    color: colors.mutedForeground,
    marginTop: 12,
    marginBottom: 24,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statusCard: {
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submittedDate: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  reviewedDate: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  rejectionCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.destructiveMuted,
    borderColor: colors.destructive,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.destructive,
  },
  rejectionText: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  campaignCard: {
    overflow: 'hidden',
    padding: 0,
  },
  campaignStripe: {
    height: 4,
  },
  campaignContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignBrand: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  campaignTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rpmRate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  videoCard: {
    padding: 0,
  },
  videoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  videoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  videoUrl: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  timelineCard: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 20,
    paddingBottom: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginLeft: 6,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    left: -7,
    top: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
