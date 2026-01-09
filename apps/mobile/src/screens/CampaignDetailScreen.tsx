import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import type { Campaign } from '@virality/shared-types';

// Platform icon config
const platformConfig: Record<string, { bg: string; icon: string }> = {
  tiktok: { bg: '#000', icon: 'music-note' },
  instagram: { bg: '#E1306C', icon: 'instagram' },
  youtube: { bg: '#FF0000', icon: 'youtube' },
};

type RouteParams = {
  campaignId: string;
};

export function CampaignDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { campaignId } = route.params as RouteParams;

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

  const handleApply = () => {
    // TODO: Implement apply flow
    // For now, open the web version
    if (campaign?.slug) {
      Linking.openURL(`https://virality.so/c/${campaign.slug}`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
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

  const isActive = campaign.status === 'active';
  const platforms = campaign.platforms_allowed || ['tiktok'];
  const budgetRemaining = (campaign.budget_total || 0) - (campaign.budget_used || 0);

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
            { backgroundColor: campaign.brand_color || '#6366f1' },
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
              {platforms.map((platform, i) => {
                const config = platformConfig[platform.toLowerCase()] || { bg: '#666', icon: 'web' };
                return (
                  <View key={i} style={[styles.platformBadge, { backgroundColor: config.bg }]}>
                    <Icon name={config.icon} size={14} color="#fff" />
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
                  <Icon name="trending-up" size={14} color="#22c55e" />
                  <Text style={styles.statLabel}>RPM</Text>
                </View>
                <Text style={styles.statValue}>
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
                {campaign.infinite_budget
                  ? 'Unlimited'
                  : `$${budgetRemaining.toLocaleString()}`}
              </Text>
            </View>

            {/* Min Views */}
            {campaign.min_views && (
              <View style={styles.statBox}>
                <View style={styles.statHeader}>
                  <Icon name="eye-outline" size={14} color="#f59e0b" />
                  <Text style={styles.statLabel}>Min Views</Text>
                </View>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                  {campaign.min_views.toLocaleString()}
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
          {campaign.content_guidelines && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="text-box-check-outline" size={18} color="#fff" />
                <Text style={styles.sectionTitle}>Content Guidelines</Text>
              </View>
              <Text style={styles.guidelines}>
                {campaign.content_guidelines}
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
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Icon name="send" size={20} color="#fff" style={styles.applyIcon} />
            <Text style={styles.applyButtonText}>Apply to Campaign</Text>
          </TouchableOpacity>
        </View>
      )}
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
    color: '#22c55e',
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
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  applyButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyIcon: {
    marginRight: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
