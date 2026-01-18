import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 320;

// Google logo SVG component
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

type EmailStep = 'email' | 'otp';

export function AuthScreen() {
  const { signInWithGoogle, signInWithEmail, verifyEmailOTP, loading } = useAuth();
  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [emailStep, setEmailStep] = useState<EmailStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sheet animation values
  const sheetTranslateY = useSharedValue(SHEET_HEIGHT);
  const dragStartY = useSharedValue(0);
  const keyboardHeight = useSharedValue(0);

  // Track keyboard height
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, { duration: 250 });
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.value = withTiming(0, { duration: 250 });
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Open/close sheet animation
  useEffect(() => {
    if (showEmailSheet) {
      sheetTranslateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    }
  }, [showEmailSheet]);

  const closeSheet = () => {
    Keyboard.dismiss();
    setShowEmailSheet(false);
    // Reset state after animation
    setTimeout(() => {
      setEmailStep('email');
      setEmail('');
      setOtp('');
      setError(null);
    }, 300);
  };

  // Drag gesture for sheet handle
  const handleDragGesture = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = sheetTranslateY.value;
    })
    .onUpdate((event) => {
      const newY = Math.max(0, dragStartY.value + event.translationY);
      sheetTranslateY.value = newY;
    })
    .onEnd((event) => {
      if (sheetTranslateY.value > 80 || event.velocityY > 500) {
        sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
        runOnJS(closeSheet)();
      } else {
        sheetTranslateY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
    bottom: keyboardHeight.value,
  }));

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await signInWithEmail(email.trim());

    setIsSubmitting(false);

    if (result.success) {
      setEmailStep('otp');
    } else {
      setError(result.error || 'Failed to send code');
    }
  };

  const handleOTPSubmit = async () => {
    if (!otp.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await verifyEmailOTP(email, otp.trim());

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid code');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../assets/wordmark-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.authContainer}>
          {/* App Preview Image */}
          <View style={styles.previewContainer}>
            <Image
              source={require('../assets/mobile-screen.png')}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.authButtonsContainer}>
            {/* Google Button */}
            <TouchableOpacity
              style={[styles.authButton, styles.googleButton]}
              onPress={signInWithGoogle}
              activeOpacity={0.8}
            >
              <GoogleLogo size={20} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Email Button */}
            <TouchableOpacity
              style={[styles.authButton, styles.emailButton]}
              onPress={() => setShowEmailSheet(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.authButtonText}>Continue with Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>

      {/* Email Bottom Sheet */}
      {(showEmailSheet || sheetTranslateY.value < SHEET_HEIGHT) && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Backdrop */}
          {showEmailSheet && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
              <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={closeSheet}
              />
            </Animated.View>
          )}

          {/* Sheet */}
          <Animated.View style={[styles.sheet, sheetStyle]}>
            {/* Handle */}
            <GestureDetector gesture={handleDragGesture}>
              <Animated.View style={styles.handleContainer}>
                <View style={styles.handle} />
              </Animated.View>
            </GestureDetector>

            {/* Sheet Content */}
            <View style={styles.sheetContent}>
              {emailStep === 'email' ? (
                <>
                  <Text style={styles.sheetTitle}>Enter your email</Text>
                  <Text style={styles.sheetSubtitle}>We'll send you a verification code</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />

                  {error && <Text style={styles.errorText}>{error}</Text>}

                  <TouchableOpacity
                    style={[styles.authButton, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleEmailSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>Check your email</Text>
                  <Text style={styles.sheetSubtitle}>Enter the 6-digit code sent to {email}</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="000000"
                    placeholderTextColor={colors.mutedForeground}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={6}
                  />

                  {error && <Text style={styles.errorText}>{error}</Text>}

                  <TouchableOpacity
                    style={[styles.authButton, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleOTPSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleEmailSubmit}
                    style={styles.resendButton}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.resendButtonText}>Resend code</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  brandLogo: {
    width: 160,
    height: 40,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxHeight: 400,
  },
  authButtonsContainer: {
    gap: 4,
  },

  // Bottom Sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    gap: 10,
  },
  emailButton: {
    backgroundColor: colors.primary,
    borderTopWidth: 1,
    borderTopColor: '#589bfd',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderTopWidth: 1,
    borderTopColor: '#589bfd',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    color: colors.mutedForeground,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  footer: {
    paddingBottom: 24,
  },
  footerText: {
    color: colors.mutedForeground,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
});
