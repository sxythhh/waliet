import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Badge } from '../ui';

export type TransactionStatus =
  | 'pending'
  | 'clearing'
  | 'paid'
  | 'clawed_back'
  | 'withdrawn';

export type TransactionType = 'earning' | 'payout' | 'bonus' | 'adjustment';

export interface Transaction {
  id: string;
  amount: number; // in cents
  status: TransactionStatus;
  type: TransactionType;
  description: string;
  source_title?: string;
  created_at: string;
}

export interface TransactionRowProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  style?: ViewStyle;
}

function formatCurrency(cents: number): string {
  const isNegative = cents < 0;
  const amount = Math.abs(cents) / 100;
  return `${isNegative ? '-' : '+'}$${amount.toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusConfig(status: TransactionStatus): {
  variant: 'success' | 'warning' | 'destructive' | 'default' | 'clearing';
  label: string;
  icon: string;
} {
  switch (status) {
    case 'paid':
      return { variant: 'success', label: 'Paid', icon: 'check-circle' };
    case 'pending':
      return { variant: 'warning', label: 'Pending', icon: 'clock-outline' };
    case 'clearing':
      return { variant: 'clearing', label: 'Clearing', icon: 'timer-sand' };
    case 'clawed_back':
      return { variant: 'destructive', label: 'Clawed Back', icon: 'undo' };
    case 'withdrawn':
      return { variant: 'default', label: 'Withdrawn', icon: 'bank-transfer-out' };
    default:
      return { variant: 'default', label: status, icon: 'help-circle-outline' };
  }
}

function getTypeIcon(type: TransactionType): string {
  switch (type) {
    case 'earning':
      return 'video-outline';
    case 'payout':
      return 'bank-transfer-out';
    case 'bonus':
      return 'gift-outline';
    case 'adjustment':
      return 'tune';
    default:
      return 'cash';
  }
}

export function TransactionRow({
  transaction,
  onPress,
  style,
}: TransactionRowProps) {
  const statusConfig = getStatusConfig(transaction.status);
  const isPositive = transaction.amount > 0;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(transaction)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isPositive
              ? colors.successMuted
              : colors.destructiveMuted,
          },
        ]}
      >
        <Icon
          name={getTypeIcon(transaction.type)}
          size={20}
          color={isPositive ? colors.success : colors.destructive}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text
            style={[
              styles.amount,
              { color: isPositive ? colors.success : colors.destructive },
            ]}
          >
            {formatCurrency(transaction.amount)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.date}>{formatDate(transaction.created_at)}</Text>
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </View>
        {transaction.source_title && (
          <Text style={styles.sourceTitle} numberOfLines={1}>
            {transaction.source_title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Section header for grouping transactions
export interface TransactionSectionHeaderProps {
  title: string;
  total?: number;
}

export function TransactionSectionHeader({
  title,
  total,
}: TransactionSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {total !== undefined && (
        <Text
          style={[
            styles.sectionTotal,
            { color: total >= 0 ? colors.success : colors.destructive },
          ]}
        >
          {formatCurrency(total)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  sourceTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
});
