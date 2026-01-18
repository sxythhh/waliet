import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { LogoLoader } from './LogoLoader';
import { SocialAccount, platformConfig } from '../hooks/useSocialAccounts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 400; // Used for animation calculations

interface ApplySheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (accountIds: string[]) => void;
  isLoading: boolean;
  isSuccess: boolean;
  title: string;
  brandName: string;
  brandLogo?: string | null;
  accounts: SocialAccount[];
  allowedPlatforms?: string[];
}

export function ApplySheet({
  visible,
  onClose,
  onApply,
  isLoading,
  isSuccess,
  title,
  brandName,
  brandLogo,
  accounts,
  allowedPlatforms,
}: ApplySheetProps) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Filter accounts by allowed platforms if specified
  const filteredAccounts = allowedPlatforms
    ? accounts.filter(a => allowedPlatforms.includes(a.platform))
    : accounts;

  // Auto-select first account when sheet opens
  useEffect(() => {
    if (visible && filteredAccounts.length > 0 && selectedAccountIds.length === 0) {
      setSelectedAccountIds([filteredAccounts[0].id]);
    }
  }, [visible, filteredAccounts]);

  // Reset selection when sheet closes
  useEffect(() => {
    if (!visible) {
      setSelectedAccountIds([]);
    }
  }, [visible]);

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  // Animation values
  const sheetTranslateY = useSharedValue(SHEET_HEIGHT);
  const dragStartY = useSharedValue(0);
  const successScale = useSharedValue(0);

  // Open/close animation
  useEffect(() => {
    if (visible) {
      sheetTranslateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    }
  }, [visible]);

  // Success animation
  useEffect(() => {
    if (isSuccess) {
      successScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) });

      // Auto close after success
      const timeout = setTimeout(() => {
        onClose();
        successScale.value = 0;
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isSuccess]);

  // Drag gesture for handle
  const handleDragGesture = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = sheetTranslateY.value;
    })
    .onUpdate((event) => {
      const newY = Math.max(0, dragStartY.value + event.translationY);
      sheetTranslateY.value = newY;
    })
    .onEnd((event) => {
      if (sheetTranslateY.value > 100 || event.velocityY > 500) {
        sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
        runOnJS(onClose)();
      } else {
        sheetTranslateY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const successCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  if (!visible && sheetTranslateY.value >= SHEET_HEIGHT) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      {visible && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>
      )}

      {/* Sheet */}
      <GestureDetector gesture={handleDragGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Liquid Glass Background */}
          <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />

          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          {isSuccess ? (
            /* Success State */
            <View style={styles.successContainer}>
              <Animated.View style={[styles.successCircle, successCircleStyle]}>
                <Text style={styles.successCheckmark}>✓</Text>
              </Animated.View>
              <Text style={styles.successTitle}>Application Sent</Text>
              <Text style={styles.successSubtitle}>
                {brandName} will review your profile
              </Text>
            </View>
          ) : (
            /* Apply State */
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                {brandLogo ? (
                  <Image source={{ uri: brandLogo }} style={styles.brandLogo} />
                ) : (
                  <View style={styles.brandLogoPlaceholder}>
                    <Text style={styles.brandLogoInitial}>
                      {brandName[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.headerInfo}>
                  <Text style={styles.brandName}>{brandName}</Text>
                  <Text style={styles.title} numberOfLines={2}>{title}</Text>
                </View>
              </View>

              {/* Account Selection */}
              <View style={styles.accountsSection}>
                <Text style={styles.sectionLabel}>Select Social Accounts</Text>

                {filteredAccounts.length > 0 ? (
                  <View style={styles.accountsList}>
                    {filteredAccounts.map((account) => {
                      const isSelected = selectedAccountIds.includes(account.id);
                      const config = platformConfig[account.platform];
                      return (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.accountRow,
                            isSelected && styles.accountRowSelected,
                          ]}
                          onPress={() => toggleAccount(account.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.accountLeft}>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                              {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                            </View>
                            <Image
                              source={config.logoWhite}
                              style={styles.platformLogo}
                              resizeMode="contain"
                            />
                            <Text style={styles.accountUsername}>@{account.username}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noAccountsContainer}>
                    <Text style={styles.noAccountsText}>No connected accounts</Text>
                    <Text style={styles.noAccountsSubtext}>
                      Connect a social account to apply
                    </Text>
                  </View>
                )}
              </View>

              {/* Footer Note */}
              <Text style={styles.footerNote}>
                The brand will review your profile and respond within a few days
              </Text>

              {/* Apply Button */}
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  isLoading && styles.applyButtonLoading,
                  selectedAccountIds.length === 0 && styles.applyButtonDisabled,
                ]}
                onPress={() => selectedAccountIds.length > 0 && onApply(selectedAccountIds)}
                disabled={isLoading || selectedAccountIds.length === 0}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <LogoLoader size={20} />
                    <Text style={styles.applyButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.applyButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  brandLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  brandLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.foreground,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    lineHeight: 26,
    letterSpacing: -0.5,
  },

  // Account Selection
  accountsSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  accountsList: {
    gap: 4,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  accountRowSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheck: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  platformLogo: {
    width: 18,
    height: 18,
    opacity: 0.8,
  },
  accountUsername: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  noAccountsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noAccountsText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 4,
  },
  noAccountsSubtext: {
    fontSize: 13,
    color: colors.mutedForeground,
  },

  // Footer
  footerNote: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    letterSpacing: -0.2,
  },

  // Buttons
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  applyButtonLoading: {
    opacity: 0.9,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.5,
  },

  // Success State
  successContainer: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCheckmark: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '300',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});
