import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Clipboard,
  LayoutAnimation,
  Platform as RNPlatform,
  UIManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  FadeIn,
  FadeOut,
  Easing,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import {
  Platform,
  platformConfig,
  generateVerificationCode,
  parseUsernameFromUrl,
  useConnectSocialAccount,
  getPlatformUrl,
} from '../../hooks/useSocialAccounts';
import { useAuth } from '../../contexts/AuthContext';

// Enable LayoutAnimation on Android
if (RNPlatform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const VERIFICATION_TIMEOUT = 10 * 60; // 10 minutes in seconds

interface ConnectAccountSheetProps {
  visible: boolean;
  onClose: () => void;
  onConnected: () => void;
  connectedPlatforms: Set<Platform>;
}

type Step = 'platform' | 'username' | 'verify' | 'success';

const DISCORD_CLIENT_ID = '1307072439679295529';

const bioVerificationPlatforms: Platform[] = ['tiktok', 'instagram', 'youtube'];
const oauthPlatforms: Platform[] = ['discord', 'twitter'];

export function ConnectAccountSheet({
  visible,
  onClose,
  onConnected,
  connectedPlatforms,
}: ConnectAccountSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const connectMutation = useConnectSocialAccount();

  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const dragStartY = useSharedValue(0);

  // Multi-step state
  const [step, setStep] = useState<Step>('platform');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(VERIFICATION_TIMEOUT);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate verification code when entering username step
  useEffect(() => {
    if (visible && step === 'username' && selectedPlatform) {
      setVerificationCode(generateVerificationCode());
      setTimeRemaining(VERIFICATION_TIMEOUT);
    }
  }, [visible, step, selectedPlatform]);

  // Timer countdown for verification step
  useEffect(() => {
    if (step === 'verify' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            Alert.alert(
              'Code Expired',
              'Your verification code has expired. Please try again.',
              [{ text: 'OK', onPress: () => goToStep('username') }]
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [step, timeRemaining]);

  // Sheet animation
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
        runOnJS(handleClose)();
      } else {
        sheetTranslateY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const goToStep = (newStep: Step, dir: 'forward' | 'back' = 'forward') => {
    setDirection(dir);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(newStep);
  };

  const handleClose = useCallback(() => {
    // Reset state
    setStep('platform');
    setSelectedPlatform(null);
    setUsername('');
    setVerificationCode('');
    setTimeRemaining(VERIFICATION_TIMEOUT);
    setCopied(false);
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  }, [onClose]);

  const handlePlatformSelect = async (platform: Platform) => {
    // OAuth platforms (Discord, Twitter) only allow one account
    if ((platform === 'discord' || platform === 'twitter') && connectedPlatforms.has(platform)) {
      Alert.alert('Already Connected', `Your ${platformConfig[platform].name} account is already connected.`);
      return;
    }

    if (platform === 'discord') {
      await handleDiscordConnect();
    } else if (platform === 'twitter') {
      handleTwitterConnect();
    } else {
      // Bio verification flow
      setSelectedPlatform(platform);
      goToStep('username', 'forward');
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
        handleClose();
      } else {
        Alert.alert('Error', 'Cannot open Discord authorization page');
      }
    } catch (error) {
      console.error('Error opening Discord OAuth:', error);
      Alert.alert('Error', 'Failed to open Discord authorization');
    }
  };

  const handleTwitterConnect = () => {
    Alert.alert(
      'Coming Soon',
      'X/Twitter OAuth integration is being set up. Please try again later or connect via the web app.',
      [{ text: 'OK' }]
    );
  };

  const handleUsernameSubmit = () => {
    if (!selectedPlatform) return;

    const parsedUsername = parseUsernameFromUrl(username, selectedPlatform);
    if (!parsedUsername) {
      Alert.alert('Invalid Username', 'Please enter a valid username or profile URL');
      return;
    }
    setUsername(parsedUsername);
    setTimeRemaining(VERIFICATION_TIMEOUT);
    goToStep('verify', 'forward');
  };

  const handleCopyCode = async () => {
    try {
      Clipboard.setString(verificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Verification Code', verificationCode, [{ text: 'Done' }]);
    }
  };

  const handleOpenProfile = async () => {
    if (!selectedPlatform) return;
    const url = getPlatformUrl(selectedPlatform, username);
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening profile:', error);
    }
  };

  const handleVerify = async () => {
    if (!selectedPlatform) return;

    setIsVerifying(true);

    const result = await connectMutation.mutateAsync({
      platform: selectedPlatform,
      username,
      verificationCode,
    });

    setIsVerifying(false);

    if (result.success) {
      if (timerRef.current) clearInterval(timerRef.current);
      goToStep('success', 'forward');
      setTimeout(() => {
        handleClose();
        onConnected();
      }, 1500);
    } else {
      Alert.alert('Verification Failed', result.error || 'Could not verify your account. Please try again.');
    }
  };

  const handleBack = () => {
    if (step === 'verify') {
      goToStep('username', 'back');
    } else if (step === 'username') {
      setSelectedPlatform(null);
      goToStep('platform', 'back');
    } else {
      handleClose();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlaceholder = () => {
    if (!selectedPlatform) return 'Username';
    switch (selectedPlatform) {
      case 'tiktok':
        return '@username or tiktok.com/@username';
      case 'instagram':
        return '@username or instagram.com/username';
      case 'youtube':
        return '@handle or youtube.com/@handle';
      default:
        return 'Username';
    }
  };

  if (!visible && sheetTranslateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  const platformCfg = selectedPlatform ? platformConfig[selectedPlatform] : null;

  const renderPlatformSelection = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Connect Account</Text>
      <Text style={styles.subtitle}>
        Choose a platform to connect your social account
      </Text>

      {/* Bio Verification Platforms */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Bio Verification</Text>
        <Text style={styles.sectionHint}>Add a code to your bio to verify</Text>
        <View style={styles.platformGrid}>
          {bioVerificationPlatforms.map((platform) => {
            const config = platformConfig[platform];
            return (
              <TouchableOpacity
                key={platform}
                style={styles.platformCard}
                onPress={() => handlePlatformSelect(platform)}
                activeOpacity={0.7}
              >
                <View style={[styles.platformIcon, { backgroundColor: config.bg }]}>
                  <Image
                    source={config.logoWhite}
                    style={styles.platformLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.platformName}>{config.name}</Text>
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
            const config = platformConfig[platform];
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
                activeOpacity={0.7}
              >
                <View style={[styles.platformIcon, { backgroundColor: config.bg }]}>
                  <Image
                    source={config.logoWhite}
                    style={styles.platformLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.platformName}>{config.name}</Text>
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
    </View>
  );

  const renderUsernameInput = () => (
    <View style={styles.content}>
      {/* Progress indicator */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>

      <View style={styles.stepHeader}>
        {platformCfg && (
          <View style={[styles.platformBadge, { backgroundColor: platformCfg.bg }]}>
            <Image
              source={platformCfg.logoWhite}
              style={styles.platformBadgeLogo}
              resizeMode="contain"
            />
          </View>
        )}
        <View>
          <Text style={styles.stepTitle}>Enter your username</Text>
          <Text style={styles.stepSubtitle}>Step 1 of 2</Text>
        </View>
      </View>

      <Text style={styles.instruction}>
        Enter your {platformCfg?.name} username or paste your profile URL
      </Text>

      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder={getPlaceholder()}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={handleUsernameSubmit}
      />

      <TouchableOpacity
        style={[styles.primaryButton, !username && styles.primaryButtonDisabled]}
        onPress={handleUsernameSubmit}
        disabled={!username}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Icon name="arrow-right" size={18} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );

  const renderVerification = () => (
    <View style={styles.content}>
      {/* Progress indicator */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <View style={styles.stepHeader}>
        {platformCfg && (
          <View style={[styles.platformBadge, { backgroundColor: platformCfg.bg }]}>
            <Image
              source={platformCfg.logoWhite}
              style={styles.platformBadgeLogo}
              resizeMode="contain"
            />
          </View>
        )}
        <View>
          <Text style={styles.stepTitle}>Verify your account</Text>
          <Text style={styles.stepSubtitle}>Step 2 of 2 • @{username}</Text>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Icon
          name="clock-outline"
          size={16}
          color={timeRemaining < 60 ? colors.warning : colors.mutedForeground}
        />
        <Text
          style={[
            styles.timerText,
            timeRemaining < 60 && styles.timerTextWarning,
          ]}
        >
          {formatTime(timeRemaining)} remaining
        </Text>
      </View>

      {/* Verification Code */}
      <TouchableOpacity style={styles.codeContainer} onPress={handleCopyCode} activeOpacity={0.8}>
        <Text style={styles.codeLabel}>TAP TO COPY CODE</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeText}>{verificationCode}</Text>
          <View style={[styles.copyBadge, copied && styles.copyBadgeSuccess]}>
            <Icon
              name={copied ? 'check' : 'content-copy'}
              size={16}
              color={copied ? colors.success : colors.primary}
            />
          </View>
        </View>
        {copied && <Text style={styles.copiedText}>Copied to clipboard!</Text>}
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructionSteps}>
        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
          <Text style={styles.stepText}>Copy the code above</Text>
        </View>
        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
          <Text style={styles.stepText}>Add it to your {platformCfg?.name} bio</Text>
        </View>
        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
          <Text style={styles.stepText}>Come back and tap Verify</Text>
        </View>
      </View>

      {/* Open Profile Link */}
      <TouchableOpacity style={styles.openProfileButton} onPress={handleOpenProfile}>
        <Icon name="open-in-new" size={16} color={colors.primary} />
        <Text style={styles.openProfileText}>
          Open {platformCfg?.name} to edit bio
        </Text>
      </TouchableOpacity>

      {/* Verify Button */}
      <TouchableOpacity
        style={[styles.primaryButton, styles.verifyButton, isVerifying && styles.primaryButtonDisabled]}
        onPress={handleVerify}
        disabled={isVerifying}
      >
        {isVerifying ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <>
            <Icon name="check-circle" size={20} color={colors.foreground} />
            <Text style={styles.primaryButtonText}>Verify Account</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.noteText}>
        You can remove the code from your bio after verification
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={[styles.content, styles.successContent]}>
      <View style={styles.successIcon}>
        <Icon name="check-circle" size={64} color={colors.success} />
      </View>
      <Text style={styles.successTitle}>Account Connected!</Text>
      <Text style={styles.successSubtitle}>
        Your {platformCfg?.name} account has been verified
      </Text>
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      {visible && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
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

        {/* Header with back button (only when not on platform selection) */}
        {step !== 'platform' && step !== 'success' && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Icon name="arrow-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step Content */}
        {step === 'platform' && renderPlatformSelection()}
        {step === 'username' && renderUsernameInput()}
        {step === 'verify' && renderVerification()}
        {step === 'success' && renderSuccess()}

        {/* Cancel Button (only on platform selection) */}
        {step === 'platform' && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
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
    maxHeight: SCREEN_HEIGHT * 0.9,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedForeground,
    marginBottom: 24,
  },
  section: {
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
  platformLogoImage: {
    width: 28,
    height: 28,
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
    marginTop: 8,
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
  // Step Content Styles
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  platformBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformBadgeLogo: {
    width: 24,
    height: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  instruction: {
    fontSize: 15,
    color: colors.mutedForeground,
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  verifyButton: {
    backgroundColor: colors.success,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  timerText: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  timerTextWarning: {
    color: colors.warning,
  },
  codeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: 6,
    fontFamily: 'monospace',
  },
  copyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBadgeSuccess: {
    backgroundColor: colors.successMuted,
  },
  copiedText: {
    fontSize: 12,
    color: colors.success,
    marginTop: 8,
    fontWeight: '500',
  },
  instructionSteps: {
    marginBottom: 16,
    gap: 10,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  openProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  openProfileText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 12,
  },
  // Success State
  successContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.mutedForeground,
  },
});
