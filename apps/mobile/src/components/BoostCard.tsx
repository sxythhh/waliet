import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { Card, Badge, Progress, Button } from './ui';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export interface BoostData {
  id: string;
  title: string;
  monthly_retainer: number;
  videos_per_month: number;
  payment_model?: 'retainer' | 'flat_rate' | null;
  flat_rate_min?: number | null;
  flat_rate_max?: number | null;
  approved_rate?: number | null;
  brands?: {
    name: string;
    logo_url: string | null;
    is_verified?: boolean;
  };
}

export interface BoostCardProps {
  boost: BoostData;
  onPress: (boost: BoostData) => void;
  onSubmit?: (boost: BoostData) => void;
  stats?: {
    approvedThisMonth: number;
    pendingThisMonth: number;
    earnedThisMonth: number;
  };
  isApplied?: boolean;
}

export function BoostCard({
  boost,
  onPress,
  onSubmit,
  stats,
  isApplied = false,
}: BoostCardProps) {
  const isFlatRate = boost.payment_model === 'flat_rate';
  const hasUnlimitedVideos = !boost.videos_per_month || boost.videos_per_month === 0;

  // Calculate payout per video
  const payoutPerVideo = isFlatRate
    ? (boost.approved_rate || boost.flat_rate_min || 0)
    : (hasUnlimitedVideos ? boost.monthly_retainer : boost.monthly_retainer / boost.videos_per_month);

  // Use provided stats or default to 0
  const approvedThisMonth = stats?.approvedThisMonth || 0;
  const pendingThisMonth = stats?.pendingThisMonth || 0;
  const earnedThisMonth = stats?.earnedThisMonth || 0;

  // Progress calculation
  const activeSubmissions = approvedThisMonth + pendingThisMonth;
  const progressPercent = hasUnlimitedVideos
    ? 0
    : Math.min((activeSubmissions / boost.videos_per_month) * 100, 100);

  const canSubmit = hasUnlimitedVideos || activeSubmissions < boost.videos_per_month;

  return (
    <TouchableOpacity
      onPress={() => onPress(boost)}
      activeOpacity={0.7}
    >
      <Card variant="bordered" style={styles.card}>
        {/* Header Row */}
        <View style={styles.header}>
          {/* Brand Logo */}
          {boost.brands?.logo_url ? (
            <Image
              source={{ uri: boost.brands.logo_url }}
              style={styles.brandLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.brandLogoPlaceholder}>
              <Icon name="video" size={20} color={colors.mutedForeground} />
            </View>
          )}

          {/* Title & Brand */}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {boost.title}
            </Text>
            <View style={styles.brandRow}>
              <Text style={styles.brandName} numberOfLines={1}>
                {boost.brands?.name || 'Unknown Brand'}
              </Text>
              {boost.brands?.is_verified && (
                <Icon name="check-decagram" size={14} color={colors.primary} />
              )}
            </View>
          </View>

          {/* Status Badge */}
          {isApplied && (
            <Badge variant="pending" size="sm">
              Applied
            </Badge>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              ${earnedThisMonth.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              ${(pendingThisMonth * payoutPerVideo).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              ${payoutPerVideo.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Per post</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {isFlatRate
                ? `$${boost.flat_rate_min || 0}-${boost.flat_rate_max || 0}`
                : `$${boost.monthly_retainer}`
              }
            </Text>
            <Text style={styles.statLabel}>
              {isFlatRate ? 'Range' : 'Max/mo'}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        {!hasUnlimitedVideos && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Monthly Progress</Text>
              <Text style={styles.progressValue}>
                {activeSubmissions}/{boost.videos_per_month} videos
              </Text>
            </View>
            <Progress
              value={progressPercent}
              height={6}
              variant={approvedThisMonth === boost.videos_per_month ? 'success' : 'default'}
            />
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>{approvedThisMonth} Approved</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.legendText}>{pendingThisMonth} Pending</Text>
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */}
        {onSubmit && (
          <Button
            variant="secondary"
            size="default"
            onPress={() => onSubmit(boost)}
            disabled={!canSubmit}
            style={styles.submitButton}
          >
            Submit post
          </Button>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// Compact Discover Card - matches web's BoostDiscoverCard design
export interface BoostDiscoverCardProps {
  id: string;
  title: string;
  description?: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  brand_is_verified?: boolean;
  monthly_retainer: number;
  videos_per_month: number;
  max_accepted_creators?: number;
  accepted_creators_count?: number;
  payment_model?: 'retainer' | 'flat_rate' | null;
  flat_rate_min?: number | null;
  flat_rate_max?: number | null;
  isEnded?: boolean;
  isBookmarked?: boolean;
  hasApplied?: boolean;
  tags?: string[] | null;
  content_distribution?: string | null;
  created_at?: string;
  onPress: () => void;
  onBookmarkPress?: () => void;
}

export function BoostCardCompact({
  boost,
  onPress,
  isApplied = false,
}: Omit<BoostCardProps, 'onSubmit' | 'stats'>) {
  const isFlatRate = boost.payment_model === 'flat_rate';
  const hasUnlimitedVideos = !boost.videos_per_month || boost.videos_per_month === 0;

  const payoutPerVideo = isFlatRate
    ? (boost.approved_rate || boost.flat_rate_min || 0)
    : (hasUnlimitedVideos ? boost.monthly_retainer : boost.monthly_retainer / boost.videos_per_month);

  return (
    <TouchableOpacity
      onPress={() => onPress(boost)}
      activeOpacity={0.7}
    >
      <Card variant="bordered" style={styles.discoverCard}>
        {/* Main Content */}
        <View style={styles.discoverContent}>
          {/* Title */}
          <Text style={styles.discoverTitle} numberOfLines={2}>
            {boost.title}
          </Text>

          {/* Posted By */}
          <Text style={styles.postedByText}>
            Posted by: <Text style={styles.postedByBrand}>Brand</Text>
          </Text>

          {/* Stats Row */}
          <View style={styles.statsLine}>
            {isFlatRate ? (
              <Text style={styles.statsText}>
                <Text style={styles.statsValue}>${boost.flat_rate_min || 0} - ${boost.flat_rate_max || 0}</Text>
                <Text>/post</Text>
              </Text>
            ) : (
              <View style={styles.statsLineInner}>
                <Text style={styles.statsText}>
                  <Text style={styles.statsValue}>${boost.monthly_retainer}</Text>
                  <Text>/mo</Text>
                </Text>
                {boost.videos_per_month > 0 && (
                  <View style={styles.statsLineInner}>
                    <Text style={styles.statsDot}>·</Text>
                    <Text style={styles.statsText}>
                      <Text style={styles.statsValue}>{boost.videos_per_month}</Text>
                      <Text> videos</Text>
                    </Text>
                    <Text style={styles.statsDot}>·</Text>
                    <Text style={styles.statsText}>
                      <Text style={styles.statsValue}>${payoutPerVideo.toFixed(0)}</Text>
                      <Text>/video</Text>
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Status / Applied Badge */}
          <View style={styles.spotInfoRow}>
            {isApplied ? (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedText}>Applied</Text>
              </View>
            ) : (
              <Text style={styles.spotsText}>
                <Text style={styles.spotsValue}>Unlimited</Text>
                <Text> spots</Text>
              </Text>
            )}
          </View>
        </View>

        {/* Brand Footer */}
        <View style={styles.brandFooter}>
          <View style={styles.brandFooterLeft}>
            {boost.brands?.logo_url ? (
              <Image
                source={{ uri: boost.brands.logo_url }}
                style={styles.footerLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.footerLogoPlaceholder}>
                <Text style={styles.footerLogoText}>
                  {boost.brands?.name?.charAt(0) || 'B'}
                </Text>
              </View>
            )}
            <View style={styles.brandNameRow}>
              <Text style={styles.footerBrandName} numberOfLines={1}>
                {boost.brands?.name || 'Unknown Brand'}
              </Text>
              {boost.brands?.is_verified && (
                <Icon name="check-decagram" size={12} color={colors.primary} />
              )}
            </View>
          </View>
          <Text style={styles.footerTime}>Recently</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// Full Discover Card - for grid display matching web design
export function BoostDiscoverCard({
  id,
  title,
  description,
  brand_name,
  brand_logo_url,
  brand_is_verified,
  monthly_retainer,
  videos_per_month,
  max_accepted_creators = 0,
  accepted_creators_count = 0,
  payment_model,
  flat_rate_min,
  flat_rate_max,
  isEnded,
  isBookmarked,
  hasApplied,
  tags,
  content_distribution,
  created_at,
  onPress,
  onBookmarkPress,
}: BoostDiscoverCardProps) {
  const isFlatRate = payment_model === 'flat_rate';
  const hasMaxCreators = max_accepted_creators > 0;
  const spotsRemaining = hasMaxCreators ? max_accepted_creators - accepted_creators_count : -1;
  const isFull = hasMaxCreators && spotsRemaining <= 0;
  const perVideoRate = videos_per_month > 0 ? monthly_retainer / videos_per_month : 0;
  const isEditorBoost = content_distribution === 'brand_accounts';

  // Format time ago
  const timeAgo = created_at ? 'Recently' : 'Recently';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isEnded}
    >
      <Card variant="bordered" style={[styles.discoverCard, isEnded && styles.discoverCardEnded]}>
        {/* Bookmark Button */}
        {onBookmarkPress && (
          <TouchableOpacity
            style={[styles.bookmarkButton, isBookmarked && styles.bookmarkButtonActive]}
            onPress={(e) => {
              e.stopPropagation?.();
              onBookmarkPress();
            }}
          >
            <Icon
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={14}
              color={isBookmarked ? colors.primaryForeground : colors.mutedForeground}
            />
          </TouchableOpacity>
        )}

        {/* Main Content */}
        <View style={styles.discoverContent}>
          {/* Title */}
          <Text style={styles.discoverTitle} numberOfLines={2}>
            {title}
          </Text>

          {/* Posted By */}
          <Text style={styles.postedByText}>
            Posted by: <Text style={styles.postedByBrand}>{isEditorBoost ? 'Brand' : 'You'}</Text>
          </Text>

          {/* Stats Row */}
          <View style={styles.statsLine}>
            {isFlatRate ? (
              <Text style={styles.statsText}>
                <Text style={styles.statsValue}>${flat_rate_min || 0} - ${flat_rate_max || 0}</Text>
                <Text>/post</Text>
              </Text>
            ) : (
              <View style={styles.statsLineInner}>
                <Text style={styles.statsText}>
                  <Text style={styles.statsValue}>${monthly_retainer}</Text>
                  <Text>/mo</Text>
                </Text>
                {videos_per_month > 0 && (
                  <View style={styles.statsLineInner}>
                    <Text style={styles.statsDot}>·</Text>
                    <Text style={styles.statsText}>
                      <Text style={styles.statsValue}>{videos_per_month}</Text>
                      <Text> videos</Text>
                    </Text>
                    <Text style={styles.statsDot}>·</Text>
                    <Text style={styles.statsText}>
                      <Text style={styles.statsValue}>${perVideoRate.toFixed(0)}</Text>
                      <Text>/video</Text>
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {tags.length > 3 && (
                <Text style={styles.moreTagsText}>{`+${tags.length - 3}`}</Text>
              )}
            </View>
          )}

          {/* Status / Spots */}
          <View style={styles.spotInfoRow}>
            {hasApplied ? (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedText}>Applied</Text>
              </View>
            ) : isEnded ? (
              <View style={styles.endedBadge}>
                <Text style={styles.endedText}>Ended</Text>
              </View>
            ) : isFull ? (
              <View style={styles.fullBadge}>
                <Text style={styles.fullText}>No spots available</Text>
              </View>
            ) : !hasMaxCreators ? (
              <Text style={styles.spotsText}>
                <Text style={styles.spotsValue}>Unlimited</Text>
                <Text> spots</Text>
              </Text>
            ) : (
              <Text style={styles.spotsText}>
                <Text style={styles.spotsValue}>{spotsRemaining}</Text>
                <Text> spots left</Text>
              </Text>
            )}
          </View>
        </View>

        {/* Brand Footer */}
        <View style={styles.brandFooter}>
          <View style={styles.brandFooterLeft}>
            {brand_logo_url ? (
              <Image
                source={{ uri: brand_logo_url }}
                style={styles.footerLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.footerLogoPlaceholder}>
                <Text style={styles.footerLogoText}>
                  {brand_name?.charAt(0) || 'B'}
                </Text>
              </View>
            )}
            <View style={styles.brandNameRow}>
              <Text style={styles.footerBrandName} numberOfLines={1}>
                {brand_name}
              </Text>
              {brand_is_verified && (
                <Icon name="check-decagram" size={12} color={colors.primary} />
              )}
            </View>
          </View>
          <Text style={styles.footerTime}>{timeAgo}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandName: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  progressSection: {
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  progressLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  submitButton: {
    width: '100%',
  },
  // Discover card styles - matches web BoostDiscoverCard
  discoverCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  discoverCardEnded: {
    opacity: 0.5,
  },
  discoverContent: {
    padding: 16,
    gap: 8,
  },
  discoverTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    lineHeight: 20,
    letterSpacing: -0.3,
    paddingRight: 24,
  },
  postedByText: {
    fontSize: 12,
    color: colors.mutedForeground,
    letterSpacing: -0.3,
  },
  postedByBrand: {
    fontWeight: '500',
    color: colors.foreground,
  },
  statsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statsLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    fontSize: 14,
    color: colors.mutedForeground,
    letterSpacing: -0.5,
  },
  statsValue: {
    color: colors.foreground,
    fontWeight: '500',
  },
  statsDot: {
    color: colors.border,
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 20,
  },
  tagBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  moreTagsText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  spotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotsText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  spotsValue: {
    color: colors.success,
    fontWeight: '500',
  },
  appliedBadge: {
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appliedText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  endedBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  endedText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  fullBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fullText: {
    fontSize: 12,
    color: colors.warning,
  },
  // Brand footer
  brandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.elevated,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  brandFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  footerLogo: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  footerLogoPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  footerBrandName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.foreground,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  footerTime: {
    fontSize: 11,
    color: colors.mutedForeground,
    letterSpacing: -0.3,
  },
  // Bookmark button
  bookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bookmarkButtonActive: {
    backgroundColor: colors.primary,
  },
});
