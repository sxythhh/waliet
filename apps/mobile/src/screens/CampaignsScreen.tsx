import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { CampaignCard } from '../components/CampaignCard';
import type { Campaign } from '@virality/shared-types';

const PLATFORMS = ['all', 'tiktok', 'instagram', 'youtube'] as const;
type Platform = (typeof PLATFORMS)[number];

const platformIcons: Record<Platform, string> = {
  all: 'apps',
  tiktok: 'music-note',
  instagram: 'instagram',
  youtube: 'youtube',
};

export function CampaignsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
  const navigation = useNavigation();

  const {
    data: campaigns,
    isLoading,
    error,
    refetch,
    isRefetching,
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

  const handleCampaignPress = useCallback(
    (campaign: Campaign) => {
      // @ts-expect-error - Navigation types not set up yet
      navigation.navigate('CampaignDetail', { campaignId: campaign.id });
    },
    [navigation]
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Filter campaigns based on search and platform
  const filteredCampaigns = campaigns?.filter((campaign) => {
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.brand_name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Platform filter
    const matchesPlatform =
      selectedPlatform === 'all' ||
      campaign.platforms_allowed?.includes(selectedPlatform);

    return matchesSearch && matchesPlatform;
  });

  const renderHeader = () => (
    <View style={styles.header}>
      {/* iOS 26 Liquid Glass Search Input */}
      <View style={styles.searchContainer}>
        <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />
        <View style={styles.searchContent}>
          <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Platform Filter Chips with Icons */}
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
              color={selectedPlatform === platform ? '#fff' : '#888'}
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

      {/* Results count */}
      <View style={styles.resultRow}>
        <Icon name="fire" size={16} color="#f59e0b" />
        <Text style={styles.resultCount}>
          {filteredCampaigns?.length || 0} campaign{filteredCampaigns?.length !== 1 ? 's' : ''} available
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
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
          <Icon name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Error loading campaigns</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Icon name="refresh" size={18} color="#fff" style={styles.retryIcon} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Discover</Text>
      <FlatList
        data={filteredCampaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CampaignCard campaign={item} onPress={handleCampaignPress} />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="magnify-close" size={48} color="#666" />
            <Text style={styles.emptyText}>No campaigns found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedPlatform !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back soon for new opportunities'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  header: {
    paddingBottom: 16,
  },
  searchContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterChipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resultCount: {
    color: '#666',
    fontSize: 13,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
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
    color: '#fff',
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
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
