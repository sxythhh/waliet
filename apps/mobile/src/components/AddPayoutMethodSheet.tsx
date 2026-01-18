import React, { useState, useCallback } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

type PayoutMethodType = 'paypal' | 'crypto' | 'bank' | 'wise' | 'revolut' | 'tips';

interface PayoutMethodConfig {
  id: PayoutMethodType;
  title: string;
  description: string;
  icon: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    required?: boolean;
  }[];
}

const PAYOUT_METHODS: PayoutMethodConfig[] = [
  {
    id: 'paypal',
    title: 'PayPal',
    description: 'Receive payments via PayPal',
    icon: 'alpha-p-circle',
    fields: [
      {
        key: 'email',
        label: 'PayPal Email',
        placeholder: 'your@email.com',
        keyboardType: 'email-address',
        autoCapitalize: 'none',
        required: true,
      },
    ],
  },
  {
    id: 'crypto',
    title: 'Crypto Wallet',
    description: 'Receive USDC to your wallet',
    icon: 'bitcoin',
    fields: [
      {
        key: 'wallet_address',
        label: 'Wallet Address',
        placeholder: '0x... or your Solana address',
        autoCapitalize: 'none',
        required: true,
      },
      {
        key: 'network',
        label: 'Network',
        placeholder: 'e.g., Solana, Base, Ethereum',
        autoCapitalize: 'none',
        required: true,
      },
    ],
  },
  {
    id: 'bank',
    title: 'Bank Transfer',
    description: 'Direct deposit to your bank',
    icon: 'bank',
    fields: [
      {
        key: 'account_holder',
        label: 'Account Holder Name',
        placeholder: 'John Doe',
        required: true,
      },
      {
        key: 'account_number',
        label: 'Account Number',
        placeholder: '1234567890',
        keyboardType: 'numeric',
        required: true,
      },
      {
        key: 'routing_number',
        label: 'Routing Number',
        placeholder: '021000021',
        keyboardType: 'numeric',
        required: true,
      },
      {
        key: 'bank_name',
        label: 'Bank Name',
        placeholder: 'Bank of America',
        required: true,
      },
    ],
  },
  {
    id: 'wise',
    title: 'Wise',
    description: 'Transfer via Wise (TransferWise)',
    icon: 'swap-horizontal',
    fields: [
      {
        key: 'email',
        label: 'Wise Email',
        placeholder: 'your@email.com',
        keyboardType: 'email-address',
        autoCapitalize: 'none',
        required: true,
      },
    ],
  },
  {
    id: 'revolut',
    title: 'Revolut',
    description: 'Receive via Revolut tag or phone',
    icon: 'credit-card',
    fields: [
      {
        key: 'tag',
        label: 'Revolut Tag',
        placeholder: '@yourtag',
        autoCapitalize: 'none',
      },
      {
        key: 'phone',
        label: 'Or Phone Number',
        placeholder: '+1234567890',
        keyboardType: 'phone-pad',
      },
    ],
  },
  {
    id: 'tips',
    title: 'TIPS',
    description: 'Transfer via TIPS',
    icon: 'cash',
    fields: [
      {
        key: 'username',
        label: 'TIPS Username',
        placeholder: 'yourusername',
        autoCapitalize: 'none',
        required: true,
      },
    ],
  },
];

