import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { platformConfig } from '../hooks/useSocialAccounts';

// Types
interface JoinedSource {
  id: string;
  sourceId: string;
  sourceType: 'campaign' | 'boost';
  title: string;
  brandName: string;
  brandLogoUrl: string | null;
  bannerUrl: string | null;
  allowedPlatforms: string[];
}

interface VideoSubmissionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Detect platform from URL
function detectPlatformFromUrl(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok.com')) {
    return 'tiktok';
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('youtube.com/shorts')) {
    return 'youtube';
  }
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return 'instagram';
  }
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'twitter';
  }
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
    return 'facebook';
  }
  if (lowerUrl.includes('snapchat.com')) {
    return 'snapchat';
  }
  return null;
}

// Validate URL format
function isValidVideoUrl(url: string): boolean {
  try {
    new URL(url);
    return detectPlatformFromUrl(url) !== null;
  } catch {
    return false;
  }
}

export function VideoSubmissionSheet({
  visible,
  onClose,
  onSuccess,
}: VideoSubmissionSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedSource, setSelectedSource] = useState<JoinedSource | null>(null);

  // Detect platform as user types
  const detectedPlatform = useMemo(() => {
    if (!videoUrl.trim()) return null;
    return detectPlatformFromUrl(videoUrl);
  }, [videoUrl]);

  // Reset form
  const resetForm = useCallback(() => {
    setVideoUrl('');
    setSelectedSource(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Fetch user's approved campaigns and boosts
  const { data: joinedSources = [], isLoading: isLoadingSources } = useQuery({
    queryKey: ['joined-sources', user?.id],
    queryFn: async (): Promise<JoinedSource[]> => {
      if (!user?.id) return [];

      const sources: JoinedSource[] = [];

      // Fetch approved campaign applications
      const { data: campaignApps, error: campError } = await supabase
        .from('campaign_submissions')
        .select(`
          id,
          campaign_id,
          campaigns (
            id,
            title,
            brand_name,
            brand_logo_url,
            banner_url,
            allowed_platforms
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'approved');

      if (!campError && campaignApps) {
        for (const app of campaignApps) {
          const campaign = (app as any).campaigns;
          if (campaign) {
            sources.push({
              id: app.id,
              sourceId: app.campaign_id,
              sourceType: 'campaign',
              title: campaign.title || 'Untitled Campaign',
              brandName: campaign.brand_name || 'Unknown Brand',
              brandLogoUrl: campaign.brand_logo_url,
              bannerUrl: campaign.banner_url,
              allowedPlatforms: campaign.allowed_platforms || ['tiktok'],
            });
          }
        }
      }

      // Fetch approved boost applications
      const { data: boostApps, error: boostError } = await supabase
        .from('bounty_applications')
        .select(`
          id,
          bounty_campaign_id,
          bounty_campaigns (
            id,
            title,
            banner_url,
            brands (
              name,
              logo_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (!boostError && boostApps) {
        for (const app of boostApps) {
          const boost = (app as any).bounty_campaigns;
          if (boost) {
            sources.push({
              id: app.id,
              sourceId: app.bounty_campaign_id,
              sourceType: 'boost',
              title: boost.title || 'Untitled Boost',
              brandName: boost.brands?.name || 'Unknown Brand',
              brandLogoUrl: boost.brands?.logo_url || null,
              bannerUrl: boost.banner_url,
              allowedPlatforms: ['tiktok', 'youtube', 'instagram'], // Boosts typically support multiple
            });
          }
        }
      }

      return sources;
    },
    enabled: !!user?.id && visible,
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Must be logged in');
      if (!selectedSource) throw new Error('Please select a campaign or boost');
      if (!videoUrl.trim()) throw new Error('Please enter a video URL');
      if (!detectedPlatform) throw new Error('Could not detect platform from URL');

      // Check if platform is allowed for selected source
      const allowedPlatforms = selectedSource.allowedPlatforms.map(p => p.toLowerCase());
      if (!allowedPlatforms.includes(detectedPlatform)) {
        throw new Error(`${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} is not allowed for this ${selectedSource.sourceType}`);
      }

      // Insert submission
      const { error } = await supabase
        .from('video_submissions')
        .insert({
          creator_id: user.id,
          source_id: selectedSource.sourceId,
          source_type: selectedSource.sourceType,
          video_url: videoUrl.trim(),
          platform: detectedPlatform,
          status: 'pending_review',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-submissions'] });
      Alert.alert(
        'Video Submitted!',
        'Your video has been submitted for review. We\'ll notify you once it\'s processed.',
        [{ text: 'OK', onPress: () => { onSuccess?.(); handleClose(); } }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Submission Failed', error.message);
    },
  });

  // Check if selected source allows the detected platform
  const isPlatformAllowed = useMemo(() => {
    if (!selectedSource || !detectedPlatform) return true;
    return selectedSource.allowedPlatforms.map(p => p.toLowerCase()).includes(detectedPlatform);
  }, [selectedSource, detectedPlatform]);

  const canSubmit = videoUrl.trim() && selectedSource && detectedPlatform && isPlatformAllowed && !submitMutation.isPending;

  const renderSourceCard = (source: JoinedSource) => {
    const isSelected = selectedSource?.id === source.id;
    const isBoost = source.sourceType === 'boost';

    return (
      <TouchableOpacity
        key={source.id}
        style={[styles.sourceCard, isSelected && styles.sourceCardSelected]}
        onPress={() => setSelectedSource(source)}
        activeOpacity={0.7}
      >
        {/* Mini banner */}
        <View style={styles.sourceBanner}>
          {source.bannerUrl ? (
            <Image source={{ uri: source.bannerUrl }} style={styles.sourceBannerImage} />
          ) : source.brandLogoUrl ? (
            <View style={[styles.sourceBannerPlaceholder, { backgroundColor: isBoost ? '#8b5cf6' : colors.primary }]}>
              <Image source={{ uri: source.brandLogoUrl }} style={styles.brandLogoMini} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.sourceBannerPlaceholder, { backgroundColor: isBoost ? '#8b5cf6' : colors.primary }]}>
              <Text style={styles.brandInitialMini}>{source.brandName[0]?.toUpperCase() || 'V'}</Text>
            </View>
          )}
          {/* Type badge */}
          <View style={[styles.typeBadge, { backgroundColor: isBoost ? '#8b5cf6' : colors.primary }]}>
            <Icon name={isBoost ? 'lightning-bolt' : 'bullhorn'} size={10} color="#fff" />
          </View>
          {/* Selection indicator */}
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Icon name="check-circle" size={18} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceBrand} numberOfLines={1}>{source.brandName}</Text>
          <Text style={styles.sourceTitle} numberOfLines={1}>{source.title}</Text>
          {/* Platforms */}
          <View style={styles.sourcePlatforms}>
            {source.allowedPlatforms.slice(0, 3).map((platform, i) => {
              const p = platform.toLowerCase() as keyof typeof platformConfig;
              const config = platformConfig[p];
              return config ? (
                <View key={i} style={[styles.miniPlatformBadge, { backgroundColor: config.bg }]}>
                  <Image source={config.logoWhite} style={styles.miniPlatformLogo} resizeMode="contain" />
                </View>
              ) : null;
            })}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>Submit Video</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.heroIconContainer}>
                <Icon name="video-plus" size={32} color="#fff" />
              </View>
              <Text style={styles.heroTitle}>Submit Your Video</Text>
              <Text style={styles.heroSubtitle}>
                Paste your video link and select which campaign or boost you're submitting to
              </Text>
            </View>

            {/* Video URL Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Video URL</Text>
              <View style={styles.inputContainer}>
                <Icon name="link" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  placeholder="Paste your TikTok, YouTube, or Instagram URL"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                {detectedPlatform && (
                  <View style={[styles.detectedPlatform, { backgroundColor: platformConfig[detectedPlatform as keyof typeof platformConfig]?.bg || '#666' }]}>
                    <Image
                      source={platformConfig[detectedPlatform as keyof typeof platformConfig]?.logoWhite}
                      style={styles.detectedPlatformLogo}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>
              {videoUrl && !detectedPlatform && (
                <Text style={styles.errorText}>Please enter a valid video URL from TikTok, YouTube, or Instagram</Text>
              )}
              {videoUrl && detectedPlatform && selectedSource && !isPlatformAllowed && (
                <Text style={styles.errorText}>
                  {detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} is not accepted for this {selectedSource.sourceType}
                </Text>
              )}
            </View>

            {/* Source Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Campaign or Boost</Text>
              {isLoadingSources ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading your campaigns...</Text>
                </View>
              ) : joinedSources.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="bullhorn-outline" size={40} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>No Approved Campaigns</Text>
                  <Text style={styles.emptySubtitle}>
                    You need to be accepted to a campaign or boost before you can submit videos
                  </Text>
                </View>
              ) : (
                <View style={styles.sourcesGrid}>
                  {joinedSources.map(renderSourceCard)}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={() => submitMutation.mutate()}
              disabled={!canSubmit}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Video</Text>
                  <Icon name="arrow-right" size={20} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  heroTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.foreground,
  },
  detectedPlatform: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  detectedPlatformLogo: {
    width: 16,
    height: 16,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.destructive,
    marginTop: spacing.xs,
  },

  // Sources Grid
  sourcesGrid: {
    gap: spacing.sm,
  },
  sourceCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sourceCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  sourceBanner: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  sourceBannerImage: {
    width: '100%',
    height: '100%',
  },
  sourceBannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoMini: {
    width: 32,
    height: 32,
  },
  brandInitialMini: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  sourceInfo: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  sourceBrand: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  sourceTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  sourcePlatforms: {
    flexDirection: 'row',
    gap: 4,
  },
  miniPlatformBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlatformLogo: {
    width: 12,
    height: 12,
  },

  // Loading & Empty
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },

  // Footer
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primaryForeground,
  },
});
