import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Button, ButtonProps } from './button';

export interface EmptyStateProps {
  icon?: string;
  iconColor?: string;
  iconSize?: number;
  title: string;
  description?: string;
  action?: ButtonProps & { label: string };
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'inbox-outline',
  iconColor = colors.mutedForeground,
  iconSize = 48,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Icon name={icon} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      {action && (
        <Button
          variant={action.variant || 'default'}
          size={action.size || 'default'}
          onPress={action.onPress}
          style={styles.action}
        >
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: 24,
  },
});
