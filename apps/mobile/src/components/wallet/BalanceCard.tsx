import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LiquidGlassView } from '@callstack/liquid-glass';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { Button } from '../ui';

export interface BalanceCardProps {
  balance: number; // in cents
  pendingBalance?: number;
  clearingBalance?: number;
  onRequestPayout?: () => void;
  style?: ViewStyle;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function BalanceCard({
  balance,
  pendingBalance = 0,
  clearingBalance = 0,
  onRequestPayout,
  style,
}: BalanceCardProps) {
  const canRequestPayout = balance >= 1000; // $10 minimum

  return (
    <View style={[styles.container, style]}>
      <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" />
      <View style={styles.content}>
        {/* Main Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
        </View>

        {/* Sub balances */}
        <View style={styles.subBalances}>
          <View style={styles.subBalanceItem}>
            <Icon name="clock-outline" size={14} color={colors.warning} />
            <Text style={styles.subBalanceLabel}>Pending</Text>
            <Text style={[styles.subBalanceValue, { color: colors.warning }]}>
              {formatCurrency(pendingBalance)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.subBalanceItem}>
            <Icon name="timer-sand" size={14} color={colors.primary} />
            <Text style={styles.subBalanceLabel}>Clearing</Text>
            <Text style={[styles.subBalanceValue, { color: colors.primary }]}>
              {formatCurrency(clearingBalance)}
            </Text>
          </View>
        </View>

        {/* Payout Button */}
        {onRequestPayout && (
          <Button
            variant={canRequestPayout ? 'default' : 'secondary'}
            size="default"
            onPress={onRequestPayout}
            disabled={!canRequestPayout}
            style={styles.payoutButton}
          >
            {canRequestPayout ? 'Request Payout' : 'Min $10.00 required'}
          </Button>
        )}
      </View>
    </View>
  );
}

// Compact balance display for headers
export interface CompactBalanceProps {
  balance: number;
  style?: ViewStyle;
}

export function CompactBalance({ balance, style }: CompactBalanceProps) {
  return (
    <View style={[styles.compactContainer, style]}>
      <Icon name="wallet-outline" size={16} color={colors.success} />
      <Text style={styles.compactValue}>{formatCurrency(balance)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    padding: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -1,
  },
  subBalances: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  subBalanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  subBalanceLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  subBalanceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  payoutButton: {
    width: '100%',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  compactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
});
