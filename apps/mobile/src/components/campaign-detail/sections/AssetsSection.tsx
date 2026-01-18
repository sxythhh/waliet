import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, borderRadius, spacing, typography } from '../../../theme/colors';
import type { CampaignAsset } from '../../../hooks/useCampaignDetail';

interface AssetsSectionProps {
  assets: CampaignAsset[];
  onRefresh: () => void;
  isLoading: boolean;
}

function getFileIcon(fileType: string): string {
  const type = fileType.toLowerCase();
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
    return 'image-outline';
  }
  if (type.includes('video') || type.includes('mp4') || type.includes('mov')) {
    return 'video-outline';
  }
  if (type.includes('pdf')) {
    return 'file-pdf-box';
  }
  if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) {
    return 'music-note-outline';
  }
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
    return 'folder-zip-outline';
  }
  return 'file-outline';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function AssetItem({ item }: { item: CampaignAsset }) {
  const handlePress = () => {
    if (item.file_url) {
      Linking.openURL(item.file_url);
    }
  };

  return (
    <TouchableOpacity style={styles.assetItem} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.assetIcon}>
        <Icon name={getFileIcon(item.file_type)} size={24} color={colors.primary} />
      </View>
      <View style={styles.assetInfo}>
        <Text style={styles.assetName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.assetMeta}>
          {item.file_type} • {formatDate(item.created_at)}
        </Text>
      </View>
      <Icon name="download" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export function AssetsSection({
  assets,
  onRefresh,
  isLoading,
}: AssetsSectionProps) {
  return (
    <View style={styles.container}>
      <FlatList
        data={assets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssetItem item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          assets.length > 0 ? (
            <Text style={styles.headerText}>
              Tap to download or open in browser
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="folder-open-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No Assets Available</Text>
            <Text style={styles.emptySubtitle}>
              The brand hasn't uploaded any resources yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  listContent: {
    paddingBottom: 120, // Extra space for floating submit button
  },
  headerText: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  // Asset Item
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  assetMeta: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
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
  },
});
