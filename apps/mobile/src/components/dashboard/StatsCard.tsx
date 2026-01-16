import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Card } from '../ui';

export interface StatsCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string | number;
  valueColor?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  style?: ViewStyle;
}

export function StatsCard({
  icon,
  iconColor = colors.primary,
  label,
  value,
  valueColor = colors.foreground,
  subtitle,
  trend,
  style,
}: StatsCardProps) {
  return (
    <Card variant="bordered" style={[styles.card, style]}>
      <Icon name={icon} size={20} color={iconColor} style={styles.icon} />
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {trend && (
        <View style={styles.trendContainer}>
          <Icon
            name={trend.isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={trend.isPositive ? colors.success : colors.destructive}
          />
          <Text
            style={[
              styles.trendText,
              { color: trend.isPositive ? colors.success : colors.destructive },
            ]}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </Text>
        </View>
      )}
    </Card>
  );
}

export interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  style?: ViewStyle;
}

export function StatsGrid({ children, columns = 3, style }: StatsGridProps) {
  return (
    <View style={[styles.grid, { gap: columns === 2 ? 12 : 8 }, style]}>
      {React.Children.map(children, (child, index) => (
        <View style={{ flex: 1, minWidth: `${100 / columns - 5}%` as any }}>
          {child}
        </View>
      ))}
    </View>
  );
}

// Compact inline stat for rows
export interface InlineStatProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string | number;
  valueColor?: string;
}

export function InlineStat({
  icon,
  iconColor = colors.mutedForeground,
  label,
  value,
  valueColor = colors.foreground,
}: InlineStatProps) {
  return (
    <View style={styles.inlineContainer}>
      <View style={styles.inlineLabelRow}>
        <Icon name={icon} size={14} color={iconColor} />
        <Text style={styles.inlineLabel}>{label}</Text>
      </View>
      <Text style={[styles.inlineValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Inline stat styles
  inlineContainer: {
    flex: 1,
  },
  inlineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  inlineLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlineValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
