import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LiquidGlassView } from '@callstack/liquid-glass';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { Card, Badge, Progress } from './ui';
import { platformConfig } from '../hooks/useSocialAccounts';
import type { Campaign } from '@virality/shared-types';

export interface CampaignCardProps {
  campaign: Campaign;
  onPress: (campaign: Campaign) => void;
  isJoined?: boolean;
  isApplied?: boolean;
}

// Platform badge with actual logo images
const PlatformBadge = ({ platform }: { platform: string }) => {
  const p = platform.toLowerCase() as keyof typeof platformConfig;
  const config = platformConfig[p];

  if (!config) {
    return (
      <View style={[styles.platformBadge, { backgroundColor: colors.mutedForeground }]}>
        <Icon name="web" size={14} color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={[styles.platformBadge, { backgroundColor: config.bg }]}>
      <Image
        source={config.logoWhite}
        style={styles.platformLogoImage}
        resizeMode="contain"
      />
    </View>
  );
};

// Minimal dot-style status indicator matching web design
const StatusIndicator = ({
  isActive,
  isJoined,
  isApplied,
}: {
  isActive: boolean;
  isJoined?: boolean;
  isApplied?: boolean;
}) => {
  // Determine status colors and text
  let bgColor: string = colors.muted;
  let dotColor: string = colors.mutedForeground;
  let textColor: string = colors.mutedForeground;
  let text = 'Ended';

  if (isJoined) {
    bgColor = 'rgba(88, 101, 242, 0.1)';
    dotColor = colors.primary;
    textColor = colors.primary;
    text = 'Joined';
  } else if (isApplied) {
    bgColor = 'rgba(245, 158, 11, 0.1)';
    dotColor = colors.warning;
    textColor = colors.warning;
    text = 'Applied';
  } else if (isActive) {
    bgColor = 'rgba(34, 197, 94, 0.1)';
    dotColor = colors.success;
    textColor = colors.success;
    text = 'Live';
  }

  return (
    <View style={[styles.statusIndicator, { backgroundColor: bgColor }]}>
      <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.statusText, { color: textColor }]}>{text}</Text>
    </View>
  );
};

export function CampaignCard({
  campaign,
  onPress,
  isJoined = false,
  isApplied = false,
}: CampaignCardProps) {
  // Cast to any for type flexibility between shared-types and database schema
  const c = campaign as any;
  const isActive = campaign.status === 'active';
  const budgetTotal = c.budget || c.budget_total || c.total_budget || 0;
  const budgetUsed = c.budget_used || 0;
  const budgetPercent = budgetTotal > 0
    ? Math.min((budgetUsed / budgetTotal) * 100, 100)
    : 0;

  const platforms: string[] = c.platforms_allowed || c.allowed_platforms || ['tiktok'];
  const isUnlimited = c.infinite_budget || c.is_infinite_budget;

  return (
    <TouchableOpacity
      onPress={() => onPress(campaign)}
      activeOpacity={0.7}
    >
      <Card variant="bordered" style={styles.card}>
        {/* Banner/Header - 21:9 aspect ratio like web */}
        <View style={[styles.banner, { backgroundColor: c.brand_color || '#1a1a1a' }]}>
          {campaign.banner_url ? (
            <Image
              source={{ uri: campaign.banner_url }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : campaign.brand_logo_url ? (
            <View style={styles.bannerLogoContainer}>
              <Image
                source={{ uri: campaign.brand_logo_url }}
                style={styles.bannerBrandLogo}
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Row with Status */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {campaign.title}
            </Text>
            <StatusIndicator
              isActive={isActive}
              isJoined={isJoined}
              isApplied={isApplied}
            />
          </View>

          {/* Brand Info */}
          <View style={styles.brandInfoRow}>
            {campaign.brand_logo_url && (
              <Image
                source={{ uri: campaign.brand_logo_url }}
                style={styles.brandInfoLogo}
                resizeMode="cover"
              />
            )}
            <Text style={styles.brandInfoName} numberOfLines={1}>
              {campaign.brand_name || 'Unknown Brand'}
            </Text>
            {/* Platform badges inline */}
            <View style={styles.platformsInline}>
              {platforms.slice(0, 2).map((platform, i) => (
                <PlatformBadge key={i} platform={platform} />
              ))}
            </View>
          </View>

          {/* Budget Progress - matching web style */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetLabelRow}>
              <Text style={styles.budgetLabelText}>
                {isUnlimited ? (
                  <Text style={styles.unlimitedText}>∞ Unlimited</Text>
                ) : (
                  <>
                    <Text style={styles.budgetUsedText}>${budgetUsed.toLocaleString()}</Text>
                    <Text style={styles.budgetTotalText}> / ${budgetTotal.toLocaleString()}</Text>
                  </>
                )}
              </Text>
            </View>
            {!isUnlimited && (
              <Progress
                value={budgetPercent}
                height={6}
                style={styles.budgetProgressBar}
              />
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Banner - 21:9 aspect ratio matching web
  banner: {
    width: '100%',
    aspectRatio: 21 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bannerLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bannerBrandLogo: {
    width: '100%',
    height: '100%',
  },
  // Content section
  content: {
    padding: 12,
    gap: 10,
  },
  // Title row with status
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    lineHeight: 18,
    flex: 1,
    letterSpacing: -0.3,
  },
  // Status indicator - minimal dot style
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Brand info row
  brandInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandInfoLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  brandInfoName: {
    fontSize: 12,
    color: colors.mutedForeground,
    flex: 1,
    letterSpacing: -0.3,
  },
  platformsInline: {
    flexDirection: 'row',
    gap: 4,
  },
  platformBadge: {
    width: 22,
    height: 22,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformLogoImage: {
    width: 14,
    height: 14,
  },
  // Budget section
  budgetSection: {
    marginTop: 4,
  },
  budgetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetLabelText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  budgetUsedText: {
    color: colors.foreground,
    fontWeight: '600',
  },
  budgetTotalText: {
    color: colors.mutedForeground,
  },
  unlimitedText: {
    color: colors.success,
  },
  budgetProgressBar: {
    borderRadius: 9999,
  },
});
