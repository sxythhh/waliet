import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, borderRadius, spacing, typography } from '../../../theme/colors';
import type { Campaign, TrainingModule } from '../../../hooks/useCampaignDetail';

interface BlueprintSectionProps {
  campaign: Campaign | null;
  trainingModules: TrainingModule[];
  trainingProgress: {
    completedModuleIds: string[];
    isModuleCompleted: (moduleId: string) => boolean;
    progress: number;
  };
  onModulePress: (moduleId: string) => void;
}

interface ModuleItemProps {
  module: TrainingModule;
  index: number;
  isCompleted: boolean;
  onPress: () => void;
}

function ModuleItem({ module, index, isCompleted, onPress }: ModuleItemProps) {
  return (
    <TouchableOpacity
      style={styles.moduleItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.moduleCheck, isCompleted && styles.moduleCheckCompleted]}>
        {isCompleted ? (
          <Icon name="check" size={14} color="#fff" />
        ) : (
          <Text style={styles.moduleNumber}>{index + 1}</Text>
        )}
      </View>
      <View style={styles.moduleInfo}>
        <Text
          style={[styles.moduleTitle, isCompleted && styles.moduleTitleCompleted]}
          numberOfLines={2}
        >
          {module.title}
        </Text>
        {module.required && !isCompleted && (
          <Text style={styles.moduleRequired}>Required</Text>
        )}
      </View>
      <View style={styles.moduleRight}>
        {module.video_url && (
          <Icon name="play-circle-outline" size={18} color={colors.mutedForeground} />
        )}
        <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

export function BlueprintSection({
  campaign,
  trainingModules,
  trainingProgress,
  onModulePress,
}: BlueprintSectionProps) {
  if (!campaign) return null;

  const hasModules = trainingModules.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Guidelines */}
      {campaign.guidelines && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Guidelines</Text>
          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelinesText}>{campaign.guidelines}</Text>
          </View>
        </View>
      )}

      {/* Hashtags */}
      {campaign.hashtags && campaign.hashtags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Hashtags</Text>
          <View style={styles.hashtagsRow}>
            {campaign.hashtags.map((tag: string, i: number) => (
              <View key={i} style={styles.hashtag}>
                <Text style={styles.hashtagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Training Modules */}
      {hasModules && (
        <View style={styles.section}>
          <View style={styles.trainingHeader}>
            <Text style={styles.sectionTitle}>Training Modules</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {trainingProgress.progress}% complete
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${trainingProgress.progress}%` }]}
              />
            </View>
          </View>

          {/* Module List */}
          <View style={styles.modulesList}>
            {trainingModules.map((module, index) => (
              <ModuleItem
                key={module.id}
                module={module}
                index={index}
                isCompleted={trainingProgress.isModuleCompleted(module.id)}
                onPress={() => onModulePress(module.id)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty State for Training */}
      {!hasModules && !campaign.guidelines && (
        <View style={styles.emptyState}>
          <Icon name="book-open-page-variant-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No Blueprint Available</Text>
          <Text style={styles.emptySubtitle}>
            This campaign doesn't have specific guidelines or training modules.
          </Text>
        </View>
      )}
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
  // Guidelines
  guidelinesCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guidelinesText: {
    fontSize: typography.sizes.base,
    color: colors.foreground,
    lineHeight: 22,
  },
  // Hashtags
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hashtag: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  hashtagText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
  // Training
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  progressBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  progressBarContainer: {
    marginBottom: spacing.lg,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  // Module List
  modulesList: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduleCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  moduleCheckCompleted: {
    backgroundColor: colors.primary,
  },
  moduleNumber: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.mutedForeground,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  moduleTitleCompleted: {
    color: colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  moduleRequired: {
    fontSize: typography.sizes.xs,
    color: colors.warning,
    marginTop: 2,
  },
  moduleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Empty State
  emptyState: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