interface AddPayoutMethodSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddPayoutMethodSheet({
  visible,
  onClose,
  onSuccess,
}: AddPayoutMethodSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethodType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [setAsDefault, setSetAsDefault] = useState(true);

  const selectedConfig = PAYOUT_METHODS.find((m) => m.id === selectedMethod);

  const resetForm = useCallback(() => {
    setSelectedMethod(null);
    setFormData({});
    setSetAsDefault(true);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedMethod || !selectedConfig) {
        throw new Error('Invalid request');
      }

      // Validate required fields
      for (const field of selectedConfig.fields) {
        if (field.required && !formData[field.key]?.trim()) {
          throw new Error(`${field.label} is required`);
        }
      }

      // At least one field must be filled for non-required fields
      const hasAnyValue = Object.values(formData).some((v) => v?.trim());
      if (!hasAnyValue) {
        throw new Error('Please fill in at least one field');
      }

      // Get current wallet data
      const { data: walletData, error: fetchError } = await supabase
        .from('wallets')
        .select('payout_method, payout_details')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Parse existing payout methods
      let existingMethods: any[] = [];
      if (walletData?.payout_details) {
        if (Array.isArray(walletData.payout_details)) {
          existingMethods = walletData.payout_details;
        } else if (walletData.payout_method) {
          existingMethods = [{
            method: walletData.payout_method,
            details: walletData.payout_details,
            isDefault: true,
          }];
        }
      }

      // Create new method entry
      const newMethod = {
        method: selectedMethod,
        details: formData,
        isDefault: setAsDefault || existingMethods.length === 0,
      };

      // If setting as default, unset other defaults
      if (newMethod.isDefault) {
        existingMethods = existingMethods.map((m) => ({ ...m, isDefault: false }));
      }

      // Add new method
      const updatedMethods = [...existingMethods, newMethod];

      // Update wallet
      const updateData: any = {
        payout_details: updatedMethods,
      };

      // Set the default method as the primary
      if (newMethod.isDefault) {
        updateData.payout_method = selectedMethod;
      }

      // Upsert wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .upsert({
          user_id: user.id,
          ...updateData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-payout-methods'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert(
        'Payout Method Added',
        `Your ${selectedConfig?.title} has been added successfully.`,
        [{ text: 'OK', onPress: () => { onSuccess?.(); handleClose(); } }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const renderMethodSelection = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Add Payout Method</Text>
      <Text style={styles.subtitle}>Choose how you want to receive payments</Text>

      <View style={styles.methodGrid}>
        {PAYOUT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={styles.methodCard}
            onPress={() => setSelectedMethod(method.id)}
            activeOpacity={0.7}
          >
            <View style={styles.methodIconContainer}>
              <Icon name={method.icon} size={28} color={colors.foreground} />
            </View>
            <Text style={styles.methodTitle}>{method.title}</Text>
            <Text style={styles.methodDescription}>{method.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderForm = () => {
    if (!selectedConfig) return null;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <TouchableOpacity style={styles.backButton} onPress={resetForm}>
          <Icon name="chevron-left" size={24} color={colors.foreground} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.formHeader}>
          <View style={styles.formIconContainer}>
            <Icon name={selectedConfig.icon} size={32} color={colors.foreground} />
          </View>
          <Text style={styles.formTitle}>{selectedConfig.title}</Text>
          <Text style={styles.formSubtitle}>{selectedConfig.description}</Text>
        </View>

        <View style={styles.formFields}>
          {selectedConfig.fields.map((field) => (
            <View key={field.key} style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {field.required && <Text style={styles.requiredMark}> *</Text>}
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={formData[field.key] || ''}
                onChangeText={(value) => handleFieldChange(field.key, value)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.muted}
                keyboardType={field.keyboardType || 'default'}
                autoCapitalize={field.autoCapitalize || 'sentences'}
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        {/* Set as default toggle */}
        <TouchableOpacity
          style={styles.defaultToggle}
          onPress={() => setSetAsDefault(!setAsDefault)}
        >
          <Icon
            name={setAsDefault ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={setAsDefault ? colors.primary : colors.mutedForeground}
          />
          <Text style={styles.defaultToggleText}>Set as default payout method</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Icon name="check" size={20} color={colors.primaryForeground} />
              <Text style={styles.saveButtonText}>Save Payout Method</Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>
            {selectedMethod ? 'Add Details' : 'Add Payout Method'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {selectedMethod ? renderForm() : renderMethodSelection()}
        </ScrollView>
      </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },

  // Method selection
  methodGrid: {
    gap: spacing.sm,
  },
  methodCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  methodTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  methodDescription: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
  },

  // Form
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButtonText: {
    fontSize: typography.sizes.base,
    color: colors.foreground,
    marginLeft: spacing.xs,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  formIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  formTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  formFields: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  requiredMark: {
    color: colors.destructive,
  },
  fieldInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.foreground,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  defaultToggleText: {
    fontSize: typography.sizes.sm,
    color: colors.foreground,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primaryForeground,
  },
});
