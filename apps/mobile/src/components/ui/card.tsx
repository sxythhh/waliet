import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';

export type CardVariant = 'default' | 'bordered' | 'ghost' | 'elevated' | 'outlined';

export interface CardProps {
  children?: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: colors.card,
  },
  bordered: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  elevated: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
};

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.card, variantStyles[variant], style]}>
      {children}
    </View>
  );
}

export type CardHeaderSpacing = 'none' | 'sm' | 'default' | 'lg';
export type CardHeaderPadding = 'none' | 'sm' | 'default' | 'lg';

export interface CardHeaderProps {
  children?: React.ReactNode;
  spacing?: CardHeaderSpacing;
  padding?: CardHeaderPadding;
  style?: StyleProp<ViewStyle>;
}

const spacingStyles: Record<CardHeaderSpacing, ViewStyle> = {
  none: { gap: 0 },
  sm: { gap: 4 },
  default: { gap: 6 },
  lg: { gap: 8 },
};

const paddingStyles: Record<CardHeaderPadding, ViewStyle> = {
  none: { padding: 0 },
  sm: { padding: 12 },
  default: { padding: 24 },
  lg: { padding: 32 },
};

export function CardHeader({
  children,
  spacing = 'default',
  padding = 'default',
  style,
}: CardHeaderProps) {
  return (
    <View style={[styles.header, spacingStyles[spacing], paddingStyles[padding], style]}>
      {children}
    </View>
  );
}

export interface CardTitleProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function CardTitle({ children, style }: CardTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export interface CardDescriptionProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  return <Text style={[styles.description, style]}>{children}</Text>;
}

export type CardContentPadding = 'none' | 'sm' | 'default' | 'lg';

export interface CardContentProps {
  children?: React.ReactNode;
  padding?: CardContentPadding;
  style?: StyleProp<ViewStyle>;
}

const contentPaddingStyles: Record<CardContentPadding, ViewStyle> = {
  none: { padding: 0 },
  sm: { paddingHorizontal: 12, paddingBottom: 12 },
  default: { paddingHorizontal: 24, paddingBottom: 24 },
  lg: { paddingHorizontal: 32, paddingBottom: 32 },
};

export function CardContent({
  children,
  padding = 'default',
  style,
}: CardContentProps) {
  return (
    <View style={[contentPaddingStyles[padding], style]}>
      {children}
    </View>
  );
}

export type CardFooterJustify = 'start' | 'center' | 'end' | 'between';

export interface CardFooterProps {
  children?: React.ReactNode;
  padding?: CardContentPadding;
  justify?: CardFooterJustify;
  style?: StyleProp<ViewStyle>;
}

const justifyStyles: Record<CardFooterJustify, ViewStyle> = {
  start: { justifyContent: 'flex-start' },
  center: { justifyContent: 'center' },
  end: { justifyContent: 'flex-end' },
  between: { justifyContent: 'space-between' },
};

export function CardFooter({
  children,
  padding = 'default',
  justify = 'start',
  style,
}: CardFooterProps) {
  return (
    <View
      style={[
        styles.footer,
        contentPaddingStyles[padding],
        justifyStyles[justify],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
