import { useReducer, useCallback } from "react";
import {
  PaymentMethod,
  DepositStep,
  CryptoNetwork,
  DepositFlowState,
  DepositFlowAction,
  FeeCalculation,
} from "./types";

const initialState: DepositFlowState = {
  method: null,
  step: "idle",
  amount: 0,
  network: null,
  error: null,
  isLoading: false,
};

// Flow configuration: which steps each method uses
const methodFlows: Record<PaymentMethod, DepositStep[]> = {
  crypto: ["network", "address"],
  card: ["amount", "confirm", "processing"],
  personal: ["amount", "confirm", "processing"],
  wire: ["address"],
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
    return "success";
  }
  return flow[currentIndex + 1];
}

// Get the previous step in the flow
function getPrevStep(method: PaymentMethod, currentStep: DepositStep): DepositStep {
  const flow = methodFlows[method];
  const currentIndex = flow.indexOf(currentStep);
  if (currentIndex <= 0) {
    return "idle";
  }
  return flow[currentIndex - 1];
}

function depositFlowReducer(
  state: DepositFlowState,
  action: DepositFlowAction
): DepositFlowState {
  switch (action.type) {
    case "SELECT_METHOD":
      return {
        ...state,
        method: action.method,
        step: getInitialStep(action.method),
        amount: 0,
        network: null,
        error: null,
      };

    case "SET_AMOUNT":
      return {
        ...state,
        amount: action.amount,
      };

    case "SET_NETWORK":
      return {
        ...state,
        network: action.network,
      };

    case "NEXT_STEP":
      if (!state.method) return state;
      return {
        ...state,
        step: getNextStep(state.method, state.step),
        error: null,
      };

    case "PREV_STEP":
      if (!state.method) return state;
      const prevStep = getPrevStep(state.method, state.step);
      if (prevStep === "idle") {
        return initialState;
      }
      return {
        ...state,
        step: prevStep,
        error: null,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.isLoading,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
        isLoading: false,
      };

    case "SUCCESS":
      return {
        ...state,
        step: "success",
        isLoading: false,
        error: null,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// Calculate fees based on payment method and amount
export function calculateFees(method: PaymentMethod, amount: number): FeeCalculation {
  switch (method) {
    case "crypto":
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: "0%",
      };

    case "card":
      const cardFee = amount * 0.03 + 0.3;
      return {
        depositAmount: amount,
        processingFee: cardFee,
        totalCharged: amount + cardFee,
        youReceive: amount,
        feePercentage: "3% + $0.30",
      };

    case "personal":
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: "Free",
      };

    case "wire":
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: "0%",
      };

    default:
      return {
        depositAmount: amount,
        processingFee: 0,
        totalCharged: amount,
        youReceive: amount,
        feePercentage: "0%",
      };
  }
}

export function useDepositFlow() {
  const [state, dispatch] = useReducer(depositFlowReducer, initialState);

  const selectMethod = useCallback((method: PaymentMethod) => {
    dispatch({ type: "SELECT_METHOD", method });
  }, []);

  const setAmount = useCallback((amount: number) => {
    dispatch({ type: "SET_AMOUNT", amount });
  }, []);

  const setNetwork = useCallback((network: CryptoNetwork) => {
    dispatch({ type: "SET_NETWORK", network });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: "SET_LOADING", isLoading });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: "SET_ERROR", error });
  }, []);

  const success = useCallback(() => {
    dispatch({ type: "SUCCESS" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const fees = state.method && state.amount > 0
    ? calculateFees(state.method, state.amount)
    : null;

  return {
    // State
    ...state,
    fees,
    isOpen: state.step !== "idle",

    // Actions
    selectMethod,
    setAmount,
    setNetwork,
    nextStep,
    prevStep,
    setLoading,
    setError,
    success,
    reset,
  };
}
