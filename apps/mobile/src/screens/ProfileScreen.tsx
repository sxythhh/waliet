import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CreatorStats {
  totalSubmissions: number;
  approvedSubmissions: number;
  totalViews: number;
  totalEarned: number;
  approvalRate: number;
}

interface CreatorProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  tiktok_handle: string;
  instagram_handle: string;
  youtube_handle: string;
  tier: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProfileScreen() {
  const { user, loading, signInWithDiscord, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  // Fetch creator profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<CreatorProfile | null> => {
      if (!user?.id) return null;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch creator stats
  const { data: stats } = useQuery({
    queryKey: ['creator-stats', user?.id],
    queryFn: async (): Promise<CreatorStats> => {
      if (!user?.id) {
        return {
          totalSubmissions: 0,
          approvedSubmissions: 0,
          totalViews: 0,
          totalEarned: 0,
          approvalRate: 0,
        };
      }

      // Get submission stats
      const { data: submissions } = await supabase
        .from('video_submissions')
        .select('status, total_views, total_earned')
        .eq('user_id', user.id);

      const total = submissions?.length || 0;
      const approved = submissions?.filter(
        (s) => s.status === 'approved' || s.status === 'paid'
      ).length || 0;
      const views = submissions?.reduce((sum, s) => sum + (s.total_views || 0), 0) || 0;
      const earned = submissions?.reduce((sum, s) => sum + (s.total_earned || 0), 0) || 0;

      return {
        totalSubmissions: total,
        approvedSubmissions: approved,
        totalViews: views,
        totalEarned: earned,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      };
    },
    enabled: !!user?.id,
  });

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {user ? (
            <>
              <View style={styles.avatar}>
                {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                  <Image
                    source={{ uri: profile?.avatar_url || user.user_metadata?.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {(profile?.full_name || user.user_metadata?.full_name)?.[0] ||
                      user.email?.[0]?.toUpperCase() ||
                      '?'}
                  </Text>
                )}
              </View>
              <Text style={styles.userName}>
                {profile?.full_name || user.user_metadata?.full_name || 'Creator'}
              </Text>
              {profile?.username && (
                <Text style={styles.userHandle}>@{profile.username}</Text>
              )}
              {profile?.tier && (
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>{profile.tier}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>?</Text>
              </View>
              <Text style={styles.signInPrompt}>Sign in to view your profile</Text>
              <TouchableOpacity style={styles.signInButton} onPress={signInWithDiscord}>
                <Text style={styles.signInButtonText}>Sign In with Discord</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats Grid - Only show when signed in */}
        {user && stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalSubmissions}</Text>
              <Text style={styles.statLabel}>Submissions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                {stats.approvalRate}%
              </Text>
              <Text style={styles.statLabel}>Approval Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(stats.totalViews)}</Text>
              <Text style={styles.statLabel}>Total Views</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#6366f1' }]}>
                {formatCurrency(stats.totalEarned)}
              </Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        )}

        {/* Connected Accounts - Only show when signed in */}
        {user && profile && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="link-variant" size={18} color="#fff" />
              <Text style={styles.sectionTitle}>Connected Accounts</Text>
            </View>
            <View style={styles.accountsList}>
              {profile.tiktok_handle && (
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() => handleOpenLink(`https://tiktok.com/@${profile.tiktok_handle}`)}
                >
                  <View style={[styles.accountIcon, { backgroundColor: '#000' }]}>
                    <Icon name="music-note" size={18} color="#fff" />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>TikTok</Text>
                    <Text style={styles.accountHandle}>@{profile.tiktok_handle}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              )}
              {profile.instagram_handle && (
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() => handleOpenLink(`https://instagram.com/${profile.instagram_handle}`)}
                >
                  <View style={[styles.accountIcon, { backgroundColor: '#E1306C' }]}>
                    <Icon name="instagram" size={18} color="#fff" />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>Instagram</Text>
                    <Text style={styles.accountHandle}>@{profile.instagram_handle}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              )}
              {profile.youtube_handle && (
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() => handleOpenLink(`https://youtube.com/@${profile.youtube_handle}`)}
                >
                  <View style={[styles.accountIcon, { backgroundColor: '#FF0000' }]}>
                    <Icon name="youtube" size={18} color="#fff" />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>YouTube</Text>
                    <Text style={styles.accountHandle}>@{profile.youtube_handle}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              )}
              {!profile.tiktok_handle && !profile.instagram_handle && !profile.youtube_handle && (
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={() => handleOpenLink('https://virality.so/settings')}
                >
                  <Icon name="plus-circle-outline" size={18} color="#6366f1" style={styles.connectIcon} />
                  <Text style={styles.connectButtonText}>Connect your social accounts</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="cog-outline" size={18} color="#fff" />
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <Icon name="bell-outline" size={22} color="#888" style={styles.settingIconLeft} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get notified about campaign updates
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#333', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <View style={styles.menuList}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOpenLink('https://virality.so/help')}
            >
              <Icon name="help-circle-outline" size={22} color="#888" style={styles.menuIconLeft} />
              <Text style={styles.menuItemText}>Help & Support</Text>
              <Icon name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOpenLink('https://virality.so/terms')}
            >
              <Icon name="file-document-outline" size={22} color="#888" style={styles.menuIconLeft} />
              <Text style={styles.menuItemText}>Terms of Service</Text>
              <Icon name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOpenLink('https://virality.so/privacy')}
            >
              <Icon name="shield-lock-outline" size={22} color="#888" style={styles.menuIconLeft} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
              <Icon name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        {user && (
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Icon name="logout" size={20} color="#ef4444" style={styles.signOutIcon} />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* App Version */}
        <Text style={styles.versionText}>Virality v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  profileCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    fontSize: 36,
    color: '#666',
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 8,
  },
  tierBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  signInPrompt: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#5865F2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statItem: {
    width: '47%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  accountsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  accountHandle: {
    fontSize: 13,
    color: '#888',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  connectIcon: {
    marginRight: 8,
  },
  connectButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  settingIconLeft: {
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
  },
  menuList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  menuIconLeft: {
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  signOutButton: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 16,
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginBottom: 100,
  },
});
