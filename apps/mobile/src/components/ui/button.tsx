import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'success';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg';

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: {
      backgroundColor: colors.primary,
      borderTopWidth: 1,
      borderTopColor: colors.primaryGlow,
    },
    text: {
      color: '#fff',
    },
  },
  destructive: {
    container: {
      backgroundColor: colors.destructive,
    },
    text: {
      color: '#fff',
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
  secondary: {
    container: {
      backgroundColor: colors.secondary,
    },
    text: {
      color: colors.foreground,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: colors.foreground,
    },
  },
  link: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  },
  success: {
    container: {
      backgroundColor: colors.success,
    },
    text: {
      color: '#fff',
    },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: {
      height: 40,
      paddingHorizontal: 16,
    },
    text: {
      fontSize: 14,
    },
  },
  sm: {
    container: {
      height: 40, // Min 40px for touch targets
      paddingHorizontal: 12,
    },
    text: {
      fontSize: 14,
    },
  },
  lg: {
    container: {
      height: 44,
      paddingHorizontal: 32,
    },
    text: {
      fontSize: 16,
    },
  },
  xl: {
    container: {
      height: 48,
      paddingHorizontal: 40,
    },
    text: {
      fontSize: 16,
    },
  },
  icon: {
    container: {
      height: 44,
      width: 44,
      paddingHorizontal: 0,
    },
    text: {
      fontSize: 14,
    },
  },
  'icon-sm': {
    container: {
      height: 36,
      width: 36,
      paddingHorizontal: 0,
    },
    text: {
      fontSize: 14,
    },
  },
  'icon-lg': {
    container: {
      height: 48,
      width: 48,
      paddingHorizontal: 0,
    },
    text: {
      fontSize: 14,
    },
  },
};

export function Button({
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyle.text.color}
          size="small"
        />
      ) : (
        <>
          {leftIcon}
          {typeof children === 'string' ? (
            <Text
              style={[
                styles.text,
                variantStyle.text,
                sizeStyle.text,
                leftIcon ? styles.textWithLeftIcon : undefined,
                rightIcon ? styles.textWithRightIcon : undefined,
                textStyle,
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontWeight: '500',
  },
  textWithLeftIcon: {
    marginLeft: 4,
  },
  textWithRightIcon: {
    marginRight: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});
