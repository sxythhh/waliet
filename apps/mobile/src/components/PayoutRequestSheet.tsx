import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { config } from '../config';
import { AddPayoutMethodSheet } from './AddPayoutMethodSheet';

interface PayoutMethod {
  method: string;
  details: Record<string, string>;
  isDefault?: boolean;
}

interface PayoutRequestSheetProps {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
}

const PAYOUT_METHOD_CONFIG: Record<string, { icon: string; label: string; minAmount: number; fee: string }> = {
  paypal: { icon: 'alpha-p-circle', label: 'PayPal', minAmount: 20, fee: 'No fees (24h wait)' },
  crypto: { icon: 'bitcoin', label: 'Crypto', minAmount: 20, fee: '$1 + 0.75%' },
  bank: { icon: 'bank', label: 'Bank Transfer', minAmount: 250, fee: '$1 + 0.75%' },
  wise: { icon: 'swap-horizontal', label: 'Wise', minAmount: 20, fee: '$1 + 0.75%' },
  revolut: { icon: 'credit-card', label: 'Revolut', minAmount: 20, fee: '$1 + 0.75%' },
  tips: { icon: 'cash', label: 'TIPS', minAmount: 20, fee: '$1 + 0.75%' },
};

function formatPayoutDetails(method: string, details: Record<string, string>): string {
  switch (method) {
    case 'paypal':
      return details.email || 'Not configured';
    case 'crypto':
      return details.wallet_address
        ? `${details.wallet_address.slice(0, 8)}...${details.wallet_address.slice(-6)}`
        : 'Not configured';
    case 'bank':
      return details.account_number
        ? `****${details.account_number.slice(-4)}`
        : 'Not configured';
    case 'wise':
      return details.email || 'Not configured';
    case 'revolut':
      return details.tag || details.phone || 'Not configured';
    case 'tips':
      return details.username || 'Not configured';
    default:
      return 'Not configured';
  }
}

