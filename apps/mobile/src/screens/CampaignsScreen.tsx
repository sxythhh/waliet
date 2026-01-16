import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { CampaignCard } from '../components/CampaignCard';
import { BoostCardCompact, BoostData, BoostDiscoverCard } from '../components/BoostCard';
import { colors } from '../theme/colors';
import { LogoLoader } from '../components/LogoLoader';
import type { Campaign, BountyCampaign } from '@virality/shared-types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOOST_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

const PLATFORMS = ['all', 'tiktok', 'instagram', 'youtube'] as const;
type Platform = (typeof PLATFORMS)[number];

const TYPE_FILTERS = ['all', 'campaigns', 'boosts'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const platformIcons: Record<Platform, string> = {
  all: 'apps',
  tiktok: 'music-note',
  instagram: 'instagram',
  youtube: 'youtube',
};

const typeFilterLabels: Record<TypeFilter, { label: string; icon: string }> = {
  all: { label: 'All', icon: 'view-grid' },
  campaigns: { label: 'Campaigns', icon: 'bullhorn' },
  boosts: { label: 'Boosts', icon: 'rocket-launch' },
};

export function CampaignsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
  const [selectedType, setSelectedType] = useState<TypeFilter>('all');
  const navigation = useNavigation();

  // Fetch campaigns
  const {
    data: campaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
    refetch: refetchCampaigns,
    isRefetching: isRefetchingCampaigns,
  } = useQuery({
    queryKey: ['campaigns', 'discover'],
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('is_private', false)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch boosts
  const {
    data: boosts,
    isLoading: boostsLoading,
    error: boostsError,
    refetch: refetchBoosts,
    isRefetching: isRefetchingBoosts,
  } = useQuery({
    queryKey: ['boosts', 'discover'],
    queryFn: async () => {
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
        .in('status', ['active', 'ended'])
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as (BountyCampaign & { brands: { name: string; logo_url: string | null; is_verified?: boolean } | null })[];
    },
  });

  const isLoading = campaignsLoading || boostsLoading;
  const error = campaignsError || boostsError;
  const isRefetching = isRefetchingCampaigns || isRefetchingBoosts;

  const handleCampaignPress = useCallback(
    (campaign: Campaign) => {
      // @ts-expect-error - Navigation types not set up yet
      navigation.navigate('CampaignDetail', { campaignId: campaign.id });
    },
    [navigation]
  );

  const handleBoostPress = useCallback(
    (boost: BoostData) => {
      // @ts-expect-error - Navigation types not set up yet
      navigation.navigate('BoostDetail', { boostId: boost.id });
    },
    [navigation]
  );

  const handleRefresh = useCallback(() => {
    refetchCampaigns();
    refetchBoosts();
  }, [refetchCampaigns, refetchBoosts]);

  // Filter campaigns based on search and platform
  const filteredCampaigns = useMemo(() => {
    if (selectedType === 'boosts') return [];

    return campaigns?.filter((campaign) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.brand_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Platform filter (handle both field name variants)
      const c = campaign as any;
      const platforms = c.platforms_allowed || c.allowed_platforms || [];
      const matchesPlatform =
        selectedPlatform === 'all' ||
        platforms.includes(selectedPlatform);

      return matchesSearch && matchesPlatform;
    }) || [];
  }, [campaigns, searchQuery, selectedPlatform, selectedType]);

  // Filter boosts based on search
  const filteredBoosts = useMemo(() => {
    if (selectedType === 'campaigns') return [];

    return boosts?.filter((boost) => {
      const matchesSearch =
        searchQuery === '' ||
        boost.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        boost.brands?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        boost.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    }).filter(boost => boost.status === 'active') || []; // Only show active boosts in discover
  }, [boosts, searchQuery, selectedType]);

  // Combined count for display
  const totalCount = filteredCampaigns.length + filteredBoosts.length;

  // Combine data for unified list or show based on type filter
  // Note: Must be called before any early returns to follow hooks rules
  const combinedData = useMemo(() => {
    if (isLoading || error) return [];

    const items: { type: 'boost' | 'campaign'; data: any }[] = [];

    // Add boosts section first
    if (selectedType !== 'campaigns' && filteredBoosts.length > 0) {
      filteredBoosts.forEach((boost) => {
        items.push({ type: 'boost', data: boost });
      });
    }

    // Add campaigns section
    if (selectedType !== 'boosts' && filteredCampaigns.length > 0) {
      filteredCampaigns.forEach((campaign) => {
        items.push({ type: 'campaign', data: campaign });
      });
    }

    return items;
  }, [filteredBoosts, filteredCampaigns, selectedType, isLoading, error]);

  // Reference for campaigns horizontal scroll
  const campaignsScrollRef = useRef<ScrollView>(null);

  // Scroll campaigns left/right
  const scrollCampaigns = useCallback((direction: 'left' | 'right') => {
    const scrollAmount = direction === 'left' ? -280 : 280;
    // Note: ScrollView doesn't have scrollTo with relative offset, need to track position
  }, []);

  const renderCampaignItem = useCallback(
    (campaign: Campaign) => {
      return (
        <View key={campaign.id} style={styles.campaignCardWrapper}>
          <CampaignCard campaign={campaign} onPress={handleCampaignPress} />
        </View>
      );
    },
    [handleCampaignPress]
  );

  const renderBoostItem = useCallback(
    (boost: BountyCampaign & { brands: { name: string; logo_url: string | null; is_verified?: boolean } | null }) => {
      // Cast to any to access optional properties that may not be in the shared type
      const boostData = boost as any;
      return (
        <View key={boost.id} style={styles.boostCardWrapper}>
          <BoostDiscoverCard
            id={boost.id}
            title={boost.title}
            description={boost.description}
            brand_name={boost.brands?.name || 'Unknown Brand'}
            brand_logo_url={boost.brands?.logo_url || null}
            brand_is_verified={boost.brands?.is_verified}
            monthly_retainer={boost.monthly_retainer}
            videos_per_month={boost.videos_per_month}
            max_accepted_creators={boost.max_accepted_creators}
            accepted_creators_count={boost.accepted_creators_count}
            payment_model={boostData.payment_model}
            flat_rate_min={boostData.flat_rate_min}
            flat_rate_max={boostData.flat_rate_max}
            isEnded={boost.status === 'ended'}
            tags={boostData.tags}
            content_distribution={boostData.content_distribution}
            created_at={boost.created_at}
            onPress={() => {
              // @ts-expect-error - Navigation types not set up yet
              navigation.navigate('BoostDetail', { boostId: boost.id });
            }}
          />
        </View>
      );
    },
    [navigation]
  );

  const getEmptyMessage = useCallback(() => {
    if (selectedType === 'boosts') {
      return { title: 'No boosts found', icon: 'rocket-launch-outline' as const };
    }
    if (selectedType === 'campaigns') {
      return { title: 'No campaigns found', icon: 'bullhorn-outline' as const };
    }
    return { title: 'No opportunities found', icon: 'magnify-close' as const };
  }, [selectedType]);

  const emptyMessage = getEmptyMessage();

  const renderHeader = () => (
    <View style={styles.header}>
      {/* iOS 26 Liquid Glass Search Input */}
      <View style={styles.searchContainer}>
        <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />
        <View style={styles.searchContent}>
          <Icon name="magnify" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Type Filter (All / Campaigns / Boosts) */}
      <View style={styles.typeFilterRow}>
        {TYPE_FILTERS.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeFilterChip,
              selectedType === type && styles.typeFilterChipActive,
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Icon
              name={typeFilterLabels[type].icon}
              size={16}
              color={selectedType === type ? colors.primaryForeground : colors.mutedForeground}
              style={styles.filterIcon}
            />
            <Text
              style={[
                styles.typeFilterText,
                selectedType === type && styles.typeFilterTextActive,
              ]}
            >
              {typeFilterLabels[type].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Platform Filter Chips with Icons - Only show for campaigns */}
      {selectedType !== 'boosts' && (
        <View style={styles.filterRow}>
          {PLATFORMS.map((platform) => (
            <TouchableOpacity
              key={platform}
              style={[
                styles.filterChip,
                selectedPlatform === platform && styles.filterChipActive,
              ]}
              onPress={() => setSelectedPlatform(platform)}
            >
              <Icon
                name={platformIcons[platform]}
                size={16}
                color={selectedPlatform === platform ? colors.foreground : colors.mutedForeground}
                style={styles.filterIcon}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedPlatform === platform && styles.filterChipTextActive,
                ]}
              >
                {platform === 'all' ? 'All' : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultRow}>
        <Icon name="fire" size={16} color={colors.warning} />
        <Text style={styles.resultCount}>
          {totalCount} {selectedType === 'boosts' ? 'boost' : selectedType === 'campaigns' ? 'campaign' : 'opportunit'}{totalCount !== 1 ? (selectedType === 'all' ? 'ies' : 's') : (selectedType === 'all' ? 'y' : '')} available
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>Error loading opportunities</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Icon name="refresh" size={18} color={colors.foreground} style={styles.retryIcon} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Discover</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderHeader()}

        {/* Boosts Section - Grid Layout */}
        {selectedType !== 'campaigns' && filteredBoosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boosts</Text>
            <View style={styles.boostsGrid}>
              {filteredBoosts.map(renderBoostItem)}
            </View>
          </View>
        )}

        {/* Campaigns Section - Horizontal Scroll */}
        {selectedType !== 'boosts' && filteredCampaigns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Campaigns</Text>
              <View style={styles.scrollControls}>
                <TouchableOpacity
                  style={styles.scrollButton}
                  onPress={() => scrollCampaigns('left')}
                >
                  <Icon name="chevron-left" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                <View style={styles.scrollDivider} />
                <TouchableOpacity
                  style={styles.scrollButton}
                  onPress={() => scrollCampaigns('right')}
                >
                  <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              ref={campaignsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.campaignsScroll}
            >
              {filteredCampaigns.map(renderCampaignItem)}
            </ScrollView>
          </View>
        )}

        {/* Empty State */}
        {totalCount === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Icon name={emptyMessage.icon} size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>{emptyMessage.title}</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedPlatform !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back soon for new opportunities'}
            </Text>
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    letterSpacing: -0.5,
  },
  header: {
    paddingBottom: 16,
  },
  searchContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.muted,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.foreground,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterChipText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.foreground,
  },
  // Type filter styles
  typeFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeFilterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeFilterText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  typeFilterTextActive: {
    color: colors.primaryForeground,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resultCount: {
    color: colors.mutedForeground,
    fontSize: 13,
    marginLeft: 6,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Section styles matching web
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  scrollControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 9999,
    backgroundColor: colors.muted,
  },
  scrollButton: {
    padding: 10,
  },
  scrollDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Boosts grid - 2 columns
  boostsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  boostCardWrapper: {
    width: BOOST_CARD_WIDTH,
  },
  // Campaigns horizontal scroll
  campaignsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  campaignCardWrapper: {
    width: 280,
  },
  bottomPadding: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 14,
    marginTop: 12,
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
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: 14,
    textAlign: 'center',
  },
});
