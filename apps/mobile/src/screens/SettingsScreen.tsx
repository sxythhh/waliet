import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { Card } from '../components/ui';

interface NotificationSettings {
  notify_email_new_campaigns: boolean;
  notify_email_campaign_updates: boolean;
  notify_email_payout_status: boolean;
  notify_email_weekly_roundup: boolean;
  notify_discord_new_campaigns: boolean;
  notify_discord_campaign_updates: boolean;
  notify_discord_payout_status: boolean;
}

export function SettingsScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notification settings from profile
  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async (): Promise<NotificationSettings | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          notify_email_new_campaigns,
          notify_email_campaign_updates,
          notify_email_payout_status,
          notify_email_weekly_roundup,
          notify_discord_new_campaigns,
          notify_discord_campaign_updates,
          notify_discord_payout_status
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as NotificationSettings;
    },
    enabled: !!user?.id,
  });

  // Update notification settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', user?.id] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    },
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => handleOpenLink('https://virality.so/settings/account'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Email Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="email-outline" size={18} color={colors.foreground} />
            <Text style={styles.sectionTitle}>Email Notifications</Text>
          </View>
          <Card variant="bordered" style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>New Campaigns</Text>
                <Text style={styles.settingDescription}>
                  Get notified when new campaigns match your profile
                </Text>
              </View>
              <Switch
                value={settings?.notify_email_new_campaigns ?? true}
                onValueChange={(value) => handleToggle('notify_email_new_campaigns', value)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                disabled={isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Campaign Updates</Text>
                <Text style={styles.settingDescription}>
                  Updates about campaigns you've applied to
                </Text>
              </View>
              <Switch
                value={settings?.notify_email_campaign_updates ?? true}
                onValueChange={(value) => handleToggle('notify_email_campaign_updates', value)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                disabled={isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Payout Status</Text>
                <Text style={styles.settingDescription}>
                  Get notified when your payouts are processed
                </Text>
              </View>
              <Switch
                value={settings?.notify_email_payout_status ?? true}
                onValueChange={(value) => handleToggle('notify_email_payout_status', value)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                disabled={isLoading}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Weekly Roundup</Text>
                <Text style={styles.settingDescription}>
                  Weekly summary of your earnings and activity
                </Text>
              </View>
              <Switch
                value={settings?.notify_email_weekly_roundup ?? true}
                onValueChange={(value) => handleToggle('notify_email_weekly_roundup', value)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                disabled={isLoading}
              />
            </View>
          </Card>
        </View>

        {/* Discord Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="discord" size={18} color="#5865F2" />
            <Text style={styles.sectionTitle}>Discord Notifications</Text>
          </View>
          <Card variant="bordered" style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>New Campaigns</Text>
                <Text style={styles.settingDescription}>
                  DM alerts for new campaign opportunities
                </Text>
              </View>
              <Switch
                value={settings?.notify_discord_new_campaigns ?? true}
                onValueChange={(value) => handleToggle('notify_discord_new_campaigns', value)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                disabled={isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Campaign Updates</Text>
                <Text style={styles.settingDescription}>
                  Updates about your campaign submissions
                </Text>
              </View>
              <Switch
                value={settings?.notify_discord_campaign_updates ?? true}
                onValueChange={(value) => handleToggle('notify_discord_campaign_updates', value)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                disabled={isLoading}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Payout Status</Text>
                <Text style={styles.settingDescription}>
                  DM alerts when your payouts are processed
                </Text>
              </View>
              <Switch
                value={settings?.notify_discord_payout_status ?? true}
                onValueChange={(value) => handleToggle('notify_discord_payout_status', value)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.foreground}
                disabled={isLoading}
              />
            </View>
          </Card>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="help-circle-outline" size={18} color={colors.foreground} />
            <Text style={styles.sectionTitle}>Support</Text>
          </View>
          <Card variant="bordered" style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOpenLink('https://virality.so/help')}
            >
              <Icon name="lifebuoy" size={20} color={colors.mutedForeground} />
              <Text style={styles.menuItemText}>Help Center</Text>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOpenLink('mailto:support@virality.so')}
            >
              <Icon name="email-outline" size={20} color={colors.mutedForeground} />
              <Text style={styles.menuItemText}>Contact Support</Text>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => handleOpenLink('https://discord.gg/virality')}
            >
              <Icon name="discord" size={20} color={colors.mutedForeground} />
              <Text style={styles.menuItemText}>Join Discord</Text>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="shield-check-outline" size={18} color={colors.foreground} />
            <Text style={styles.sectionTitle}>Legal</Text>
          </View>
          <Card variant="bordered" style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleOpenLink('https://virality.so/terms')}
            >
              <Icon name="file-document-outline" size={20} color={colors.mutedForeground} />
              <Text style={styles.menuItemText}>Terms of Service</Text>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => handleOpenLink('https://virality.so/privacy')}
            >
              <Icon name="shield-lock-outline" size={20} color={colors.mutedForeground} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Account Actions */}
        {user && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="account-cog-outline" size={18} color={colors.foreground} />
              <Text style={styles.sectionTitle}>Account</Text>
            </View>
            <Card variant="bordered" style={styles.settingsCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleSignOut}
              >
                <Icon name="logout" size={20} color={colors.warning} />
                <Text style={[styles.menuItemText, { color: colors.warning }]}>Sign Out</Text>
                <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={handleDeleteAccount}
              >
                <Icon name="account-remove-outline" size={20} color={colors.destructive} />
                <Text style={[styles.menuItemText, { color: colors.destructive }]}>Delete Account</Text>
                <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </Card>
          </View>
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
    backgroundColor: colors.background,
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
    minWidth: 48,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
  },
  headerSpacer: {
    minWidth: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingBottom: 100,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
  },
  versionText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 13,
    marginTop: 16,
  },
});
