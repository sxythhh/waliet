import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { LiquidGlassView } from '@callstack/liquid-glass';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Campaign } from '@virality/shared-types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface CampaignCardProps {
  campaign: Campaign;
  onPress: (campaign: Campaign) => void;
}

// Platform icons with proper Material icons
const PlatformBadge = ({ platform }: { platform: string }) => {
  const platformConfig: Record<string, { bg: string; icon: string }> = {
    tiktok: { bg: '#000', icon: 'music-note' },
    instagram: { bg: '#E1306C', icon: 'instagram' },
    youtube: { bg: '#FF0000', icon: 'youtube' },
  };

  const config = platformConfig[platform.toLowerCase()] || { bg: '#666', icon: 'web' };

  return (
    <View style={[styles.platformBadge, { backgroundColor: config.bg }]}>
      <Icon name={config.icon} size={14} color="#fff" />
    </View>
  );
};

// iOS 26 Liquid Glass status badge component
const GlassStatusBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <View style={styles.statusBadgeContainer}>
      <LiquidGlassView style={styles.blurView} effect="clear" />
      <View style={[styles.statusContent, isActive ? styles.statusActiveOverlay : styles.statusEndedOverlay]}>
        {isActive && <View style={styles.statusDot} />}
        <Text style={styles.statusText}>{isActive ? 'Live' : 'Ended'}</Text>
      </View>
    </View>
  );
};

export function CampaignCard({ campaign, onPress }: CampaignCardProps) {
  const isActive = campaign.status === 'active';
  const budgetPercent = campaign.budget_total && campaign.budget_total > 0
    ? Math.min((campaign.budget_used || 0) / campaign.budget_total * 100, 100)
    : 0;

  const platforms = campaign.platforms_allowed || ['tiktok'];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(campaign)}
      activeOpacity={0.7}
    >
      {/* Banner/Header */}
      <View style={[styles.banner, { backgroundColor: campaign.brand_color || '#6366f1' }]}>
        {campaign.banner_url ? (
          <Image
            source={{ uri: campaign.banner_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : campaign.brand_logo_url ? (
          <Image
            source={{ uri: campaign.brand_logo_url }}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.brandInitial}>
            {campaign.brand_name?.[0]?.toUpperCase() || 'V'}
          </Text>
        )}

        {/* Glass Status Badge */}
        <GlassStatusBadge isActive={isActive} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Brand Info */}
        <View style={styles.brandRow}>
          <View style={styles.brandInfo}>
            <Icon name="domain" size={14} color="#666" style={styles.brandIcon} />
            <Text style={styles.brandName} numberOfLines={1}>
              {campaign.brand_name || 'Unknown Brand'}
            </Text>
          </View>
          {/* Platform badges */}
          <View style={styles.platforms}>
            {platforms.slice(0, 3).map((platform, i) => (
              <PlatformBadge key={i} platform={platform} />
            ))}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {campaign.title}
        </Text>

        {/* Budget & RPM */}
        <View style={styles.statsRow}>
          {/* Budget */}
          <View style={styles.budgetContainer}>
            <View style={styles.budgetHeader}>
              <Icon name="wallet-outline" size={14} color="#888" />
              <Text style={styles.budgetLabel}>Budget</Text>
            </View>
            <View style={styles.budgetBar}>
              <View style={[styles.budgetFill, { width: `${budgetPercent}%` }]} />
            </View>
            <Text style={styles.budgetText}>
              {campaign.infinite_budget
                ? 'Unlimited'
                : `$${((campaign.budget_total || 0) - (campaign.budget_used || 0)).toLocaleString()} left`}
            </Text>
          </View>

          {/* RPM */}
          {campaign.rpm_rate !== null && campaign.rpm_rate !== undefined && (
            <View style={styles.rpmContainer}>
              <View style={styles.rpmHeader}>
                <Icon name="trending-up" size={14} color="#22c55e" />
                <Text style={styles.rpmLabel}>RPM</Text>
              </View>
              <Text style={styles.rpmValue}>${campaign.rpm_rate.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    width: CARD_WIDTH,
  },
  banner: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  brandLogo: {
    width: 60,
    height: 60,
  },
  brandInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
  },
  statusBadgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusActiveOverlay: {
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
  },
  statusEndedOverlay: {
    backgroundColor: 'rgba(107, 114, 128, 0.4)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandIcon: {
    marginRight: 6,
  },
  brandName: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  platforms: {
    flexDirection: 'row',
    gap: 4,
  },
  platformBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  budgetContainer: {
    flex: 1,
    marginRight: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  budgetBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  budgetText: {
    fontSize: 12,
    color: '#888',
  },
  rpmContainer: {
    alignItems: 'flex-end',
  },
  rpmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rpmLabel: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rpmValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
});
