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
import type { TrainingModule } from '../../../hooks/useCampaignDetail';

interface TrainingModuleViewProps {
  module: TrainingModule | null;
  isCompleted: boolean;
  onMarkComplete: () => void;
  onBack: () => void;
  isMarking: boolean;
}

export function TrainingModuleView({
  module,
  isCompleted,
  onMarkComplete,
  onBack,
  isMarking,
}: TrainingModuleViewProps) {
  if (!module) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Icon name="file-question-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Module Not Found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Icon name="arrow-left" size={18} color={colors.foreground} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleVideoPress = () => {
    if (module.video_url) {
      Linking.openURL(module.video_url);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backLink} onPress={onBack} activeOpacity={0.7}>
          <Icon name="arrow-left" size={18} color={colors.primary} />
          <Text style={styles.backLinkText}>Back to Blueprint</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.moduleIcon, isCompleted && styles.moduleIconCompleted]}>
            {isCompleted ? (
              <Icon name="check" size={24} color="#fff" />
            ) : (
              <Icon name="book-open-page-variant" size={24} color={colors.primary} />
            )}
          </View>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          {module.required && !isCompleted && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          )}
        </View>

        {/* Video */}
        {module.video_url && (
          <TouchableOpacity
            style={styles.videoCard}
            onPress={handleVideoPress}
            activeOpacity={0.8}
          >
            <View style={styles.videoPlaceholder}>
              <Icon name="play-circle" size={56} color={colors.primary} />
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoLabel}>Watch Training Video</Text>
              <Text style={styles.videoHint}>Opens in external player</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Content */}
        {module.content && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Module Content</Text>
            <View style={styles.contentCard}>
              <Text style={styles.contentText}>{module.content}</Text>
            </View>
          </View>
        )}

        {/* No Content */}
        {!module.content && !module.video_url && (
          <View style={styles.noContentCard}>
            <Icon name="information-outline" size={24} color={colors.mutedForeground} />
            <Text style={styles.noContentText}>
              This module has no content yet. Mark it as complete to continue.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        {isCompleted ? (
          <View style={styles.completedBanner}>
            <Icon name="check-circle" size={20} color={colors.success} />
            <Text style={styles.completedText}>Module Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, isMarking && styles.completeButtonLoading]}
            onPress={onMarkComplete}
            disabled={isMarking}
            activeOpacity={0.85}
          >
            {isMarking ? (
              <Text style={styles.completeButtonText}>Marking...</Text>
            ) : (
              <>
                <Icon name="check" size={20} color={colors.primaryForeground} />
                <Text style={styles.completeButtonText}>Mark as Complete</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  // Back
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  backLinkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  moduleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  moduleIconCompleted: {
    backgroundColor: colors.success,
  },
  moduleTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  requiredBadge: {
    backgroundColor: colors.warningMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  requiredBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.warning,
  },
  // Video
  videoCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  videoPlaceholder: {
    height: 180,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    padding: spacing.md,
    alignItems: 'center',
  },
  videoLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
  },
  videoHint: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  // Content
  contentSection: {
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
  contentCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentText: {
    fontSize: typography.sizes.base,
    color: colors.foreground,
    lineHeight: 24,
  },
  // No Content
  noContentCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noContentText: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  // Bottom Action
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  completeButtonLoading: {
    opacity: 0.7,
  },
  completeButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primaryForeground,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successMuted,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  completedText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.success,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    fontSize: typography.sizes.base,
    color: colors.foreground,
  },
});
