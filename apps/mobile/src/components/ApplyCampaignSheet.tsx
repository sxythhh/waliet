import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Campaign } from '@virality/shared-types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const ACCENT_COLOR = '#1e63df';

interface ApplyCampaignSheetProps {
  campaign: Campaign;
  visible: boolean;
  onClose: () => void;
  onApply: () => Promise<void>;
  userDisplayName?: string;
  userAvatarUrl?: string;
}

// Platform icon config
const platformConfig: Record<string, { bg: string; icon: string }> = {
  tiktok: { bg: '#000', icon: 'music-note' },
  instagram: { bg: '#E1306C', icon: 'instagram' },
  youtube: { bg: '#FF0000', icon: 'youtube' },
};

// Confetti particle component
const ConfettiParticle = ({ delay, x }: { delay: number; x: number }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 200;
    const randomRotate = Math.random() * 720 - 360;

    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    translateY.value = withDelay(delay, withTiming(300, { duration: 1500 }));
    translateX.value = withDelay(delay, withTiming(randomX, { duration: 1500 }));
    rotate.value = withDelay(delay, withTiming(randomRotate, { duration: 1500 }));
    opacity.value = withDelay(delay + 800, withTiming(0, { duration: 700 }));
  }, [delay, opacity, rotate, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + x },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const confettiColors = [ACCENT_COLOR, '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];
  const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 10,
          height: 10,
          backgroundColor: color,
          borderRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
};

// Success overlay component
const SuccessOverlay = ({ onComplete }: { onComplete: () => void }) => {
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate ring
    ringScale.value = withSpring(1.5, { damping: 10 });
    ringOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    );

    // Animate checkmark
    checkScale.value = withDelay(100, withSpring(1, { damping: 8 }));
    checkOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));

    // Complete after animation
    const timeout = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [checkOpacity, checkScale, onComplete, ringOpacity, ringScale]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  // Generate confetti particles
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 300,
      x: (Math.random() - 0.5) * SCREEN_WIDTH * 0.8,
    }));
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.successOverlay}
    >
      {/* Confetti */}
      <View style={styles.confettiContainer}>
        {particles.map((p) => (
          <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
        ))}
      </View>

      {/* Ring pulse */}
      <Animated.View style={[styles.successRing, ringStyle]} />

      {/* Checkmark */}
      <Animated.View style={[styles.successCheck, checkStyle]}>
        <View style={styles.successCheckInner}>
          <Icon name="check" size={48} color="#fff" />
        </View>
      </Animated.View>

      {/* Success text */}
      <Animated.Text
        entering={FadeIn.delay(300).duration(300)}
        style={styles.successText}
      >
        Application Sent!
      </Animated.Text>
    </Animated.View>
  );
};

