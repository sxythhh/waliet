import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Card, Badge } from '../ui';

export interface VideoSubmission {
  id: string;
  video_url: string;
  platform: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'paid';
  total_views: number;
  total_earned: number;
  created_at: string;
  rejection_reason?: string | null;
  campaign?: {
    id: string;
    title: string;
    brand_name: string;
    brand_color?: string;
    rpm_rate?: number;
  };
}

export interface SubmissionCardProps {
  submission: VideoSubmission;
  onPress?: (submission: VideoSubmission) => void;
}

const platformConfig: Record<string, { bg: string; icon: string }> = {
  tiktok: { bg: '#000', icon: 'music-note' },
  instagram: { bg: '#E1306C', icon: 'instagram' },
  youtube: { bg: '#FF0000', icon: 'youtube' },
};

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusConfig(status: VideoSubmission['status']): {
  variant: 'success' | 'warning' | 'destructive' | 'default';
  label: string;
} {
  switch (status) {
    case 'approved':
      return { variant: 'success', label: 'Approved' };
    case 'pending_review':
      return { variant: 'warning', label: 'Pending' };
    case 'rejected':
      return { variant: 'destructive', label: 'Rejected' };
    case 'paid':
      return { variant: 'default', label: 'Paid' };
    default:
      return { variant: 'secondary' as any, label: status };
  }
}

export function SubmissionCard({ submission, onPress }: SubmissionCardProps) {
  const statusConfig = getStatusConfig(submission.status);
  const platConfig = platformConfig[submission.platform?.toLowerCase()] || {
    bg: '#666',
    icon: 'web',
  };

  const handleOpenVideo = () => {
    if (submission.video_url) {
      Linking.openURL(submission.video_url);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(submission)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Card variant="bordered" style={styles.card}>
        {/* Status accent bar */}
        <View
          style={[
            styles.accentBar,
            {
              backgroundColor:
                submission.status === 'approved' || submission.status === 'paid'
                  ? colors.success
                  : submission.status === 'rejected'
                  ? colors.destructive
                  : colors.warning,
            },
          ]}
        />

        <View style={styles.content}>
          {/* Top Row: Campaign Info + Platform */}
          <View style={styles.topRow}>
            <View style={styles.campaignInfo}>
              <View style={styles.brandNameRow}>
                <Icon name="domain" size={12} color={colors.mutedForeground} />
                <Text style={styles.brandName} numberOfLines={1}>
                  {submission.campaign?.brand_name || 'Unknown Brand'}
                </Text>
              </View>
              <Text style={styles.campaignTitle} numberOfLines={1}>
                {submission.campaign?.title || 'Unknown Campaign'}
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
                <Icon name="eye-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.statLabel}>Views</Text>
              </View>
              <Text style={styles.statValue}>
                {formatViews(submission.total_views || 0)}
              </Text>
            </View>

            {/* Earned */}
            <View style={styles.statItem}>
              <View style={styles.statLabelRow}>
                <Icon name="cash" size={12} color={colors.success} />
                <Text style={styles.statLabel}>Earned</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatCurrency(submission.total_earned || 0)}
              </Text>
            </View>

            {/* Status */}
            <View style={styles.statItem}>
              <View style={styles.statLabelRow}>
                <Icon
                  name="checkbox-marked-circle-outline"
                  size={12}
                  color={colors.mutedForeground}
                />
                <Text style={styles.statLabel}>Status</Text>
              </View>
              <Badge variant={statusConfig.variant} size="sm">
                {statusConfig.label}
              </Badge>
            </View>
          </View>

          {/* Rejection reason if rejected */}
          {submission.status === 'rejected' && submission.rejection_reason && (
            <View style={styles.rejectionContainer}>
              <Icon name="alert-circle" size={14} color={colors.destructive} />
              <Text style={styles.rejectionText} numberOfLines={2}>
                {submission.rejection_reason}
              </Text>
            </View>
          )}

          {/* Bottom Row: Date + Link */}
          <View style={styles.bottomRow}>
            <Text style={styles.dateText}>
              Submitted {formatDate(submission.created_at)}
            </Text>
            <TouchableOpacity
              onPress={handleOpenVideo}
              style={styles.linkButton}
            >
              <Icon name="open-in-new" size={14} color={colors.primary} />
              <Text style={styles.linkText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
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
    gap: 4,
    marginBottom: 2,
  },
  brandName: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
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
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.destructiveMuted,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: colors.destructive,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
});
