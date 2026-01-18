import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  TextInput,
  Clipboard,
  Alert,
  Linking,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  PaymentMethod,
  CryptoNetwork,
  PAYMENT_METHODS,
  CRYPTO_NETWORKS,
  WIRE_DETAILS,
} from './types';
import { useDepositFlow, calculateFees } from './useDepositFlow';

interface AddFundsSheetProps {
  visible: boolean;
  onClose: () => void;
  brandId: string;
  personalBalance?: number;
  onSuccess?: () => void;
}

export function AddFundsSheet({
  visible,
  onClose,
  brandId,
  personalBalance = 0,
  onSuccess,
}: AddFundsSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const flow = useDepositFlow();
  const [amountInput, setAmountInput] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);

  // Reset flow when sheet opens/closes
  useEffect(() => {
    if (!visible) {
      flow.reset();
      setAmountInput('');
      setCopied(null);
      setShowWebView(false);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    flow.reset();
    onClose();
  }, [onClose, flow]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await Clipboard.setString(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Generate crypto deposit address
  const generateDepositAddress = useCallback(async (network: CryptoNetwork) => {
    if (!user?.id || !brandId) return;

    flow.setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-deposit-address', {
        body: { brand_id: brandId, network },
      });

      if (error) throw error;
      if (data?.address) {
        flow.setDepositAddress(data.address);
        flow.nextStep();
      } else {
        throw new Error('No address returned');
      }
    } catch (err: any) {
      flow.setError(err.message || 'Failed to generate address');
      Alert.alert('Error', err.message || 'Failed to generate deposit address');
    }
  }, [user?.id, brandId, flow]);

  // Create card checkout
  const createCardCheckout = useCallback(async () => {
    if (!user?.id || !brandId || flow.amount <= 0) return;

    flow.setLoading(true);
    try {
      const returnUrl = 'virality://wallet/deposit-success';

      const { data, error } = await supabase.functions.invoke('create-brand-wallet-topup', {
        body: {
          brand_id: brandId,
          amount: flow.amount,
          return_url: returnUrl,
        },
      });

      if (error) throw error;
      if (data?.checkout_url) {
        flow.setCheckoutUrl(data.checkout_url, data.transaction_id);
        setShowWebView(true);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      flow.setError(err.message || 'Failed to create checkout');
      Alert.alert('Error', err.message || 'Failed to create checkout');
    }
  }, [user?.id, brandId, flow]);

  // Handle personal wallet transfer
  const handlePersonalTransfer = useCallback(async () => {
    if (!user?.id || !brandId || flow.amount <= 0) return;

    flow.setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('personal-to-brand-transfer', {
        body: {
          brand_id: brandId,
          amount: flow.amount,
        },
      });

      if (error) throw error;

      flow.success();
      Alert.alert('Success', `$${flow.amount.toFixed(2)} transferred to brand wallet`, [
        { text: 'OK', onPress: () => { onSuccess?.(); handleClose(); } },
      ]);
    } catch (err: any) {
      flow.setError(err.message || 'Transfer failed');
      Alert.alert('Error', err.message || 'Transfer failed');
    }
  }, [user?.id, brandId, flow, onSuccess, handleClose]);

  // Handle network selection
  const handleNetworkSelect = useCallback((network: CryptoNetwork) => {
    flow.setNetwork(network);
    generateDepositAddress(network);
  }, [flow, generateDepositAddress]);

  // Handle amount continue
  const handleAmountContinue = useCallback(() => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (flow.method === 'personal' && amount > personalBalance) {
      Alert.alert('Insufficient Balance', 'Amount exceeds your personal wallet balance');
      return;
    }
    flow.setAmount(amount);
    flow.nextStep();
  }, [amountInput, flow, personalBalance]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (flow.method === 'card') {
      createCardCheckout();
    } else if (flow.method === 'personal') {
      handlePersonalTransfer();
    }
  }, [flow.method, createCardCheckout, handlePersonalTransfer]);

  // Handle WebView navigation state change
  const handleWebViewNavigationStateChange = useCallback((navState: any) => {
    const { url } = navState;
    if (url?.includes('deposit-success') || url?.includes('checkout_status=success')) {
      setShowWebView(false);
      flow.success();
      Alert.alert('Success', 'Payment completed successfully!', [
        { text: 'OK', onPress: () => { onSuccess?.(); handleClose(); } },
      ]);
    }
  }, [flow, onSuccess, handleClose]);

  // Render method selection
  const renderMethodSelection = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Add Funds</Text>
      <Text style={styles.sectionSubtitle}>Choose a payment method</Text>

      <View style={styles.methodGrid}>
        {PAYMENT_METHODS.map((method) => {
          const isDisabled = method.id === 'personal' && personalBalance <= 0;

          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, isDisabled && styles.methodCardDisabled]}
              onPress={() => !isDisabled && flow.selectMethod(method.id)}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={styles.methodIconContainer}>
                <Icon name={method.icon} size={24} color={isDisabled ? colors.muted : colors.foreground} />
              </View>
              <Text style={[styles.methodTitle, isDisabled && styles.methodTitleDisabled]}>
                {method.title}
              </Text>
              <Text style={[styles.methodDescription, isDisabled && styles.methodDescriptionDisabled]}>
                {method.description}
              </Text>
              <View style={styles.methodFeeContainer}>
                <Text style={[styles.methodFee, isDisabled && styles.methodFeeDisabled]}>
                  {method.feeLabel}
                </Text>
                {method.estimatedTime && (
                  <Text style={styles.methodTime}>{method.estimatedTime}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Render network selection (crypto)
  const renderNetworkSelection = () => (
    <View style={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={flow.prevStep}>
        <Icon name="chevron-left" size={24} color={colors.foreground} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Select Network</Text>
      <Text style={styles.sectionSubtitle}>
        All deposits are in USDC. Select the network you'll be sending from.
      </Text>

      <View style={styles.networkGrid}>
        {CRYPTO_NETWORKS.map((network) => (
          <TouchableOpacity
            key={network.id}
            style={[
              styles.networkCard,
              flow.network === network.id && styles.networkCardSelected,
              flow.isLoading && flow.network === network.id && styles.networkCardLoading,
            ]}
            onPress={() => handleNetworkSelect(network.id)}
            disabled={flow.isLoading}
            activeOpacity={0.7}
          >
            {flow.isLoading && flow.network === network.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={styles.networkIcon}>
                <Text style={styles.networkSymbol}>{network.symbol.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.networkInfo}>
              <Text style={styles.networkName}>{network.name}</Text>
              <Text style={styles.networkSpeed}>{network.speed} confirmation</Text>
            </View>
            {network.isPopular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Popular</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.warningText}>
        Make sure to send only USDC on the selected network
      </Text>
    </View>
  );

  // Render crypto address display
  const renderCryptoAddress = () => {
    const networkName = CRYPTO_NETWORKS.find(n => n.id === flow.network)?.name || 'Unknown';

    return (
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={flow.prevStep}>
          <Icon name="chevron-left" size={24} color={colors.foreground} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Deposit Address</Text>
        <Text style={styles.sectionSubtitle}>
          Send USDC on {networkName} to this address
        </Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          {flow.depositAddress ? (
            <View style={styles.qrWrapper}>
              <QRCode
                value={flow.depositAddress}
                size={160}
                backgroundColor="white"
                color="black"
              />
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Icon name="qrcode" size={64} color={colors.muted} />
            </View>
          )}
        </View>

        {/* Address Copy Box */}
        <TouchableOpacity
          style={[styles.copyBox, copied === 'address' && styles.copyBoxCopied]}
          onPress={() => flow.depositAddress && handleCopy(flow.depositAddress, 'address')}
        >
          <Text style={styles.addressText} numberOfLines={2}>
            {flow.depositAddress || 'Loading address...'}
          </Text>
          <Icon
            name={copied === 'address' ? 'check' : 'content-copy'}
            size={20}
            color={copied === 'address' ? colors.success : colors.mutedForeground}
          />
        </TouchableOpacity>

        {copied === 'address' && (
          <Text style={styles.copiedText}>Copied to clipboard</Text>
        )}

        <Text style={styles.warningText}>
          Only send USDC on {networkName}. Other tokens or networks will be lost.
        </Text>
      </View>
    );
  };

  // Render amount input (card/personal)
  const renderAmountInput = () => {
    const isPersonal = flow.method === 'personal';

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <TouchableOpacity style={styles.backButton} onPress={flow.prevStep}>
          <Icon name="chevron-left" size={24} color={colors.foreground} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Enter Amount</Text>
        {isPersonal && (
          <Text style={styles.sectionSubtitle}>
            Available balance: ${personalBalance.toFixed(2)}
          </Text>
        )}

        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            autoFocus
          />
        </View>

        {/* Quick amounts */}
        <View style={styles.quickAmounts}>
          {[50, 100, 250, 500].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAmountButton}
              onPress={() => setAmountInput(amount.toString())}
            >
              <Text style={styles.quickAmountText}>${amount}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !amountInput && styles.continueButtonDisabled]}
          onPress={handleAmountContinue}
          disabled={!amountInput}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  };

  // Render confirmation (card/personal)
  const renderConfirmation = () => {
    const fees = flow.fees;
    const methodTitle = flow.method === 'card' ? 'Card Payment' : 'Personal Transfer';

    return (
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={flow.prevStep}>
          <Icon name="chevron-left" size={24} color={colors.foreground} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Confirm {methodTitle}</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deposit Amount</Text>
            <Text style={styles.summaryValue}>${flow.amount.toFixed(2)}</Text>
          </View>
          {fees && fees.processingFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Processing Fee ({fees.feePercentage})</Text>
              <Text style={styles.summaryValue}>${fees.processingFee.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Total Charged</Text>
            <Text style={styles.summaryValueBold}>
              ${fees ? fees.totalCharged.toFixed(2) : flow.amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>You Receive</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              ${fees ? fees.youReceive.toFixed(2) : flow.amount.toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, flow.isLoading && styles.confirmButtonLoading]}
          onPress={handleConfirm}
          disabled={flow.isLoading}
        >
          {flow.isLoading ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Text style={styles.confirmButtonText}>
              {flow.method === 'card' ? 'Pay with Card' : 'Transfer Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render wire transfer details
  const renderWireDetails = () => (
    <View style={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={flow.prevStep}>
        <Icon name="chevron-left" size={24} color={colors.foreground} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Wire Transfer Details</Text>
      <Text style={styles.sectionSubtitle}>Processing time: 1-3 business days</Text>

      <View style={styles.wireDetailsCard}>
        {[
          { label: 'Account Name', value: WIRE_DETAILS.accountName, copyable: true },
          { label: 'Account Number', value: WIRE_DETAILS.accountNumber, copyable: true },
          { label: 'Routing Number (ACH)', value: WIRE_DETAILS.routingNumber, copyable: true },
          { label: 'Bank Name', value: WIRE_DETAILS.bankName },
          { label: 'Bank Address', value: WIRE_DETAILS.bankAddress },
        ].map((item) => (
          <View key={item.label} style={styles.wireDetailRow}>
            <View style={styles.wireDetailContent}>
              <Text style={styles.wireDetailLabel}>{item.label}</Text>
              <Text style={[styles.wireDetailValue, item.copyable && styles.wireDetailValueMono]}>
                {item.value}
              </Text>
            </View>
            {item.copyable && (
              <TouchableOpacity
                style={styles.wireCopyButton}
                onPress={() => item.value && handleCopy(item.value, item.label)}
              >
                <Icon
                  name={copied === item.label ? 'check' : 'content-copy'}
                  size={18}
                  color={copied === item.label ? colors.success : colors.mutedForeground}
                />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.copyAllButton}
        onPress={() => {
          const allDetails = `Account Name: ${WIRE_DETAILS.accountName}\nAccount Number: ${WIRE_DETAILS.accountNumber}\nRouting Number: ${WIRE_DETAILS.routingNumber}\nBank Name: ${WIRE_DETAILS.bankName}\nBank Address: ${WIRE_DETAILS.bankAddress}`;
          handleCopy(allDetails, 'all');
        }}
      >
        <Icon
          name={copied === 'all' ? 'check' : 'content-copy'}
          size={16}
          color={copied === 'all' ? colors.success : colors.mutedForeground}
        />
        <Text style={styles.copyAllText}>
          {copied === 'all' ? 'Copied all details' : 'Copy all details'}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Icon name="information" size={18} color={colors.mutedForeground} />
        <Text style={styles.infoText}>
          Wire from a bank account in your company name. Minimum deposit: $100.
        </Text>
      </View>
    </View>
  );

  // Render WebView for card payment
  if (showWebView && flow.checkoutUrl) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.webViewContainer, { paddingTop: insets.top }]}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Icon name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Complete Payment</Text>
            <View style={{ width: 24 }} />
          </View>
          <WebView
            source={{ uri: flow.checkoutUrl }}
            onNavigationStateChange={handleWebViewNavigationStateChange}
            style={styles.webView}
          />
        </View>
      </Modal>
    );
  }

  // Determine which step to render
  const renderStep = () => {
    if (!flow.method || flow.step === 'idle') {
      return renderMethodSelection();
    }

    switch (flow.step) {
      case 'network':
        return renderNetworkSelection();
      case 'address':
        if (flow.method === 'crypto') {
          return renderCryptoAddress();
        }
        return renderWireDetails();
      case 'amount':
        return renderAmountInput();
      case 'confirm':
        return renderConfirmation();
      default:
        return renderMethodSelection();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: typography.sizes.base,
    color: colors.foreground,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },

  // Method selection
  methodGrid: {
    gap: spacing.sm,
  },
  methodCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodCardDisabled: {
    opacity: 0.5,
  },
  methodIconContainer: {
    width: 44,
    height: 44,
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
  methodTitleDisabled: {
    color: colors.muted,
  },
  methodDescription: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  methodDescriptionDisabled: {
    color: colors.muted,
  },
  methodFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  methodFee: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.success,
  },
  methodFeeDisabled: {
    color: colors.muted,
  },
  methodTime: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
  },

  // Network selection
  networkGrid: {
    gap: spacing.sm,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  networkCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  networkCardLoading: {
    opacity: 0.7,
  },
  networkIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  networkSymbol: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  networkSpeed: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
  },
  popularBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  popularText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },

  // QR and address
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  copyBoxCopied: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}10`,
  },
  addressText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.foreground,
  },
  copiedText: {
    fontSize: typography.sizes.xs,
    color: colors.success,
    marginTop: spacing.xs,
  },
  warningText: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  // Amount input
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    marginRight: spacing.xs,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
    minWidth: 120,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickAmountButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  quickAmountText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primaryForeground,
  },

  // Confirmation
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryLabelBold: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
  },
  summaryValueBold: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.foreground,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonLoading: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primaryForeground,
  },

  // Wire details
  wireDetailsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  wireDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wireDetailContent: {
    flex: 1,
  },
  wireDetailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  wireDetailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  wireDetailValueMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: typography.sizes.sm,
  },
  wireCopyButton: {
    padding: spacing.sm,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  copyAllText: {
    fontSize: typography.sizes.sm,
    color: colors.mutedForeground,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.mutedForeground,
    lineHeight: 18,
  },

  // WebView
  webViewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webViewTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
  },
  webView: {
    flex: 1,
  },
});
