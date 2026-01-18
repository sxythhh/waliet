import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { CampaignCard } from '../components/CampaignCard';
import { BoostDiscoverCard } from '../components/BoostCard';
import { colors } from '../theme/colors';
import { LogoLoader } from '../components/LogoLoader';
import type { Campaign, BountyCampaign } from '@virality/shared-types';

export function CampaignsScreen() {
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

  const handleRefresh = useCallback(() => {
    refetchCampaigns();
    refetchBoosts();
  }, [refetchCampaigns, refetchBoosts]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns || [];
  }, [campaigns]);

  // Filter boosts - only show active
  const filteredBoosts = useMemo(() => {
    return boosts?.filter(boost => boost.status === 'active') || [];
  }, [boosts]);

  const totalCount = filteredCampaigns.length + filteredBoosts.length;

  const campaignsScrollRef = useRef<ScrollView>(null);

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

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>{totalCount} opportunities</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LogoLoader size={56} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>Unable to load opportunities</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

        {/* Boosts Section */}
        {filteredBoosts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.boostsList}>
              {filteredBoosts.map(renderBoostItem)}
            </View>
          </View>
        )}

        {/* Campaigns Section */}
        {filteredCampaigns.length > 0 && (
          <View style={styles.section}>
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
            <Text style={styles.emptyTitle}>No opportunities found</Text>
            <Text style={styles.emptySubtext}>
              Check back soon for new opportunities
            </Text>
          </View>
        )}

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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Results
  resultsRow: {
    marginTop: 4,
  },
  resultsText: {
    color: colors.mutedForeground,
    fontSize: 13,
    letterSpacing: -0.3,
  },

  // Sections
  section: {
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 14,
  },

  // Boosts List
  boostsList: {
    gap: 12,
  },
  boostCardWrapper: {
    width: '100%',
  },

  // Campaigns Scroll
  campaignsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  campaignCardWrapper: {
    width: 280,
  },

  // Scroll Content
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  bottomPadding: {
    height: 100,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 14,
    marginTop: 12,
    letterSpacing: -0.3,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  errorText: {
    color: colors.mutedForeground,
    fontSize: 14,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});
