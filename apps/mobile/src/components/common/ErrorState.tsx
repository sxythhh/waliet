import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Button } from '../ui';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again later',
  icon = 'alert-circle-outline',
  onRetry,
  retryLabel = 'Try Again',
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Icon name={icon} size={48} color={colors.destructive} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          variant="default"
          size="default"
          onPress={onRetry}
          style={styles.retryButton}
          leftIcon={<Icon name="refresh" size={18} color="#fff" />}
        >
          {retryLabel}
        </Button>
      )}
    </View>
  );
}

// Network error variant
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon="wifi-off"
      title="No connection"
      message="Please check your internet connection and try again"
      onRetry={onRetry}
    />
  );
}

// Not found variant
export function NotFoundError({
  message = "The content you're looking for doesn't exist",
  onBack,
}: {
  message?: string;
  onBack?: () => void;
}) {
  return (
    <ErrorState
      icon="file-find-outline"
      title="Not found"
      message={message}
      onRetry={onBack}
      retryLabel="Go Back"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 140,
  },
});
