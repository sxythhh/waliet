import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import {
  SocialAccount,
  platformConfig,
  getPlatformUrl,
  useDisconnectAccount,
} from '../../hooks/useSocialAccounts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AccountDetailSheetProps {
  account: SocialAccount | null;
  visible: boolean;
  onClose: () => void;
  onDisconnected: () => void;
}

function formatFollowers(count: number | null): string {
  if (count === null || count === undefined) return 'N/A';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function AccountDetailSheet({
  account,
  visible,
  onClose,
  onDisconnected,
}: AccountDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const dragStartY = useSharedValue(0);
  const disconnectMutation = useDisconnectAccount();

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    }
  }, [visible, sheetTranslateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Drag gesture for handle to dismiss
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
        sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        runOnJS(onClose)();
      } else {
        sheetTranslateY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const handleOpenProfile = async () => {
    if (!account) return;
    const url = getPlatformUrl(account.platform, account.username);
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening profile:', error);
    }
  };

  const handleDisconnect = () => {
    if (!account) return;

    const platformName = platformConfig[account.platform].name;

    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect your ${platformName} account (@${account.username})? You can reconnect it anytime.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsDisconnecting(true);
            const result = await disconnectMutation.mutateAsync({ account });
            setIsDisconnecting(false);

            if (result.success) {
              onDisconnected();
            } else {
              Alert.alert('Error', result.error || 'Failed to disconnect account');
            }
          },
        },
      ]
    );
  };

  if (!visible && sheetTranslateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  if (!account) return null;

  const platformCfg = platformConfig[account.platform];

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
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={20}
        />
        <View style={styles.sheetOverlay} />

        {/* Draggable Handle */}
        <GestureDetector gesture={handleDragGesture}>
          <Animated.View style={styles.handleContainer}>
            <View style={styles.handle} />
          </Animated.View>
        </GestureDetector>

        {/* Account Info */}
        <View style={styles.accountInfo}>
          {/* Avatar */}
          <View style={[styles.avatarContainer, { backgroundColor: platformCfg.bg }]}>
            {account.avatarUrl ? (
              <Image source={{ uri: account.avatarUrl }} style={styles.avatar} />
            ) : (
              <Image
                source={platformCfg.logoWhite}
                style={styles.platformLogo}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Platform & Username */}
          <View style={styles.nameRow}>
            <Text style={styles.platformName}>{platformCfg.name}</Text>
            {account.isVerified && (
              <Icon name="check-decagram" size={18} color={colors.primary} />
            )}
          </View>
          <Text style={styles.username}>@{account.username}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            {account.followerCount !== null && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatFollowers(account.followerCount)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <View style={styles.verifiedBadge}>
                <Icon
                  name={account.isVerified ? 'check-circle' : 'clock-outline'}
                  size={16}
                  color={account.isVerified ? colors.success : colors.warning}
                />
              </View>
              <Text style={styles.statLabel}>
                {account.isVerified ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Open Profile Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenProfile}>
            <Icon name="open-in-new" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Open Profile</Text>
            <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Disconnect Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.disconnectButton]}
            onPress={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Icon name="link-variant-off" size={20} color={colors.destructive} />
            )}
            <Text style={[styles.actionButtonText, styles.disconnectText]}>
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
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
  accountInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  platformLogo: {
    width: 44,
    height: 44,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  platformName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
  },
  username: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    marginBottom: 4,
  },
  actions: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground,
  },
  disconnectButton: {
    borderColor: colors.destructiveMuted,
    backgroundColor: colors.destructiveMuted,
  },
  disconnectText: {
    color: colors.destructive,
  },
  closeButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
});