export function PayoutRequestSheet({ visible, onClose, availableBalance }: PayoutRequestSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [selectedMethodIndex, setSelectedMethodIndex] = useState<number | null>(null);
  const [showAddPayoutMethod, setShowAddPayoutMethod] = useState(false);

  // Fetch wallet with payout methods
  const { data: walletData, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet-payout-methods', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('wallets')
        .select('balance, payout_method, payout_details')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && visible,
  });

  // Fetch pending withdrawals
  const { data: pendingWithdrawals } = useQuery({
    queryKey: ['pending-withdrawals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payout_requests')
        .select('id, amount, status, payout_method')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_transit']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && visible,
  });

  // Parse payout methods from wallet
  const payoutMethods: PayoutMethod[] = React.useMemo(() => {
    if (!walletData?.payout_details) return [];

    // payout_details can be an array or a single object
    const details = walletData.payout_details;
    if (Array.isArray(details)) {
      return details as unknown as PayoutMethod[];
    }
    // Single method in legacy format
    if (walletData.payout_method && typeof details === 'object') {
      return [{ method: walletData.payout_method, details: details as Record<string, string>, isDefault: true }];
    }
    return [];
  }, [walletData]);

  // Select default method on load
  useEffect(() => {
    if (payoutMethods.length > 0 && selectedMethodIndex === null) {
      const defaultIndex = payoutMethods.findIndex(m => m.isDefault);
      setSelectedMethodIndex(defaultIndex >= 0 ? defaultIndex : 0);
    }
  }, [payoutMethods, selectedMethodIndex]);

  // Request withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || selectedMethodIndex === null) {
        throw new Error('Invalid request');
      }

      const selectedMethod = payoutMethods[selectedMethodIndex];
      const amountCents = Math.round(parseFloat(amount) * 100);

      // Get session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      // Call the edge function
      const response = await fetch(
        `${config.supabase.url}/functions/v1/request-withdrawal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            amount: amountCents,
            payout_method: selectedMethod.method,
            payout_details: selectedMethod.details,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request withdrawal');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
      Alert.alert(
        'Payout Requested',
        `Your withdrawal of $${amount} has been submitted and is being processed.`,
        [{ text: 'OK', onPress: onClose }]
      );
      setAmount('');
    },
    onError: (error: Error) => {
      Alert.alert('Request Failed', error.message);
    },
  });

  const handleSubmit = useCallback(() => {
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (amountNum > availableBalance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }

    if (selectedMethodIndex === null || !payoutMethods[selectedMethodIndex]) {
      Alert.alert('No Payout Method', 'Please select a payout method.');
      return;
    }

    const selectedMethod = payoutMethods[selectedMethodIndex];
    const config = PAYOUT_METHOD_CONFIG[selectedMethod.method];
    const minAmount = config?.minAmount || 20;

    if (amountNum < minAmount) {
      Alert.alert('Minimum Not Met', `The minimum withdrawal for ${config?.label || selectedMethod.method} is $${minAmount}.`);
      return;
    }

    withdrawMutation.mutate();
  }, [amount, availableBalance, selectedMethodIndex, payoutMethods, withdrawMutation]);

  const handleSetupPayoutMethod = useCallback(() => {
    setShowAddPayoutMethod(true);
  }, []);

  const handlePayoutMethodAdded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallet-payout-methods'] });
    setShowAddPayoutMethod(false);
  }, [queryClient]);

  const hasPendingWithdrawal = pendingWithdrawals && pendingWithdrawals.length > 0;
  const hasPayoutMethods = payoutMethods.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Request Payout</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loadingWallet ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : hasPendingWithdrawal ? (
            // Pending withdrawal message
            <View style={styles.infoCard}>
              <Icon name="clock-outline" size={48} color={colors.warning} />
              <Text style={styles.infoTitle}>Withdrawal Pending</Text>
              <Text style={styles.infoText}>
                You have a pending withdrawal of ${((pendingWithdrawals[0]?.amount || 0) / 100).toFixed(2)}.
                Please wait for it to be processed before requesting another.
              </Text>
            </View>
          ) : !hasPayoutMethods ? (
            // No payout methods configured
            <View style={styles.infoCard}>
              <Icon name="bank-off" size={48} color={colors.mutedForeground} />
              <Text style={styles.infoTitle}>No Payout Method</Text>
              <Text style={styles.infoText}>
                You need to set up a payout method before you can request withdrawals.
              </Text>
              <TouchableOpacity style={styles.setupButton} onPress={handleSetupPayoutMethod}>
                <Icon name="cog" size={18} color={colors.primaryForeground} />
                <Text style={styles.setupButtonText}>Set Up in Web App</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Available Balance */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>${availableBalance.toFixed(2)}</Text>
              </View>

              {/* Amount Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Amount to Withdraw</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  style={styles.maxButton}
                  onPress={() => setAmount(availableBalance.toFixed(2))}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>

              {/* Payout Method Selection */}
              <View style={styles.methodSection}>
                <Text style={styles.inputLabel}>Payout Method</Text>
                {payoutMethods.map((method, index) => {
                  const config = PAYOUT_METHOD_CONFIG[method.method] || {
                    icon: 'cash',
                    label: method.method,
                    minAmount: 20,
                    fee: 'Standard fees',
                  };
                  const isSelected = selectedMethodIndex === index;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                      onPress={() => setSelectedMethodIndex(index)}
                    >
                      <View style={styles.methodLeft}>
                        <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
                          <Icon name={config.icon} size={24} color={isSelected ? colors.primary : colors.mutedForeground} />
                        </View>
                        <View style={styles.methodInfo}>
                          <Text style={[styles.methodName, isSelected && styles.methodNameSelected]}>
                            {config.label}
                            {method.isDefault && <Text style={styles.defaultBadge}> (Default)</Text>}
                          </Text>
                          <Text style={styles.methodDetails}>
                            {formatPayoutDetails(method.method, method.details)}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Icon name="check-circle" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={styles.addMethodButton} onPress={handleSetupPayoutMethod}>
                  <Icon name="plus" size={18} color={colors.primary} />
                  <Text style={styles.addMethodText}>Manage Payout Methods</Text>
                </TouchableOpacity>
              </View>

              {/* Fee Info */}
              {selectedMethodIndex !== null && payoutMethods[selectedMethodIndex] && (
                <View style={styles.feeInfo}>
                  <Icon name="information-outline" size={16} color={colors.mutedForeground} />
                  <Text style={styles.feeText}>
                    Processing fee: {PAYOUT_METHOD_CONFIG[payoutMethods[selectedMethodIndex].method]?.fee || 'Standard fees'}
                  </Text>
                </View>
              )}

              {/* Minimum Info */}
              {selectedMethodIndex !== null && payoutMethods[selectedMethodIndex] && (
                <View style={styles.minInfo}>
                  <Text style={styles.minText}>
                    Minimum withdrawal: ${PAYOUT_METHOD_CONFIG[payoutMethods[selectedMethodIndex].method]?.minAmount || 20}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Submit Button */}
        {hasPayoutMethods && !hasPendingWithdrawal && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, withdrawMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Icon name="bank-transfer-out" size={20} color={colors.primaryForeground} />
                  <Text style={styles.submitButtonText}>Request Payout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Add Payout Method Sheet */}
      <AddPayoutMethodSheet
        visible={showAddPayoutMethod}
        onClose={() => setShowAddPayoutMethod(false)}
        onSuccess={handlePayoutMethodAdded}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  infoCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  setupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.foreground,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    paddingVertical: 16,
  },
  maxButton: {
    position: 'absolute',
    right: 16,
    top: 32,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  methodSection: {
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodIconSelected: {
    backgroundColor: `${colors.primary}30`,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  methodNameSelected: {
    color: colors.primary,
  },
  defaultBadge: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '400',
  },
  methodDetails: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  addMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  feeText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  minInfo: {
    marginBottom: 16,
  },
  minText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
});
