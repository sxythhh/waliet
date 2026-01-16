import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';

export type CreatorTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite';

export interface TierBadgeProps {
  tier: CreatorTier;
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  style?: ViewStyle;
}

const tierConfig: Record<CreatorTier, { color: string; icon: string; label: string }> = {
  starter: { color: colors.mutedForeground, icon: 'star-outline', label: 'Starter' },
  bronze: { color: colors.rank.bronze, icon: 'shield-star', label: 'Bronze' },
  silver: { color: colors.rank.silver, icon: 'shield-star', label: 'Silver' },
  gold: { color: colors.rank.gold, icon: 'shield-star', label: 'Gold' },
  platinum: { color: colors.rank.platinum, icon: 'shield-star', label: 'Platinum' },
  elite: { color: colors.rank.elite, icon: 'crown', label: 'Elite' },
};

const sizeConfig = {
  sm: { icon: 12, text: 10, padding: 4, gap: 3 },
  default: { icon: 14, text: 12, padding: 6, gap: 4 },
  lg: { icon: 18, text: 14, padding: 8, gap: 6 },
};

export function TierBadge({
  tier,
  size = 'default',
  showLabel = true,
  style,
}: TierBadgeProps) {
  const config = tierConfig[tier] || tierConfig.starter;
  const sizing = sizeConfig[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.color + '20',
          paddingHorizontal: sizing.padding * 1.5,
          paddingVertical: sizing.padding,
          gap: sizing.gap,
        },
        style,
      ]}
    >
      <Icon name={config.icon} size={sizing.icon} color={config.color} />
      {showLabel && (
        <Text style={[styles.label, { color: config.color, fontSize: sizing.text }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
}

// Progress indicator for tier advancement
export interface TierProgressProps {
  currentTier: CreatorTier;
  progress: number; // 0-100
  nextTier?: CreatorTier;
  style?: ViewStyle;
}

export function TierProgress({
  currentTier,
  progress,
  nextTier,
  style,
}: TierProgressProps) {
  const currentConfig = tierConfig[currentTier];
  const nextConfig = nextTier ? tierConfig[nextTier] : null;

  return (
    <View style={[styles.progressContainer, style]}>
      <View style={styles.progressHeader}>
        <TierBadge tier={currentTier} size="sm" />
        {nextConfig && (
          <>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: currentConfig.color,
                  },
                ]}
              />
            </View>
            <TierBadge tier={nextTier!} size="sm" />
          </>
        )}
      </View>
      {nextConfig && (
        <Text style={styles.progressText}>
          {progress}% to {nextConfig.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  label: {
    fontWeight: '600',
  },
  // Progress styles
  progressContainer: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
  },
});
