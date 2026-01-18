import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogoLoader } from '../components/LogoLoader';
import { colors } from '../theme/colors';
import { useCampaignDetail } from '../hooks/useCampaignDetail';
import { useTrainingProgress } from '../hooks/useTrainingProgress';

// Section imports
import { OverviewSection } from '../components/campaign-detail/sections/OverviewSection';
import { BlueprintSection } from '../components/campaign-detail/sections/BlueprintSection';
import { TrainingModuleView } from '../components/campaign-detail/sections/TrainingModuleView';
import { AssetsSection } from '../components/campaign-detail/sections/AssetsSection';
import { SubmissionsSection } from '../components/campaign-detail/sections/SubmissionsSection';
import { SupportSection } from '../components/campaign-detail/sections/SupportSection';
import { MembersSection } from '../components/campaign-detail/sections/MembersSection';

type RouteParams = {
  campaignId: string;
  submissionId: string;
};

// Tab configuration
type TabType = 'overview' | 'blueprint' | 'assets' | 'submissions' | 'support' | 'members';

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: 'view-dashboard-outline' },
  { id: 'blueprint', label: 'Blueprint', icon: 'book-open-page-variant-outline' },
  { id: 'assets', label: 'Assets', icon: 'folder-download-outline' },
  { id: 'submissions', label: 'Videos', icon: 'video-outline' },
  { id: 'support', label: 'Support', icon: 'help-circle-outline' },
  { id: 'members', label: 'Members', icon: 'account-group-outline' },
];

export function CreatorCampaignDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { campaignId, submissionId } = route.params as RouteParams;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Pager ref for swipe navigation
  const pagerRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);

  // Handle swipe to change tab - updates in real-time as user swipes
  const handlePagerScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = TABS[pageIndex]?.id;
    if (newTab) {
      setActiveTab(newTab);
    }
  }, []);

  // Handle tab press to scroll pager
  const handleTabPress = useCallback((tabId: TabType) => {
    const tabIndex = TABS.findIndex(t => t.id === tabId);
    if (tabIndex >= 0 && pagerRef.current) {
      pagerRef.current.scrollTo({ x: tabIndex * SCREEN_WIDTH, animated: true });
    }
    setActiveTab(tabId);
    setActiveModuleId(null);
  }, []);

  // Fetch campaign detail data
  const {
    campaign,
    isLoadingCampaign,
    stats,
    members,
    submissions,
    trainingModules,
    assets,
    refetchAll,
    isLoading,
  } = useCampaignDetail(campaignId);

  // Training progress
  const trainingProgress = useTrainingProgress(campaignId, trainingModules.length);

  // Leave campaign mutation
  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('campaign_submissions')
        .update({ status: 'withdrawn' })
        .eq('id', submissionId)
        .eq('creator_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-joined-campaigns'] });
      Alert.alert('Left Campaign', 'You have left this campaign.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave Campaign',
      'Are you sure you want to leave this campaign? You can reapply later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
      ]
    );
  }, [leaveMutation]);

  const handleSubmitVideo = useCallback(() => {
    Linking.openURL(`https://virality.so/campaign/${campaignId}?action=submit`);
  }, [campaignId]);

  const handleDiscordPress = useCallback(() => {
    if (campaign?.discord_invite_url) {
      Linking.openURL(campaign.discord_invite_url);
    }
  }, [campaign?.discord_invite_url]);

  // Navigation helpers for training modules
  const navigateToTrainingModule = useCallback((moduleId: string) => {
    setActiveModuleId(moduleId);
  }, []);

  const navigateBackFromModule = useCallback(() => {
    setActiveModuleId(null);
  }, []);

  // Loading state
  if (isLoadingCampaign) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <LogoLoader size={56} />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Error state
  if (!campaign) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Campaign not found</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  const isActive = campaign.status === 'active';

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonCircle} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            {/* Brand Logo */}
            <View style={styles.brandLogoSmall}>
              {campaign.brand_logo_url ? (
                <Image
                  source={{ uri: campaign.brand_logo_url }}
                  style={styles.brandLogoImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.brandLogoPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.brandLogoInitial}>
                    {campaign.brand_name?.[0]?.toUpperCase() || 'C'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {campaign.title}
              </Text>
              <View style={styles.headerMeta}>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {campaign.brand_name}
                </Text>
                <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotEnded]} />
              </View>
            </View>
          </View>

          {/* Discord Button (if available) */}
          {campaign.discord_invite_url && (
            <TouchableOpacity style={styles.discordButton} onPress={handleDiscordPress}>
              <Icon name="discord" size={20} color="#5865F2" />
            </TouchableOpacity>
          )}

          {/* More Options Button */}
          <TouchableOpacity style={styles.moreButton} onPress={handleLeave}>
            <Icon name="dots-horizontal" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
                onPress={() => handleTabPress(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content - Swipeable Pager */}
        <View style={styles.contentContainer}>
          {activeModuleId ? (
            // Training module view (not swipeable)
            (() => {
              const module = trainingModules.find((m) => m.id === activeModuleId);
              return (
                <TrainingModuleView
                  module={module || null}
                  isCompleted={trainingProgress.isModuleCompleted(activeModuleId)}
                  onMarkComplete={() => trainingProgress.markComplete(activeModuleId)}
                  onBack={navigateBackFromModule}
                  isMarking={trainingProgress.isMarking}
                />
              );
            })()
          ) : (
            // Swipeable tab content
            <ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handlePagerScroll}
              scrollEventThrottle={16}
            >
              {/* Overview */}
              <View style={styles.pageContainer}>
                <OverviewSection
                  campaign={campaign}
                  stats={stats}
                  onRefresh={refetchAll}
                  isLoading={isLoading}
                />
              </View>

              {/* Blueprint */}
              <View style={styles.pageContainer}>
                <BlueprintSection
                  campaign={campaign}
                  trainingModules={trainingModules}
                  trainingProgress={trainingProgress}
                  onModulePress={navigateToTrainingModule}
                />
              </View>

              {/* Assets */}
              <View style={styles.pageContainer}>
                <AssetsSection
                  assets={assets}
                  onRefresh={refetchAll}
                  isLoading={isLoading}
                />
              </View>

              {/* Submissions */}
              <View style={styles.pageContainer}>
                <SubmissionsSection
                  submissions={submissions}
                  onRefresh={refetchAll}
                  isLoading={isLoading}
                />
              </View>

              {/* Support */}
              <View style={styles.pageContainer}>
                <SupportSection campaign={campaign} />
              </View>

              {/* Members */}
              <View style={styles.pageContainer}>
                <MembersSection
                  members={members}
                  onRefresh={refetchAll}
                  isLoading={isLoading}
                />
              </View>
            </ScrollView>
          )}
        </View>

        {/* Floating Submit Button */}
        <View style={[styles.floatingButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.floatingSubmitButton}
            onPress={handleSubmitVideo}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingButtonText}>Submit Video</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.foreground,
    fontSize: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogoSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  brandLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotEnded: {
    backgroundColor: colors.mutedForeground,
  },
  discordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tab Navigation
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 4,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Content
  contentContainer: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  // Floating Submit Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  floatingSubmitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    borderTopWidth: 1,
    borderTopColor: '#589bfd',
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
