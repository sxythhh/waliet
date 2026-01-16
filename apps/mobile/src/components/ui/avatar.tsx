import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeStyles: Record<AvatarSize, { container: ViewStyle; text: TextStyle; size: number }> = {
  xs: {
    container: { width: 24, height: 24 },
    text: { fontSize: 10 },
    size: 24,
  },
  sm: {
    container: { width: 32, height: 32 },
    text: { fontSize: 12 },
    size: 32,
  },
  default: {
    container: { width: 40, height: 40 },
    text: { fontSize: 14 },
    size: 40,
  },
  lg: {
    container: { width: 48, height: 48 },
    text: { fontSize: 16 },
    size: 48,
  },
  xl: {
    container: { width: 64, height: 64 },
    text: { fontSize: 20 },
    size: 64,
  },
  '2xl': {
    container: { width: 96, height: 96 },
    text: { fontSize: 28 },
    size: 96,
  },
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'default',
  style,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const sizeStyle = sizeStyles[size];

  const showImage = src && !hasError;
  const initials = fallback || getInitials(alt);

  return (
    <View
      style={[
        styles.container,
        sizeStyle.container,
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: src }}
          style={{
            width: sizeStyle.size,
            height: sizeStyle.size,
            borderRadius: sizeStyle.size / 2,
          }}
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={[styles.fallback, sizeStyle.container]}>
          <Text style={[styles.fallbackText, sizeStyle.text]}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
}

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  style?: ViewStyle;
}

export function AvatarGroup({
  children,
  max = 4,
  size = 'default',
  style,
}: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const visibleAvatars = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((child, index) => (
        <View
          key={index}
          style={[
            styles.groupItem,
            { marginLeft: index === 0 ? 0 : -8 },
            { zIndex: visibleAvatars.length - index },
          ]}
        >
          {child}
        </View>
      ))}
      {remainingCount > 0 && (
        <View
          style={[
            styles.groupItem,
            { marginLeft: -8 },
            { zIndex: 0 },
          ]}
        >
          <Avatar
            fallback={`+${remainingCount}`}
            size={size}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  fallbackText: {
    color: colors.foreground,
    fontWeight: '600',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    borderWidth: 2,
    borderColor: colors.background,
    borderRadius: 9999,
  },
});
