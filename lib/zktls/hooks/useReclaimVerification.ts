/**
 * Hook for Reclaim zkTLS verification
 */

import { useState, useCallback } from 'react';

export interface ReclaimVerificationState {
  isVerifying: boolean;
  error: string | null;
  verificationUrl: string | null;
}

export interface UseReclaimVerificationReturn {
  state: ReclaimVerificationState;
  startVerification: (platform: string, accountId: string) => Promise<void>;
  reset: () => void;
}

export function useReclaimVerification(): UseReclaimVerificationReturn {
  const [state, setState] = useState<ReclaimVerificationState>({
    isVerifying: false,
    error: null,
    verificationUrl: null,
  });

  const startVerification = useCallback(async (platform: string, accountId: string) => {
    setState({ isVerifying: true, error: null, verificationUrl: null });
    
    try {
      const response = await fetch('/api/zktls/start-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, accountId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start verification');
      }

      const data = await response.json();
      setState({
        isVerifying: false,
        error: null,
        verificationUrl: data.verificationUrl,
      });
    } catch (err) {
      setState({
        isVerifying: false,
        error: err instanceof Error ? err.message : 'Verification failed',
        verificationUrl: null,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isVerifying: false, error: null, verificationUrl: null });
  }, []);

  return { state, startVerification, reset };
}
