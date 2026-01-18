import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { LogoLoader } from '../components/LogoLoader';
import { colors } from '../theme/colors';
import { platformConfig, getPlatformUrl } from '../hooks/useSocialAccounts';

type RouteParams = {
  userId: string;
};

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
}

interface SocialAccountRow {
  id: string;
  platform: string;
  username: string;
  avatar_url: string | null;
  follower_count: number | null;
  is_verified: boolean;
}

interface Stats {
  total_views: number;
  campaigns_joined: number;
  total_earnings: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getAvatarColor(name: string): string {
  const avatarColors = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
    '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
    '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

export function UserProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params as RouteParams;

  // Fetch profile data
  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, created_at')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch connected social accounts
  const { data: socialAccounts } = useQuery({
    queryKey: ['user-social-accounts', userId],
    queryFn: async (): Promise<SocialAccountRow[]> => {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('id, platform, username, avatar_url, follower_count, is_verified')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []) as SocialAccountRow[];
    },
    enabled: !!userId,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async (): Promise<Stats> => {
      // Get total views from video submissions
      const { data: videos } = await supabase
        .from('video_submissions')
        .select('views')
        .eq('creator_id', userId);

      const totalViews = (videos || []).reduce((sum, v) => sum + (v.views || 0), 0);

      // Get campaigns joined
      const { count: campaignsCount } = await supabase
        .from('campaign_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .eq('status', 'approved');

      return {
        total_views: totalViews,
        campaigns_joined: campaignsCount || 0,
        total_earnings: 0, // Hidden for privacy
      };
    },
    enabled: !!userId,
  });

  const handleRefresh = () => {
    refetchProfile();
  };

  const openSocialProfile = (url: string | null) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="account-off" size={64} color={colors.mutedForeground} />
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile.full_name || profile.username || 'Creator';
  const avatarColor = getAvatarColor(displayName);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
            <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />
            <Icon name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />
          <View style={styles.profileContent}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
              )}
            </View>

            {/* Name & Username */}
            <Text style={styles.displayName}>{displayName}</Text>
            {profile.username && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}

            {/* Bio */}
            {profile.bio && (
              <Text style={styles.bio}>{profile.bio}</Text>
            )}

            {/* Join Date */}
            {profile.created_at && (
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="calendar" size={14} color={colors.mutedForeground} />
                  <Text style={styles.metaText}>Joined {formatDate(profile.created_at)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Icon name="eye" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{formatNumber(stats?.total_views || 0)}</Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="movie-open" size={24} color={colors.success} />
            <Text style={styles.statValue}>{stats?.campaigns_joined || 0}</Text>
            <Text style={styles.statLabel}>Campaigns</Text>
          </View>
        </View>

        {/* Connected Accounts */}
        {socialAccounts && socialAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Accounts</Text>
            <View style={styles.accountsGrid}>
              {socialAccounts.map((account) => {
                const platform = account.platform.toLowerCase() as keyof typeof platformConfig;
                const config = platformConfig[platform];
                const profileUrl = getPlatformUrl(platform, account.username);
                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.accountCard, { backgroundColor: config?.bg || '#666' }]}
                    onPress={() => openSocialProfile(profileUrl)}
                    activeOpacity={0.8}
                  >
                    {config ? (
                      <Image source={config.logoWhite} style={styles.accountLogo} resizeMode="contain" />
                    ) : (
                      <Icon name="web" size={20} color="#fff" />
                    )}
                    <Text style={styles.accountUsername} numberOfLines={1}>
                      @{account.username}
                    </Text>
                    {account.follower_count && (
                      <Text style={styles.accountFollowers}>
                        {formatNumber(account.follower_count)} followers
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    gap: 16,
  },
  errorText: {
    color: colors.mutedForeground,
    fontSize: 18,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: 8,
  },
  backButtonText: {
    color: colors.foreground,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  profileContent: {
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  displayName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  bio: {
    fontSize: 15,
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 12,
  },
  accountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: '45%',
    flexGrow: 1,
  },
  accountLogo: {
    width: 20,
    height: 20,
  },
  accountUsername: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  accountFollowers: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
});
