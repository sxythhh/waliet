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
import { useConnectedAccounts } from '../hooks/useSocialAccounts';
import { Card, Badge, Button } from '../components/ui';
// Note: Using local interface instead of @virality/shared-types BountyCampaign
// because the schema includes flat_rate fields not in the shared types

type RouteParams = {
  boostId: string;
};

// Extended type to include flat_rate fields that may exist in newer schemas
interface BoostWithBrand {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  monthly_retainer: number;
  videos_per_month: number;
  max_accepted_creators?: number | null;
  accepted_creators_count?: number | null;
  banner_url?: string | null;
  content_style_requirements?: string | null;
  content_distribution?: string | null;
  tags?: string[] | null;
  // Flat rate fields (may not be in all schemas)
  payment_model?: 'retainer' | 'flat_rate' | null;
  flat_rate_min?: number | null;
  flat_rate_max?: number | null;
  brands?: {
    name: string;
    logo_url: string | null;
    is_verified?: boolean;
    slug?: string;
  } | null;
}

export function BoostDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { boostId } = route.params as RouteParams;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: connectedAccounts = [] } = useConnectedAccounts();

  const [applySuccess, setApplySuccess] = useState(false);
  const [showApplySheet, setShowApplySheet] = useState(false);

  const {
    data: boost,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['boost', boostId],
    queryFn: async (): Promise<BoostWithBrand | null> => {
      const { data, error } = await supabase
        .from('bounty_campaigns')
        .select(`
          *,
          brands (
            name,
            logo_url,
            is_verified,
            slug
          )
        `)
        .eq('id', boostId)
        .single();

      if (error) throw error;
      return data as BoostWithBrand;
    },
  });

  // Check if user has already applied
  const { data: existingApplication } = useQuery({
    queryKey: ['boostApplication', boostId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('bounty_applications')
        .select('id, status')
        .eq('bounty_campaign_id', boostId)
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id && !!boostId,
  });

  // Apply mutation - direct submit without confirmation
  const applyMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      if (!user?.id || !boost?.id) {
        throw new Error('Must be logged in to apply');
      }

      // Insert an application for each selected account
      const applications = accountIds.map(accountId => ({
        bounty_campaign_id: boost.id,
        user_id: user.id,
        social_account_id: accountId,
        status: 'pending',
      }));

      const { error } = await supabase
        .from('bounty_applications')
        .insert(applications);

      if (error) throw error;
    },
    onError: (error: Error) => {
      Alert.alert('Application Failed', error.message);
    },
    onSuccess: () => {
      setApplySuccess(true);
      queryClient.invalidateQueries({ queryKey: ['boostApplication', boostId] });
    },
  });

  // Open apply sheet
  const handleOpenApplySheet = useCallback(() => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to apply to boosts.');
      return;
    }
    if (existingApplication) {
      return;
    }
    setShowApplySheet(true);
  }, [user, existingApplication]);

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

  if (queryError || !boost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>Boost not found</Text>
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

  const isActive = boost.status === 'active';
  const isFlatRate = boost.payment_model === 'flat_rate';
  const hasUnlimitedVideos = !boost.videos_per_month || boost.videos_per_month === 0;
  const brandName = boost.brands?.name || 'Unknown Brand';
  const brandLogo = boost.brands?.logo_url;
  const isVerified = boost.brands?.is_verified;

  // Calculate payout display
  const payoutDisplay = isFlatRate
    ? boost.flat_rate_min && boost.flat_rate_max && boost.flat_rate_min !== boost.flat_rate_max
      ? `$${boost.flat_rate_min} - $${boost.flat_rate_max}`
      : `$${boost.flat_rate_min || boost.flat_rate_max || 0}`
    : `$${boost.monthly_retainer || 0}`;

  const payoutLabel = isFlatRate ? 'per video' : '/month';

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
            <Icon name="chevron-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boost Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Banner/Logo Section */}
        <View style={styles.bannerSection}>
          {boost.banner_url ? (
            <Image
              source={{ uri: boost.banner_url }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.logoBanner}>
              {brandLogo ? (
                <Image
                  source={{ uri: brandLogo }}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.brandInitialContainer}>
                  <Text style={styles.brandInitial}>
                    {brandName[0]?.toUpperCase() || 'B'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <LiquidGlassView style={StyleSheet.absoluteFill} effect="clear" />
            <View style={[styles.statusContent, isActive ? styles.statusActiveOverlay : styles.statusEndedOverlay]}>
              {isActive && <View style={styles.statusDot} />}
              <Text style={styles.statusText}>
                {isActive ? 'Active' : 'Ended'}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Brand Info */}
          <View style={styles.brandRow}>
            <View style={styles.brandInfo}>
              {brandLogo ? (
                <Image source={{ uri: brandLogo }} style={styles.smallBrandLogo} />
              ) : (
                <View style={styles.smallBrandPlaceholder}>
                  <Icon name="domain" size={14} color={colors.mutedForeground} />
                </View>
              )}
              <Text style={styles.brandName}>{brandName}</Text>
              {isVerified && (
                <Icon name="check-decagram" size={14} color={colors.primary} />
              )}
            </View>
            <Badge variant="secondary" size="sm">
              <Icon name="rocket-launch" size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
              Boost
            </Badge>
          </View>

          {/* Title */}
          <Text style={styles.title}>{boost.title}</Text>

          {/* Payment Info Card */}
          <Card variant="bordered" style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>
                  {isFlatRate ? 'Per Video Rate' : 'Monthly Retainer'}
                </Text>
                <Text style={styles.paymentValue}>{payoutDisplay}</Text>
                <Text style={styles.paymentSublabel}>{payoutLabel}</Text>
              </View>
              <View style={styles.paymentDivider} />
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Videos Required</Text>
                <Text style={styles.paymentValue}>
                  {hasUnlimitedVideos ? 'Unlimited' : boost.videos_per_month}
                </Text>
                <Text style={styles.paymentSublabel}>
                  {hasUnlimitedVideos ? 'No limit' : '/month'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Description */}
          {boost.description && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="information-outline" size={18} color={colors.foreground} />
                <Text style={styles.sectionTitle}>About this Boost</Text>
              </View>
              <Text style={styles.sectionText}>{boost.description}</Text>
            </View>
          )}

          {/* Content Style Requirements */}
          {boost.content_style_requirements && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="brush-outline" size={18} color={colors.foreground} />
                <Text style={styles.sectionTitle}>Content Style</Text>
              </View>
              <Text style={styles.sectionText}>{boost.content_style_requirements}</Text>
            </View>
          )}

          {/* Content Distribution */}
          {boost.content_distribution && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="share-variant-outline" size={18} color={colors.foreground} />
                <Text style={styles.sectionTitle}>Content Distribution</Text>
              </View>
              <Text style={styles.sectionText}>{boost.content_distribution}</Text>
            </View>
          )}

          {/* Tags */}
          {boost.tags && boost.tags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="tag-multiple-outline" size={18} color={colors.foreground} />
                <Text style={styles.sectionTitle}>Tags</Text>
              </View>
              <View style={styles.tagsRow}>
                {boost.tags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Spots Info */}
          {boost.max_accepted_creators && (
            <View style={styles.spotsCard}>
              <Icon name="account-group" size={20} color={colors.primary} />
              <View style={styles.spotsInfo}>
                <Text style={styles.spotsLabel}>Available Spots</Text>
                <Text style={styles.spotsValue}>
                  {Math.max(0, (boost.max_accepted_creators || 0) - (boost.accepted_creators_count || 0))} of {boost.max_accepted_creators}
                </Text>
              </View>
              <View style={styles.spotsProgress}>
                <View
                  style={[
                    styles.spotsProgressFill,
                    {
                      width: `${((boost.accepted_creators_count || 0) / boost.max_accepted_creators) * 100}%`
                    }
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Apply Button - Fixed at bottom */}
      {isActive && (
        <View style={styles.applyContainer}>
          {existingApplication ? (
            <View style={styles.applicationStatusCard}>
              <View style={styles.applicationStatusLeft}>
                <View style={[
                  styles.applicationStatusIcon,
                  existingApplication.status === 'accepted' ? styles.applicationStatusIconAccepted :
                  existingApplication.status === 'rejected' ? styles.applicationStatusIconRejected :
                  styles.applicationStatusIconPending
                ]}>
                  <Icon
                    name={
                      existingApplication.status === 'accepted' ? 'check' :
                      existingApplication.status === 'rejected' ? 'close' : 'clock-outline'
                    }
                    size={18}
                    color={
                      existingApplication.status === 'accepted' ? colors.success :
                      existingApplication.status === 'rejected' ? colors.destructive : colors.warning
                    }
                  />
                </View>
                <View>
                  <Text style={styles.applicationStatusTitle}>
                    {existingApplication.status === 'accepted' ? 'Accepted!' :
                     existingApplication.status === 'rejected' ? 'Not Selected' : 'Application Pending'}
                  </Text>
                  <Text style={styles.applicationStatusSubtext}>
                    {existingApplication.status === 'accepted' ? 'You\'re in! Check your dashboard.' :
                     existingApplication.status === 'rejected' ? 'Try other opportunities.' : 'Brand is reviewing your profile'}
                  </Text>
                </View>
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
        title={boost?.title || ''}
        brandName={brandName}
        brandLogo={brandLogo}
        accounts={connectedAccounts}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.muted,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  bannerSection: {
    marginHorizontal: 16,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  logoBanner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  brandInitialContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primaryForeground,
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
    marginTop: 8,
    marginBottom: 12,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallBrandLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  smallBrandPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 16,
    lineHeight: 32,
  },
  paymentCard: {
    padding: 16,
    marginBottom: 20,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentItem: {
    flex: 1,
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  paymentSublabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  paymentDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    marginHorizontal: 16,
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
    color: colors.foreground,
  },
  sectionText: {
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.foreground,
    fontSize: 13,
  },
  spotsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    gap: 12,
  },
  spotsInfo: {
    flex: 1,
  },
  spotsLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  spotsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 2,
  },
  spotsProgress: {
    width: 60,
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  spotsProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
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
  applicationStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