export function ApplyCampaignSheet({
  campaign,
  visible,
  onClose,
  onApply,
  userDisplayName,
  userAvatarUrl,
}: ApplyCampaignSheetProps) {
  const insets = useSafeAreaInsets();
  const [isApplying, setIsApplying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Swipe gesture values
  const swipeTranslateX = useSharedValue(0);
  const swipeProgress = useSharedValue(0);

  // Sheet animation values
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [visible, sheetTranslateY]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleApplyComplete = useCallback(() => {
    setShowSuccess(false);
    onClose();
  }, [onClose]);

  const triggerApply = useCallback(async () => {
    if (isApplying) return;
    setIsApplying(true);

    try {
      await onApply();
      setShowSuccess(true);
    } catch (error) {
      console.error('Apply error:', error);
      setIsApplying(false);
    }
  }, [isApplying, onApply]);

  // Pan gesture using new Gesture API
  const panGesture = Gesture.Pan()
    .enabled(!isApplying)
    .onUpdate((event) => {
      // Only allow right swipe
      const newX = Math.max(0, Math.min(event.translationX, SWIPE_THRESHOLD + 20));
      swipeTranslateX.value = newX;
      swipeProgress.value = interpolate(
        newX,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP
      );
    })
    .onEnd(() => {
      if (swipeTranslateX.value >= SWIPE_THRESHOLD) {
        // Trigger apply
        swipeTranslateX.value = withSpring(SWIPE_THRESHOLD + 20);
        runOnJS(triggerApply)();
      } else {
        // Snap back
        swipeTranslateX.value = withSpring(0, { damping: 15 });
        swipeProgress.value = withSpring(0);
      }
    });

  const swipeKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }));

  const swipeTrackStyle = useAnimatedStyle(() => ({
    width: interpolate(
      swipeProgress.value,
      [0, 1],
      [0, SWIPE_THRESHOLD],
      Extrapolation.CLAMP
    ),
  }));

  const swipeTextOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(swipeProgress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  if (!visible && sheetTranslateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  // Use the correct field names from the database schema (cast to any for type flexibility)
  const campaignData = campaign as any;
  const platforms = campaignData.allowed_platforms || campaignData.platforms_allowed || ['tiktok'];
  const budgetTotal = campaignData.total_budget || campaignData.budget_total || 0;
  const budgetUsed = campaignData.budget_used || 0;
  const budgetRemaining = budgetTotal - budgetUsed;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      {visible && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + 16 }]}>
        {/* Glass effect background */}
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={20}
        />
        <View style={styles.sheetOverlay} />

        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Campaign Header */}
          <View style={styles.header}>
            {/* Brand Logo */}
            <View style={[styles.brandLogoContainer, { backgroundColor: ACCENT_COLOR }]}>
              {campaign.brand_logo_url ? (
                <Image source={{ uri: campaign.brand_logo_url }} style={styles.brandLogoImage} />
              ) : (
                <Text style={styles.brandLogoInitial}>
                  {campaign.brand_name?.[0]?.toUpperCase() || 'V'}
                </Text>
              )}
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.brandNameSmall}>{campaign.brand_name}</Text>
              <Text style={styles.campaignTitle} numberOfLines={2}>
                {campaign.title}
              </Text>
              <View style={styles.platformsRow}>
                {platforms.map((platform: string, i: number) => {
                  const config = platformConfig[platform.toLowerCase()] || { bg: '#666', icon: 'web' };
                  return (
                    <View key={i} style={[styles.platformBadgeSmall, { backgroundColor: config.bg }]}>
                      <Icon name={config.icon} size={12} color="#fff" />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Icon name="trending-up" size={14} color={ACCENT_COLOR} />
              <Text style={styles.statPillText}>${campaign.rpm_rate?.toFixed(2) || '0.00'} RPM</Text>
            </View>
            <View style={styles.statPill}>
              <Icon name="wallet-outline" size={14} color={ACCENT_COLOR} />
              <Text style={styles.statPillText}>
                {campaignData.is_infinite_budget ? 'Unlimited' : `$${budgetRemaining.toLocaleString()}`}
              </Text>
            </View>
            {(campaignData.minimum_views || campaignData.min_views) && (
              <View style={styles.statPill}>
                <Icon name="eye-outline" size={14} color="#f59e0b" />
                <Text style={styles.statPillText}>{(campaignData.minimum_views || campaignData.min_views).toLocaleString()} min</Text>
              </View>
            )}
          </View>

          {/* Expandable Sections */}
          {campaign.requirements && (
            <TouchableOpacity
              style={styles.expandableSection}
              onPress={() => toggleSection('requirements')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <Icon name="clipboard-check-outline" size={18} color="#fff" />
                <Text style={styles.sectionTitle}>Requirements</Text>
                <Icon
                  name={expandedSections.has('requirements') ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </View>
              {expandedSections.has('requirements') && (
                <Text style={styles.sectionContent}>{campaign.requirements}</Text>
              )}
            </TouchableOpacity>
          )}

          {(campaignData.guidelines || campaignData.content_guidelines) && (
            <TouchableOpacity
              style={styles.expandableSection}
              onPress={() => toggleSection('guidelines')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <Icon name="text-box-check-outline" size={18} color="#fff" />
                <Text style={styles.sectionTitle}>Content Guidelines</Text>
                <Icon
                  name={expandedSections.has('guidelines') ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </View>
              {expandedSections.has('guidelines') && (
                <Text style={styles.sectionContent}>{campaignData.guidelines || campaignData.content_guidelines}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* User Profile Preview */}
          <View style={styles.profilePreview}>
            <Text style={styles.profileLabel}>Applying as</Text>
            <View style={styles.profileRow}>
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Icon name="account" size={20} color="#666" />
                </View>
              )}
              <Text style={styles.profileName}>{userDisplayName || 'Creator'}</Text>
              <Icon name="check-circle" size={18} color="#22c55e" />
            </View>
          </View>
        </ScrollView>

        {/* Swipe to Apply Button */}
        <View style={styles.applySection}>
          <View style={styles.swipeContainer}>
            {/* Track background */}
            <View style={styles.swipeTrackBg}>
              <Animated.Text style={[styles.swipeText, swipeTextOpacity]}>
                Swipe to apply →
              </Animated.Text>
            </View>

            {/* Filled track */}
            <Animated.View style={[styles.swipeTrackFilled, swipeTrackStyle]} />

            {/* Draggable knob */}
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.swipeKnob, swipeKnobStyle]}>
                {isApplying ? (
                  <Icon name="loading" size={24} color="#fff" />
                ) : (
                  <Icon name="arrow-right" size={24} color="#fff" />
                )}
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      </Animated.View>

      {/* Success Overlay */}
      {showSuccess && <SuccessOverlay onComplete={handleApplyComplete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  brandLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  brandLogoInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerInfo: {
    flex: 1,
  },
  brandNameSmall: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 24,
  },
  platformsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  platformBadgeSmall: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  expandableSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  sectionContent: {
    marginTop: 12,
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  profilePreview: {
    marginTop: 10,
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  profileAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  applySection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  swipeContainer: {
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  swipeTrackBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  swipeTrackFilled: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: ACCENT_COLOR,
    opacity: 0.3,
    borderRadius: 30,
  },
  swipeKnob: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 0,
    height: 0,
  },
  successRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: ACCENT_COLOR,
  },
  successCheck: {
    marginBottom: 20,
  },
  successCheckInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
});
