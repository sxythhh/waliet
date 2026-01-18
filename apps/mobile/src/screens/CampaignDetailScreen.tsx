import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogoLoader } from '../components/LogoLoader';
import { ApplySheet } from '../components/ApplySheet';
import { colors } from '../theme/colors';
import { platformConfig, useConnectedAccounts } from '../hooks/useSocialAccounts';
import type { Campaign } from '@virality/shared-types';

type RouteParams = {
  campaignId: string;
};

export function CampaignDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { campaignId } = route.params as RouteParams;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: connectedAccounts = [] } = useConnectedAccounts();

  const [applySuccess, setApplySuccess] = useState(false);
  const [showApplySheet, setShowApplySheet] = useState(false);

  const {
    data: campaign,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async (): Promise<Campaign | null> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Check if user has already applied/joined via campaign_submissions table
  const { data: existingSubmission } = useQuery({
    queryKey: ['campaignSubmission', campaignId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('campaign_submissions')
        .select('id, status')
        .eq('campaign_id', campaignId)
        .eq('creator_id', user.id)
        .neq('status', 'withdrawn')
        .maybeSingle();
      return data as { id: string; status: string } | null;
    },
    enabled: !!user?.id && !!campaignId,
  });

  // Apply mutation - direct submit without confirmation
  const applyMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      if (!user?.id || !campaign?.id) {
        throw new Error('Must be logged in to apply');
      }

      // Insert a submission for each selected account
      const submissions = accountIds.map(accountId => {
        const selectedAccount = connectedAccounts.find(a => a.id === accountId);
        const platform = selectedAccount?.platform || 'tiktok';
        const contentUrl = `pending-${Date.now()}-${user.id}-${accountId}`;

        return {
          campaign_id: campaign.id,
          creator_id: user.id,
          social_account_id: accountId,
          platform: platform,
          content_url: contentUrl,
          status: 'pending',
        };
      });

      const { error } = await supabase
        .from('campaign_submissions')
        .insert(submissions);

      if (error) throw error;
    },
    onError: (error: Error) => {
      Alert.alert('Application Failed', error.message);
    },
    onSuccess: () => {
      setApplySuccess(true);
      queryClient.invalidateQueries({ queryKey: ['campaignSubmission', campaignId] });
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      if (!user?.id) {
        throw new Error('Must be logged in to withdraw');
      }

      const { error } = await supabase
        .from('campaign_submissions')
        .update({ status: 'withdrawn' })
        .eq('id', submissionId)
        .eq('creator_id', user.id);

      if (error) throw error;
    },
    onError: (error: Error) => {
      Alert.alert('Withdrawal Failed', error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignSubmission', campaignId] });
      Alert.alert('Application Withdrawn', 'Your application has been withdrawn successfully.');
    },
  });

  // Handle withdraw with confirmation
  const handleWithdraw = useCallback(() => {
    if (!existingSubmission?.id) return;

    Alert.alert(
      'Withdraw Application',
      'Are you sure you want to withdraw your application? You can reapply later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => withdrawMutation.mutate(existingSubmission.id),
        },
      ]
    );
  }, [existingSubmission?.id, withdrawMutation]);

  // Open apply sheet
  const handleOpenApplySheet = useCallback(() => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to apply to campaigns.');
      return;
    }
    if (existingSubmission) {
      return;
    }
    setShowApplySheet(true);
  }, [user, existingSubmission]);

  // Actually submit application from sheet
  const handleApply = useCallback((accountIds: string[]) => {
    applyMutation.mutate(accountIds);
  }, [applyMutation]);

  // Close sheet
  const handleCloseSheet = useCallback(() => {
    setShowApplySheet(false);
    setApplySuccess(false);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Campaign not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Cast to any for type flexibility between shared-types and database schema
  const campaignData = campaign as any;
  const isActive = campaign.status === 'active';
  const platforms = campaignData.allowed_platforms || campaignData.platforms_allowed || ['tiktok'];
  const budgetRemaining = (campaignData.total_budget || campaignData.budget_total || 0) - (campaignData.budget_used || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => navigation.goBack()}
          >
            <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />
            <Icon name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View
          style={[
            styles.banner,
            { backgroundColor: '#6366f1' },
          ]}
        >
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

          {/* iOS 26 Liquid Glass Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <LiquidGlassView style={StyleSheet.absoluteFill} effect="clear" />
            <View style={[styles.statusContent, isActive ? styles.statusActiveOverlay : styles.statusEndedOverlay]}>
              {isActive && <View style={styles.statusDot} />}
              <Text style={styles.statusText}>
                {isActive ? 'Live' : 'Ended'}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Brand & Platforms */}
          <View style={styles.brandRow}>
            <View style={styles.brandInfo}>
              <Icon name="domain" size={14} color="#666" style={styles.brandIcon} />
              <Text style={styles.brandName}>{campaign.brand_name}</Text>
            </View>
            <View style={styles.platforms}>
              {platforms.map((platform: string, i: number) => {
                const p = platform.toLowerCase() as keyof typeof platformConfig;
                const config = platformConfig[p];
                return (
                  <View key={i} style={[styles.platformBadge, { backgroundColor: config?.bg || '#666' }]}>
                    {config ? (
                      <Image
                        source={config.logoWhite}
                        style={styles.platformLogoImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Icon name="web" size={14} color="#fff" />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{campaign.title}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {/* RPM */}
            {campaign.rpm_rate !== null && campaign.rpm_rate !== undefined && (
              <View style={styles.statBox}>
                <View style={styles.statHeader}>
                  <Icon name="trending-up" size={14} color="#6366f1" />
                  <Text style={styles.statLabel}>RPM</Text>
                </View>
                <Text style={[styles.statValue, { color: '#fff' }]}>
                  ${campaign.rpm_rate.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Budget */}
            <View style={styles.statBox}>
              <View style={styles.statHeader}>
                <Icon name="wallet-outline" size={14} color="#6366f1" />
                <Text style={styles.statLabel}>Budget</Text>
              </View>
              <Text style={[styles.statValue, { color: '#6366f1' }]}>
                {campaignData.is_infinite_budget || campaignData.infinite_budget
                  ? 'Unlimited'
                  : `$${budgetRemaining.toLocaleString()}`}
              </Text>
            </View>

            {/* Min Views */}
            {(campaignData.minimum_views || campaignData.min_views) && (
              <View style={styles.statBox}>
                <View style={styles.statHeader}>
                  <Icon name="eye-outline" size={14} color="#f59e0b" />
                  <Text style={styles.statLabel}>Min Views</Text>
                </View>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                  {(campaignData.minimum_views || campaignData.min_views).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {campaign.description && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="information-outline" size={18} color="#fff" />
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <Text style={styles.description}>{campaign.description}</Text>
            </View>
          )}

          {/* Requirements */}
          {campaign.requirements && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="clipboard-check-outline" size={18} color="#fff" />
                <Text style={styles.sectionTitle}>Requirements</Text>
              </View>
              <Text style={styles.requirements}>{campaign.requirements}</Text>
            </View>
          )}

          {/* Content Guidelines */}
          {campaign.guidelines && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="text-box-check-outline" size={18} color="#fff" />
                <Text style={styles.sectionTitle}>Content Guidelines</Text>
              </View>
              <Text style={styles.guidelines}>
                {campaign.guidelines}
              </Text>
            </View>
          )}

          {/* Hashtags */}
          {campaign.hashtags && campaign.hashtags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="pound" size={18} color="#fff" />
                <Text style={styles.sectionTitle}>Hashtags</Text>
              </View>
              <View style={styles.hashtagsRow}>
                {campaign.hashtags.map((tag, i) => (
                  <View key={i} style={styles.hashtag}>
                    <Text style={styles.hashtagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Apply Button - Fixed at bottom */}
      {isActive && (
        <View style={styles.applyContainer}>
          {existingSubmission ? (
            <View style={styles.applicationStatusCard}>
              <View style={styles.applicationStatusRow}>
                <View style={styles.applicationStatusLeft}>
                  <View style={[
                    styles.applicationStatusIcon,
                    existingSubmission.status === 'approved' || existingSubmission.status === 'accepted' ? styles.applicationStatusIconAccepted :
                    existingSubmission.status === 'rejected' ? styles.applicationStatusIconRejected :
                    styles.applicationStatusIconPending
                  ]}>
                    <Icon
                      name={
                        existingSubmission.status === 'approved' || existingSubmission.status === 'accepted' ? 'check' :
                        existingSubmission.status === 'rejected' ? 'close' : 'clock-outline'
                      }
                      size={18}
                      color={
                        existingSubmission.status === 'approved' || existingSubmission.status === 'accepted' ? colors.success :
                        existingSubmission.status === 'rejected' ? colors.destructive : colors.warning
                      }
                    />
                  </View>
                  <View>
                    <Text style={styles.applicationStatusTitle}>
                      {existingSubmission.status === 'approved' || existingSubmission.status === 'accepted' ? 'Accepted!' :
                       existingSubmission.status === 'rejected' ? 'Not Selected' : 'Application Pending'}
                    </Text>
                    <Text style={styles.applicationStatusSubtext}>
                      {existingSubmission.status === 'approved' || existingSubmission.status === 'accepted' ? 'You\'re in! Check your dashboard.' :
                       existingSubmission.status === 'rejected' ? 'Try other opportunities.' : 'Brand is reviewing your profile'}
                    </Text>
                  </View>
                </View>
                {existingSubmission.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.withdrawButton}
                    onPress={handleWithdraw}
                    disabled={withdrawMutation.isPending}
                  >
                    <Text style={styles.withdrawButtonText}>
                      {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.applyButtonNew}
              onPress={handleOpenApplySheet}
              activeOpacity={0.8}
            >
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Apply Sheet Modal */}
      <ApplySheet
        visible={showApplySheet}
        onClose={handleCloseSheet}
        onApply={handleApply}
        isLoading={applyMutation.isPending}
        isSuccess={applySuccess}
        title={campaign?.title || ''}
        brandName={campaign?.brand_name || 'Brand'}
        brandLogo={campaign?.brand_logo_url}
        accounts={connectedAccounts}
        allowedPlatforms={(campaign as any)?.allowed_platforms || (campaign as any)?.platforms_allowed}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
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
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerRow: {
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
  banner: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  brandLogo: {
    width: 80,
    height: 80,
  },
  brandInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
  },
  statusBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 13,
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
    marginTop: 8,
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
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  platforms: {
    flexDirection: 'row',
    gap: 6,
  },
  platformBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformLogoImage: {
    width: 16,
    height: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    lineHeight: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  requirements: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  guidelines: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtag: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  hashtagText: {
    color: '#6366f1',
    fontSize: 14,
  },
  applyContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Success toast
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successMuted,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  successToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  // New apply button
  applyButtonNew: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  applyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryForeground,
    letterSpacing: -0.3,
  },
  // Application status card
  applicationStatusCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  applicationStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  withdrawButton: {
    backgroundColor: colors.destructiveMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  withdrawButtonText: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: '600',
  },
  applicationStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicationStatusIconPending: {
    backgroundColor: colors.warningMuted,
  },
  applicationStatusIconAccepted: {
    backgroundColor: colors.successMuted,
  },
  applicationStatusIconRejected: {
    backgroundColor: colors.destructiveMuted,
  },
  applicationStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  applicationStatusSubtext: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
