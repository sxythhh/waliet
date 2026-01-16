import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import {
  useConnectedAccounts,
  platformConfig,
  Platform,
  SocialAccount,
} from '../hooks/useSocialAccounts';
import { ConnectAccountSheet } from '../components/social-accounts/ConnectAccountSheet';
import { AccountDetailSheet } from '../components/social-accounts/AccountDetailSheet';
import { LogoLoader } from '../components/LogoLoader';

function formatFollowers(count: number | null): string {
  if (count === null || count === undefined) return '';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M followers`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K followers`;
  }
  return `${count} followers`;
}

export function ConnectedAccountsScreen() {
  const navigation = useNavigation();
  const { data: accounts, isLoading, refetch, isRefetching } = useConnectedAccounts();

  const [connectSheetVisible, setConnectSheetVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAccountPress = (account: SocialAccount) => {
    setSelectedAccount(account);
  };

  const handleAccountDisconnected = () => {
    setSelectedAccount(null);
    refetch();
  };

  const handleAccountConnected = () => {
    setConnectSheetVisible(false);
    refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
        </View>
      </SafeAreaView>
    );
  }

  const connectedPlatforms = new Set(accounts?.map(a => a.platform) || []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Connected Accounts</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Connect your social accounts to apply for campaigns and track your performance.
          </Text>
        </View>

        {/* Connected Accounts List */}
        {accounts && accounts.length > 0 ? (
          <View style={styles.accountsList}>
            <Text style={styles.sectionLabel}>Connected</Text>
            {accounts.map((account) => {
              const config = platformConfig[account.platform];
              return (
                <TouchableOpacity
                  key={account.id}
                  style={styles.accountItem}
                  onPress={() => handleAccountPress(account)}
                >
                  <View style={[styles.accountIcon, { backgroundColor: config.bg }]}>
                    {account.avatarUrl ? (
                      <Image
                        source={{ uri: account.avatarUrl }}
                        style={styles.accountAvatar}
                      />
                    ) : (
                      <Icon name={config.icon} size={20} color={colors.foreground} />
                    )}
                  </View>
                  <View style={styles.accountInfo}>
                    <View style={styles.accountNameRow}>
                      <Text style={styles.accountPlatform}>{config.name}</Text>
                      {account.isVerified && (
                        <Icon name="check-decagram" size={14} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.accountUsername}>@{account.username}</Text>
                    {account.followerCount !== null && account.followerCount > 0 && (
                      <Text style={styles.accountFollowers}>
                        {formatFollowers(account.followerCount)}
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="link-variant-off" size={40} color={colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>No accounts connected</Text>
            <Text style={styles.emptySubtitle}>
              Connect your social media accounts to start applying for campaigns
            </Text>
          </View>
        )}

        {/* Add Account Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setConnectSheetVisible(true)}
        >
          <Icon name="plus-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.addButtonText}>Connect Account</Text>
        </TouchableOpacity>

        {/* Platform Status */}
        <View style={styles.platformStatus}>
          <Text style={styles.sectionLabel}>Available Platforms</Text>
          <View style={styles.platformGrid}>
            {(Object.keys(platformConfig) as Platform[]).map((platform) => {
              const config = platformConfig[platform];
              const isConnected = connectedPlatforms.has(platform);
              return (
                <View
                  key={platform}
                  style={[
                    styles.platformChip,
                    isConnected && styles.platformChipConnected,
                  ]}
                >
                  <Icon
                    name={config.icon}
                    size={16}
                    color={isConnected ? colors.success : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.platformChipText,
                      isConnected && styles.platformChipTextConnected,
                    ]}
                  >
                    {config.name}
                  </Text>
                  {isConnected && (
                    <Icon name="check" size={14} color={colors.success} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Connect Account Sheet */}
      <ConnectAccountSheet
        visible={connectSheetVisible}
        onClose={() => setConnectSheetVisible(false)}
        onConnected={handleAccountConnected}
        connectedPlatforms={connectedPlatforms}
      />

      {/* Account Detail Sheet */}
      <AccountDetailSheet
        account={selectedAccount}
        visible={selectedAccount !== null}
        onClose={() => setSelectedAccount(null)}
        onDisconnected={handleAccountDisconnected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  accountsList: {
    marginBottom: 24,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountPlatform: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  accountUsername: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  accountFollowers: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 280,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  platformStatus: {
    marginBottom: 100,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformChipConnected: {
    borderColor: colors.success,
    backgroundColor: colors.successMuted,
  },
  platformChipText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  platformChipTextConnected: {
    color: colors.success,
  },
});
