import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Avatar, Badge } from '../ui';

export interface ProfileData {
  id: string;
  display_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  tier?: string;
  bio?: string;
  total_views?: number;
  total_earned?: number;
  submissions_count?: number;
  approval_rate?: number;
}

export interface ProfileHeaderProps {
  profile: ProfileData;
  onEditPress?: () => void;
  onAvatarPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getTierConfig(tier?: string): { color: string; label: string } {
  switch (tier?.toLowerCase()) {
    case 'bronze':
      return { color: colors.rank.bronze, label: 'Bronze' };
    case 'silver':
      return { color: colors.rank.silver, label: 'Silver' };
    case 'gold':
      return { color: colors.rank.gold, label: 'Gold' };
    case 'platinum':
      return { color: colors.rank.platinum, label: 'Platinum' };
    case 'elite':
      return { color: colors.rank.elite, label: 'Elite' };
    default:
      return { color: colors.mutedForeground, label: tier || 'Starter' };
  }
}

export function ProfileHeader({
  profile,
  onEditPress,
  onAvatarPress,
  style,
  compact = false,
}: ProfileHeaderProps) {
  const tierConfig = getTierConfig(profile.tier);

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
          <Avatar
            src={profile.avatar_url}
            alt={profile.display_name}
            size="lg"
          />
        </TouchableOpacity>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>
            {profile.display_name || 'Anonymous'}
          </Text>
          {profile.username && (
            <Text style={styles.compactUsername}>@{profile.username}</Text>
          )}
        </View>
        {onEditPress && (
          <TouchableOpacity onPress={onEditPress} style={styles.editButton}>
            <Icon name="pencil" size={18} color={colors.foreground} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Avatar & Edit */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
          <Avatar
            src={profile.avatar_url}
            alt={profile.display_name}
            size="2xl"
          />
        </TouchableOpacity>
        {onEditPress && (
          <TouchableOpacity
            onPress={onEditPress}
            style={styles.editAvatarButton}
          >
            <Icon name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Name & Username */}
      <View style={styles.nameSection}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.display_name || 'Anonymous'}</Text>
          {profile.tier && (
            <View style={[styles.tierBadge, { backgroundColor: tierConfig.color + '20' }]}>
              <Icon name="shield-star" size={12} color={tierConfig.color} />
              <Text style={[styles.tierText, { color: tierConfig.color }]}>
                {tierConfig.label}
              </Text>
            </View>
          )}
        </View>
        {profile.username && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
        {profile.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatNumber(profile.submissions_count || 0)}
          </Text>
          <Text style={styles.statLabel}>Videos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {profile.approval_rate ? `${profile.approval_rate}%` : '0%'}
          </Text>
          <Text style={styles.statLabel}>Approval</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatNumber(profile.total_views || 0)}
          </Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            ${((profile.total_earned || 0) / 100).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  compactName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  compactUsername: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
