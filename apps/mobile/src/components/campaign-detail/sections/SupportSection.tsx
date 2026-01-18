import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, borderRadius, spacing, typography } from '../../../theme/colors';
import type { Campaign } from '../../../hooks/useCampaignDetail';

interface SupportSectionProps {
  campaign: Campaign | null;
}

interface SupportOptionProps {
  icon: string;
  iconColor: string;
  bgColor: string;
  title: string;
  description: string;
  onPress: () => void;
}

function SupportOption({
  icon,
  iconColor,
  bgColor,
  title,
  description,
  onPress,
}: SupportOptionProps) {
  return (
    <TouchableOpacity style={styles.optionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.optionIcon, { backgroundColor: bgColor }]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.optionInfo}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export function SupportSection({ campaign }: SupportSectionProps) {
  const handleDiscordPress = () => {
    if (campaign?.discord_invite_url) {
      Linking.openURL(campaign.discord_invite_url);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@virality.so?subject=Campaign Support');
  };

  const handleHelpCenterPress = () => {
    Linking.openURL('https://virality.so/help');
  };

  const handleFAQPress = () => {
    Linking.openURL('https://virality.so/faq');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Icon name="help-circle-outline" size={48} color={colors.primary} />
        <Text style={styles.headerTitle}>Need Help?</Text>
        <Text style={styles.headerSubtitle}>
          Choose how you'd like to get support
        </Text>
      </View>

      {/* Campaign Discord */}
      {campaign?.discord_invite_url && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Community</Text>
          <SupportOption
            icon="discord"
            iconColor="#5865F2"
            bgColor="rgba(88, 101, 242, 0.15)"
            title="Join Discord"
            description="Connect with the brand and other creators"
            onPress={handleDiscordPress}
          />
        </View>
      )}

      {/* Contact Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Help</Text>

        <SupportOption
          icon="email-outline"
          iconColor={colors.primary}
          bgColor={colors.primaryMuted}
          title="Email Support"
          description="Get help from our support team"
          onPress={handleEmailPress}
        />

        <SupportOption
          icon="book-open-outline"
          iconColor={colors.success}
          bgColor={colors.successMuted}
          title="Help Center"
          description="Browse guides and tutorials"
          onPress={handleHelpCenterPress}
        />

        <SupportOption
          icon="frequently-asked-questions"
          iconColor={colors.warning}
          bgColor={colors.warningMuted}
          title="FAQ"
          description="Find answers to common questions"
          onPress={handleFAQPress}
        />
      </View>

      {/* Tips Section */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Quick Tips</Text>
        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.tipText}>
              Complete all training modules before submitting
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.tipText}>
              Use required hashtags in your video captions
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.tipText}>
              Keep your videos authentic and engaging
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.tipText}>
              Check back regularly for updates and announcements
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 120, // Extra space for floating submit button
  },
  // Header
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  // Option Card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
  },
  optionDescription: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  // Tips Section
  tipsSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  tipsList: {
    gap: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});
