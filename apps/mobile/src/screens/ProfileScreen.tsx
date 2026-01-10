import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
  Switch,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

interface CreatorStats {
  totalSubmissions: number;
  approvedSubmissions: number;
  totalViews: number;
  totalEarned: number;
  approvalRate: number;
}

interface CreatorProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  tiktok_handle: string;
  instagram_handle: string;
  youtube_handle: string;
  tier: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Email OTP Sign In Component
function EmailSignIn({
  onBack,
  signInWithEmail,
  verifyEmailOTP,
}: {
  onBack: () => void;
  signInWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOTP: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!email || loading) return;

    setLoading(true);
    const result = await signInWithEmail(email);
    setLoading(false);

    if (result.success) {
      setStep('otp');
      startResendCooldown();
      Alert.alert('Code Sent', 'Check your email for a 6-digit verification code.');
    } else {
      Alert.alert('Error', result.error || 'Failed to send verification code');
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6 || loading) return;

    setLoading(true);
    const result = await verifyEmailOTP(email, otpCode);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Invalid Code', result.error || 'Please check the code and try again.');
      setOtpCode('');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;

    setLoading(true);
    const result = await signInWithEmail(email);
    setLoading(false);

    if (result.success) {
      startResendCooldown();
      Alert.alert('Code Resent', 'Check your email for a new verification code.');
    } else {
      Alert.alert('Error', result.error || 'Failed to resend code');
    }
  };

  if (step === 'otp') {
    return (
      <View style={styles.emailAuthContainer}>
        <TouchableOpacity onPress={() => setStep('email')} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color={colors.mutedForeground} />
          <Text style={styles.backButtonText}>Change email</Text>
        </TouchableOpacity>

        <View style={styles.emailAuthHeader}>
          <Text style={styles.emailAuthTitle}>Check your email</Text>
          <Text style={styles.emailAuthSubtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
        </View>

        <TextInput
          style={styles.otpInput}
          value={otpCode}
          onChangeText={(text) => {
            setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6));
          }}
          placeholder="000000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.emailSubmitButton, otpCode.length !== 6 && styles.emailSubmitButtonDisabled]}
          onPress={handleVerifyOTP}
          disabled={otpCode.length !== 6 || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Text style={styles.emailSubmitButtonText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={resendCooldown > 0 || loading}
          style={styles.resendButton}
        >
          <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive the code? Resend"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.emailAuthContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-left" size={20} color={colors.mutedForeground} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.emailAuthHeader}>
        <Text style={styles.emailAuthTitle}>Sign in with Email</Text>
        <Text style={styles.emailAuthSubtitle}>
          We'll send you a verification code
        </Text>
      </View>

      <TextInput
        style={styles.emailInput}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.emailSubmitButton, !email && styles.emailSubmitButtonDisabled]}
        onPress={handleSendOTP}
        disabled={!email || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <Text style={styles.emailSubmitButtonText}>Send Code</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function ProfileScreen() {
  const {
    user,
    loading,
    signInWithDiscord,
    signInWithGoogle,
    signInWithEmail,
    verifyEmailOTP,
    signOut
  } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [authMode, setAuthMode] = useState<'options' | 'email'>('options');

  // Fetch creator profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<CreatorProfile | null> => {
      if (!user?.id) return null;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch creator stats
  const { data: stats } = useQuery({
    queryKey: ['creator-stats', user?.id],
    queryFn: async (): Promise<CreatorStats> => {
      if (!user?.id) {
        return {
          totalSubmissions: 0,
          approvedSubmissions: 0,
          totalViews: 0,
          totalEarned: 0,
          approvalRate: 0,
        };
      }

      // Get submission stats
      const { data: submissions } = await supabase
        .from('video_submissions')
        .select('status, total_views, total_earned')
        .eq('user_id', user.id);

      const total = submissions?.length || 0;
      const approved = submissions?.filter(
        (s) => s.status === 'approved' || s.status === 'paid'
      ).length || 0;
      const views = submissions?.reduce((sum, s) => sum + (s.total_views || 0), 0) || 0;
      const earned = submissions?.reduce((sum, s) => sum + (s.total_earned || 0), 0) || 0;

      return {
        totalSubmissions: total,
        approvedSubmissions: approved,
        totalViews: views,
        totalEarned: earned,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      };
    },
    enabled: !!user?.id,
  });

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
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

  // Sign-in options view
  const renderSignInOptions = () => (
    <View style={styles.profileCard}>
      <View style={styles.avatar}>
        <Icon name="account-outline" size={40} color={colors.mutedForeground} />
      </View>
      <Text style={styles.signInPrompt}>Sign in to get started</Text>
      <Text style={styles.signInSubtext}>
        Join campaigns and start earning
      </Text>

      <View style={styles.authButtonsContainer}>
        {/* Discord */}
        <TouchableOpacity
          style={[styles.authButton, styles.discordButton]}
          onPress={signInWithDiscord}
        >
          <Icon name="discord" size={22} color={colors.foreground} />
          <Text style={styles.authButtonText}>Continue with Discord</Text>
        </TouchableOpacity>

        {/* Google */}
        <TouchableOpacity
          style={[styles.authButton, styles.googleButton]}
          onPress={signInWithGoogle}
        >
          <Icon name="google" size={22} color={colors.foreground} />
          <Text style={styles.authButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email */}
        <TouchableOpacity
          style={[styles.authButton, styles.emailButton]}
          onPress={() => setAuthMode('email')}
        >
          <Icon name="email-outline" size={22} color={colors.foreground} />
          <Text style={styles.authButtonText}>Continue with Email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Profile</Text>

          {/* Profile Card */}
          {!user ? (
            authMode === 'email' ? (
              <View style={styles.profileCard}>
                <EmailSignIn
                  onBack={() => setAuthMode('options')}
                  signInWithEmail={signInWithEmail}
                  verifyEmailOTP={verifyEmailOTP}
                />
              </View>
            ) : (
              renderSignInOptions()
            )
          ) : (
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                  <Image
                    source={{ uri: profile?.avatar_url || user.user_metadata?.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {(profile?.full_name || user.user_metadata?.full_name)?.[0] ||
                      user.email?.[0]?.toUpperCase() ||
                      '?'}
                  </Text>
                )}
              </View>
              <Text style={styles.userName}>
                {profile?.full_name || user.user_metadata?.full_name || 'Creator'}
              </Text>
              {profile?.username && (
                <Text style={styles.userHandle}>@{profile.username}</Text>
              )}
              {profile?.tier && (
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>{profile.tier}</Text>
                </View>
              )}
            </View>
          )}

          {/* Stats Grid - Only show when signed in */}
          {user && stats && (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalSubmissions}</Text>
                <Text style={styles.statLabel}>Submissions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {stats.approvalRate}%
                </Text>
                <Text style={styles.statLabel}>Approval Rate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(stats.totalViews)}</Text>
                <Text style={styles.statLabel}>Total Views</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {formatCurrency(stats.totalEarned)}
                </Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
            </View>
          )}

          {/* Connected Accounts - Only show when signed in */}
          {user && profile && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="link-variant" size={18} color={colors.foreground} />
                <Text style={styles.sectionTitle}>Connected Accounts</Text>
              </View>
              <View style={styles.accountsList}>
                {profile.tiktok_handle && (
                  <TouchableOpacity
                    style={styles.accountItem}
                    onPress={() => handleOpenLink(`https://tiktok.com/@${profile.tiktok_handle}`)}
                  >
                    <View style={[styles.accountIcon, { backgroundColor: colors.background }]}>
                      <Icon name="music-note" size={18} color={colors.foreground} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>TikTok</Text>
                      <Text style={styles.accountHandle}>@{profile.tiktok_handle}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
                {profile.instagram_handle && (
                  <TouchableOpacity
                    style={styles.accountItem}
                    onPress={() => handleOpenLink(`https://instagram.com/${profile.instagram_handle}`)}
                  >
                    <View style={[styles.accountIcon, { backgroundColor: '#E1306C' }]}>
                      <Icon name="instagram" size={18} color={colors.foreground} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>Instagram</Text>
                      <Text style={styles.accountHandle}>@{profile.instagram_handle}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
                {profile.youtube_handle && (
                  <TouchableOpacity
                    style={styles.accountItem}
                    onPress={() => handleOpenLink(`https://youtube.com/@${profile.youtube_handle}`)}
                  >
                    <View style={[styles.accountIcon, { backgroundColor: '#FF0000' }]}>
                      <Icon name="youtube" size={18} color={colors.foreground} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>YouTube</Text>
                      <Text style={styles.accountHandle}>@{profile.youtube_handle}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
                {!profile.tiktok_handle && !profile.instagram_handle && !profile.youtube_handle && (
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={() => handleOpenLink('https://virality.so/settings')}
                  >
                    <Icon name="plus-circle-outline" size={18} color={colors.primary} style={styles.connectIcon} />
                    <Text style={styles.connectButtonText}>Connect your social accounts</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Settings */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="cog-outline" size={18} color={colors.foreground} />
              <Text style={styles.sectionTitle}>Settings</Text>
            </View>
            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <Icon name="bell-outline" size={22} color={colors.mutedForeground} style={styles.settingIconLeft} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Get notified about campaign updates
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.foreground}
                />
              </View>
            </View>
          </View>

          {/* Menu */}
          <View style={styles.section}>
            <View style={styles.menuList}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleOpenLink('https://virality.so/help')}
              >
                <Icon name="help-circle-outline" size={22} color={colors.mutedForeground} style={styles.menuIconLeft} />
                <Text style={styles.menuItemText}>Help & Support</Text>
                <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleOpenLink('https://virality.so/terms')}
              >
                <Icon name="file-document-outline" size={22} color={colors.mutedForeground} style={styles.menuIconLeft} />
                <Text style={styles.menuItemText}>Terms of Service</Text>
                <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleOpenLink('https://virality.so/privacy')}
              >
                <Icon name="shield-lock-outline" size={22} color={colors.mutedForeground} style={styles.menuIconLeft} />
                <Text style={styles.menuItemText}>Privacy Policy</Text>
                <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out */}
          {user && (
            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
              <Icon name="logout" size={20} color={colors.destructive} style={styles.signOutIcon} />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          )}

          {/* App Version */}
          <Text style={styles.versionText}>Virality v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    fontSize: 36,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 15,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  tierBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  signInPrompt: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  signInSubtext: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 20,
  },
  authButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  discordButton: {
    backgroundColor: '#5865F2',
  },
  googleButton: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailButton: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedForeground,
    fontSize: 13,
    marginHorizontal: 12,
  },
  // Email auth styles
  emailAuthContainer: {
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    color: colors.mutedForeground,
    fontSize: 14,
    marginLeft: 8,
  },
  emailAuthHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emailAuthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  emailAuthSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  emailHighlight: {
    color: colors.foreground,
    fontWeight: '500',
  },
  emailInput: {
    backgroundColor: colors.muted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otpInput: {
    backgroundColor: colors.muted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    letterSpacing: 8,
  },
  emailSubmitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  emailSubmitButtonDisabled: {
    opacity: 0.5,
  },
  emailSubmitButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
  },
  resendTextDisabled: {
    color: colors.mutedForeground,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statItem: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  accountsList: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    color: colors.foreground,
    fontWeight: '500',
  },
  accountHandle: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  connectIcon: {
    marginRight: 8,
  },
  connectButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  settingsList: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  settingIconLeft: {
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingName: {
    fontSize: 15,
    color: colors.foreground,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  menuList: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconLeft: {
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    color: colors.foreground,
    fontSize: 15,
  },
  signOutButton: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.destructive,
    marginBottom: 16,
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutButtonText: {
    color: colors.destructive,
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 13,
    marginBottom: 100,
  },
});
