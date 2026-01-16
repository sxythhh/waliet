import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Badge } from '../ui';

export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'discord';

export interface SocialAccount {
  platform: SocialPlatform;
  username?: string;
  connected: boolean;
  followers?: number;
  verified?: boolean;
  profile_url?: string;
}

export interface SocialAccountRowProps {
  account: SocialAccount;
  onConnect?: () => void;
  onDisconnect?: () => void;
  style?: ViewStyle;
}

const platformConfig: Record<SocialPlatform, { icon: string; color: string; name: string }> = {
  tiktok: { icon: 'music-note', color: '#000', name: 'TikTok' },
  instagram: { icon: 'instagram', color: '#E1306C', name: 'Instagram' },
  youtube: { icon: 'youtube', color: '#FF0000', name: 'YouTube' },
  twitter: { icon: 'twitter', color: '#1DA1F2', name: 'X (Twitter)' },
  discord: { icon: 'discord', color: '#5865F2', name: 'Discord' },
};

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function SocialAccountRow({
  account,
  onConnect,
  onDisconnect,
  style,
}: SocialAccountRowProps) {
  const config = platformConfig[account.platform];

  const handlePress = () => {
    if (account.connected && account.profile_url) {
      Linking.openURL(account.profile_url);
    } else if (!account.connected && onConnect) {
      onConnect();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Platform Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
        <Icon name={config.icon} size={20} color="#fff" />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.platformName}>{config.name}</Text>
          {account.verified && (
            <Icon name="check-decagram" size={14} color={colors.primary} />
          )}
        </View>
        {account.connected ? (
          <View style={styles.detailsRow}>
            <Text style={styles.username}>@{account.username}</Text>
            {account.followers !== undefined && (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.followers}>
                  {formatFollowers(account.followers)} followers
                </Text>
              </>
            )}
          </View>
        ) : (
          <Text style={styles.notConnected}>Not connected</Text>
        )}
      </View>

      {/* Action */}
      <View style={styles.action}>
        {account.connected ? (
          <Badge variant="success" size="sm">
            Connected
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            Connect
          </Badge>
        )}
      </View>
    </TouchableOpacity>
  );
}

// List wrapper for multiple accounts
export interface SocialAccountsListProps {
  accounts: SocialAccount[];
  onConnect?: (platform: SocialPlatform) => void;
  onDisconnect?: (platform: SocialPlatform) => void;
  style?: ViewStyle;
}

export function SocialAccountsList({
  accounts,
  onConnect,
  onDisconnect,
  style,
}: SocialAccountsListProps) {
  return (
    <View style={style}>
      {accounts.map((account, index) => (
        <SocialAccountRow
          key={account.platform}
          account={account}
          onConnect={() => onConnect?.(account.platform)}
          onDisconnect={() => onDisconnect?.(account.platform)}
          style={index < accounts.length - 1 ? { marginBottom: 8 } : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  platformName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  username: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  dot: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginHorizontal: 4,
  },
  followers: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  notConnected: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  action: {
    marginLeft: 8,
  },
});
