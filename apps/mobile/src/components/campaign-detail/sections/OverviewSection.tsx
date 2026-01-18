import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, borderRadius, spacing, typography } from '../../../theme/colors';
import { platformConfig } from '../../../hooks/useSocialAccounts';
import type { Campaign, CreatorStats } from '../../../hooks/useCampaignDetail';

interface OverviewSectionProps {
  campaign: Campaign | null;
  stats: CreatorStats | undefined;
  onRefresh: () => void;
  isLoading: boolean;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

// Info Row Component
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Icon name={icon} size={18} color={colors.mutedForeground} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function OverviewSection({
  campaign,
  stats,
  onRefresh,
  isLoading,
}: OverviewSectionProps) {
  if (!campaign) return null;

  const platforms = campaign.allowed_platforms || ['tiktok'];
  const isActive = campaign.status === 'active';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Campaign Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Campaign Details</Text>

        <View style={styles.infoList}>
          <InfoRow
            icon="circle"
            label="Status"
            value={isActive ? 'Live' : 'Ended'}
          />
          <InfoRow
            icon="calendar-outline"
            label="Type"
            value={campaign.type === 'boost' ? 'Boost' : 'Campaign'}
          />
          {campaign.rpm_rate && (
            <InfoRow
              icon="trending-up"
              label="Pay Rate"
              value={`$${campaign.rpm_rate.toFixed(2)} RPM`}
            />
          )}
        </View>
      </View>

      {/* About Section */}
      {campaign.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.description}>{campaign.description}</Text>
        </View>
      )}

      {/* Platforms */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Platforms</Text>
        <View style={styles.platformsRow}>
          {platforms.map((platform: string, i: number) => {
            const p = platform.toLowerCase() as keyof typeof platformConfig;
            const config = platformConfig[p];
            return (
              <View key={i} style={[styles.platformBadge, { backgroundColor: config?.bg || '#666' }]}>
                {config ? (
                  <Image
                    source={config.logoWhite}
                    style={styles.platformLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon name="web" size={14} color="#fff" />
                )}
                <Text style={styles.platformName}>{config?.name || platform}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Requirements */}
      {campaign.requirements && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Requirements</Text>
          <Text style={styles.description}>{campaign.requirements}</Text>
        </View>
      )}

      {/* Hashtags */}
      {campaign.hashtags && campaign.hashtags.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hashtags</Text>
          <View style={styles.hashtagsRow}>
            {campaign.hashtags.map((tag: string, i: number) => (
              <View key={i} style={styles.hashtag}>
                <Text style={styles.hashtagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mutedForeground,
    letterSpacing: -0.3,
  },
  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  // Info List
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    letterSpacing: -0.3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  // Description
  description: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  // Platforms
  platformsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  platformLogo: {
    width: 16,
    height: 16,
  },
  platformName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  // Hashtags
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtag: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hashtagText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
    letterSpacing: -0.3,
  },
});
