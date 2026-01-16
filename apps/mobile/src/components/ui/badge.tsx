import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'live'
  | 'pending'
  | 'clearing'
  | 'paid';

export type BadgeSize = 'sm' | 'default' | 'lg';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: {
      backgroundColor: colors.primary,
    },
    text: {
      color: '#fff',
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.secondary,
    },
    text: {
      color: colors.foreground,
    },
  },
  destructive: {
    container: {
      backgroundColor: colors.destructiveMuted,
    },
    text: {
      color: colors.destructive,
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      color: colors.foreground,
    },
  },
  success: {
    container: {
      backgroundColor: colors.successMuted,
    },
    text: {
      color: colors.success,
    },
  },
  warning: {
    container: {
      backgroundColor: colors.warningMuted,
    },
    text: {
      color: colors.warning,
    },
  },
  live: {
    container: {
      backgroundColor: colors.successMuted,
    },
    text: {
      color: colors.status.live,
    },
  },
  pending: {
    container: {
      backgroundColor: colors.warningMuted,
    },
    text: {
      color: colors.status.pending,
    },
  },
  clearing: {
    container: {
      backgroundColor: colors.primaryMuted,
    },
    text: {
      color: colors.status.clearing,
    },
  },
  paid: {
    container: {
      backgroundColor: colors.successMuted,
    },
    text: {
      color: colors.status.paid,
    },
  },
};

const sizeStyles: Record<BadgeSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    text: {
      fontSize: 10,
    },
  },
  default: {
    container: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    text: {
      fontSize: 12,
    },
  },
  lg: {
    container: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    text: {
      fontSize: 14,
    },
  },
};

export function Badge({
  children,
  variant = 'default',
  size = 'default',
  style,
  textStyle,
  dot = false,
}: BadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        variantStyle.container,
        sizeStyle.container,
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: variantStyle.text.color },
          ]}
        />
      )}
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            variantStyle.text,
            sizeStyle.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    gap: 4,
  },
  text: {
    fontWeight: '600',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
