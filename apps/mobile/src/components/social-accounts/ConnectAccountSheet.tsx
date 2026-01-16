import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Platform, platformConfig } from '../../hooks/useSocialAccounts';
import { BioVerificationSheet } from './BioVerificationSheet';
import { useAuth } from '../../contexts/AuthContext';
import { config } from '../../config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConnectAccountSheetProps {
  visible: boolean;
  onClose: () => void;
  onConnected: () => void;
  connectedPlatforms: Set<Platform>;
}

const DISCORD_CLIENT_ID = '1307072439679295529'; // From the existing discord-oauth function

export function ConnectAccountSheet({
  visible,
  onClose,
  onConnected,
  connectedPlatforms,
}: ConnectAccountSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  const [bioVerificationVisible, setBioVerificationVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [visible, sheetTranslateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const handlePlatformSelect = async (platform: Platform) => {
    if (connectedPlatforms.has(platform)) {
      Alert.alert('Already Connected', `Your ${platformConfig[platform].name} account is already connected.`);
      return;
    }

    if (platform === 'discord') {
      await handleDiscordConnect();
    } else if (platform === 'twitter') {
      await handleTwitterConnect();
    } else {
      // Bio verification flow for TikTok, Instagram, YouTube
      setSelectedPlatform(platform);
      setBioVerificationVisible(true);
    }
  };

  const handleDiscordConnect = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to connect Discord');
      return;
    }

    const redirectUri = 'virality://auth/social-callback/discord';
    const scope = 'identify email';
    const state = user.id;

    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;

    try {
      const canOpen = await Linking.canOpenURL(oauthUrl);
      if (canOpen) {
        await Linking.openURL(oauthUrl);
        onClose();
      } else {
        Alert.alert('Error', 'Cannot open Discord authorization page');
      }
    } catch (error) {
      console.error('Error opening Discord OAuth:', error);
      Alert.alert('Error', 'Failed to open Discord authorization');
    }
  };

  const handleTwitterConnect = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to connect X');
      return;
    }

    // X OAuth 2.0 with PKCE
    const redirectUri = 'virality://auth/social-callback/x';
    const scope = 'tweet.read users.read';
    const state = user.id;
    const codeVerifier = 'challenge'; // In production, use proper PKCE
    const codeChallenge = 'challenge';

    // Twitter OAuth URL (you'd need to set up a Twitter app)
    Alert.alert(
      'Coming Soon',
      'X/Twitter OAuth integration is being set up. Please try again later or connect via the web app.',
      [{ text: 'OK' }]
    );
  };

  const handleBioVerificationClose = () => {
    setBioVerificationVisible(false);
    setSelectedPlatform(null);
  };

  const handleBioVerificationSuccess = () => {
    setBioVerificationVisible(false);
    setSelectedPlatform(null);
    onConnected();
  };

  if (!visible && sheetTranslateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  const bioVerificationPlatforms: Platform[] = ['tiktok', 'instagram', 'youtube'];
  const oauthPlatforms: Platform[] = ['discord', 'twitter'];

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

        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Connect Account</Text>
          <Text style={styles.subtitle}>
            Choose a platform to connect your social account
          </Text>
        </View>

        {/* Bio Verification Platforms */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bio Verification</Text>
          <Text style={styles.sectionHint}>Add a code to your bio to verify</Text>
          <View style={styles.platformGrid}>
            {bioVerificationPlatforms.map((platform) => {
              const platformCfg = platformConfig[platform];
              const isConnected = connectedPlatforms.has(platform);
              return (
                <TouchableOpacity
                  key={platform}
                  style={[
                    styles.platformCard,
                    isConnected && styles.platformCardDisabled,
                  ]}
                  onPress={() => handlePlatformSelect(platform)}
                  disabled={isConnected}
                >
                  <View style={[styles.platformIcon, { backgroundColor: platformCfg.bg }]}>
                    <Icon name={platformCfg.icon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.platformName}>{platformCfg.name}</Text>
                  {isConnected && (
                    <View style={styles.connectedBadge}>
                      <Icon name="check" size={12} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* OAuth Platforms */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick Connect</Text>
          <Text style={styles.sectionHint}>Sign in with OAuth</Text>
          <View style={styles.platformGrid}>
            {oauthPlatforms.map((platform) => {
              const platformCfg = platformConfig[platform];
              const isConnected = connectedPlatforms.has(platform);
              return (
                <TouchableOpacity
                  key={platform}
                  style={[
                    styles.platformCard,
                    isConnected && styles.platformCardDisabled,
                  ]}
                  onPress={() => handlePlatformSelect(platform)}
                  disabled={isConnected}
                >
                  <View style={[styles.platformIcon, { backgroundColor: platformCfg.bg }]}>
                    <Icon name={platformCfg.icon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.platformName}>{platformCfg.name}</Text>
                  {isConnected && (
                    <View style={styles.connectedBadge}>
                      <Icon name="check" size={12} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bio Verification Sheet */}
      {selectedPlatform && bioVerificationPlatforms.includes(selectedPlatform) && (
        <BioVerificationSheet
          visible={bioVerificationVisible}
          onClose={handleBioVerificationClose}
          onSuccess={handleBioVerificationSuccess}
          platform={selectedPlatform}
        />
      )}
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
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  platformCardDisabled: {
    opacity: 0.5,
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
  },
  connectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
});
