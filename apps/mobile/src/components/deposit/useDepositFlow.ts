import { useReducer, useCallback } from 'react';
import {
  PaymentMethod,
  DepositStep,
  CryptoNetwork,
  DepositFlowState,
  FeeCalculation,
} from './types';

type DepositFlowAction =
  | { type: 'SELECT_METHOD'; method: PaymentMethod }
  | { type: 'SET_AMOUNT'; amount: number }
  | { type: 'SET_NETWORK'; network: CryptoNetwork }
  | { type: 'SET_DEPOSIT_ADDRESS'; address: string }
  | { type: 'SET_CHECKOUT_URL'; url: string; transactionId: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SUCCESS' }
  | { type: 'RESET' };

const initialState: DepositFlowState = {
  method: null,
  step: 'idle',
  amount: 0,
  network: null,
  error: null,
  isLoading: false,
  depositAddress: null,
  checkoutUrl: null,
  transactionId: null,
};

// Flow configuration: which steps each method uses
const methodFlows: Record<PaymentMethod, DepositStep[]> = {
  crypto: ['network', 'address'],
  card: ['amount', 'confirm', 'processing'],
  personal: ['amount', 'confirm', 'processing'],
  wire: ['address'],
};

// Get the initial step for a payment method
function getInitialStep(method: PaymentMethod): DepositStep {
  return methodFlows[method][0];
}

// Get the next step in the flow
function getNextStep(method: PaymentMethod, currentStep: DepositStep): DepositStep {
  const flow = methodFlows[method];
  const currentIndex = flow.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= flow.length - 1) {
    return 'success';
  }
  return flow[currentIndex + 1];
}

// Get the previous step in the flow
function getPrevStep(method: PaymentMethod, currentStep: DepositStep): DepositStep {
  const flow = methodFlows[method];
  const currentIndex = flow.indexOf(currentStep);
  if (currentIndex <= 0) {
    return 'method';
  }
  return flow[currentIndex - 1];
}

function depositFlowReducer(
  state: DepositFlowState,
  action: DepositFlowAction
): DepositFlowState {
  switch (action.type) {
    case 'SELECT_METHOD':
      return {
        ...state,
        method: action.method,
        step: getInitialStep(action.method),
        amount: 0,
        network: null,
        error: null,
        depositAddress: null,
        checkoutUrl: null,
        transactionId: null,
      };

    case 'SET_AMOUNT':
      return {
        ...state,
        amount: action.amount,
      };

    case 'SET_NETWORK':
      return {
        ...state,
        network: action.network,
      };

    case 'SET_DEPOSIT_ADDRESS':
      return {
        ...state,
        depositAddress: action.address,
        isLoading: false,
      };

    case 'SET_CHECKOUT_URL':
      return {
        ...state,
        checkoutUrl: action.url,
        transactionId: action.transactionId,
        isLoading: false,
      };

    case 'NEXT_STEP':
      if (!state.method) return state;
      return {
        ...state,
        step: getNextStep(state.method, state.step),
        error: null,
      };

    case 'PREV_STEP':
      if (!state.method) return state;
      const prevStep = getPrevStep(state.method, state.step);
      if (prevStep === 'method') {
        return {
          ...initialState,
          step: 'method',
        };
      }
      return {
        ...state,
        step: prevStep,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        isLoading: false,
      };

    case 'SUCCESS':
      return {
        ...state,
        step: 'success',
        isLoading: false,
        error: null,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Calculate fees based on payment method and amount
export function calculateFees(method: PaymentMethod, amount: number): FeeCalculation {
  switch (method) {
    case 'crypto':
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: '0%',
      };

    case 'card':
      const cardFee = amount * 0.03 + 0.3;
      return {
        depositAmount: amount,
        processingFee: cardFee,
        totalCharged: amount + cardFee,
        youReceive: amount,
        feePercentage: '3% + $0.30',
      };

    case 'personal':
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: 'Free',
      };

    case 'wire':
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: '0%',
      };

    default:
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: '0%',
      };
  }
}

export function useDepositFlow() {
  const [state, dispatch] = useReducer(depositFlowReducer, initialState);

  const open = useCallback(() => {
    dispatch({ type: 'RESET' });
    // Set to method selection step instead of idle
    dispatch({ type: 'SELECT_METHOD', method: 'crypto' });
    dispatch({ type: 'RESET' }); // Reset again to show method selection
    // Manually set to method step
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }, []);

  const selectMethod = useCallback((method: PaymentMethod) => {
    dispatch({ type: 'SELECT_METHOD', method });
  }, []);

  const setAmount = useCallback((amount: number) => {
    dispatch({ type: 'SET_AMOUNT', amount });
  }, []);

  const setNetwork = useCallback((network: CryptoNetwork) => {
    dispatch({ type: 'SET_NETWORK', network });
  }, []);

  const setDepositAddress = useCallback((address: string) => {
    dispatch({ type: 'SET_DEPOSIT_ADDRESS', address });
  }, []);

  const setCheckoutUrl = useCallback((url: string, transactionId: string) => {
    dispatch({ type: 'SET_CHECKOUT_URL', url, transactionId });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', isLoading });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const success = useCallback(() => {
    dispatch({ type: 'SUCCESS' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const fees = state.method && state.amount > 0
    ? calculateFees(state.method, state.amount)
    : null;

  return {
    // State
    ...state,
    fees,
    isOpen: state.step !== 'idle',

    // Actions
    open,
    selectMethod,
    setAmount,
    setNetwork,
    setDepositAddress,
    setCheckoutUrl,
    nextStep,
    prevStep,
    setLoading,
    setError,
    success,
    reset,
  };
}
