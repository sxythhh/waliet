import { useState, useCallback, useEffect } from 'react';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import { reclaimExtensionSDK } from '@reclaimprotocol/browser-extension-sdk';
import { supabase } from '@/integrations/supabase/client';
import { VerificationStatus, VerifyZkTLSProofResponse } from '../types';
import { TIKTOK_ACCOUNT_PROVIDER, TIKTOK_DEMOGRAPHICS_PROVIDER, TIKTOK_VIDEO_PROVIDER, INSTAGRAM_ACCOUNT_PROVIDER, INSTAGRAM_POST_PROVIDER, ZkTLSProvider } from '../providers';

// Reclaim App credentials
const RECLAIM_APP_ID = '0x680b1C60dbd34ffaBfAF0e030615965582abc3d8';
const RECLAIM_APP_SECRET = '0xe4bf6d08a9817f69895c567b8f2fba6aeef1345700a6d07430cbe1aaf6a356cb';

// Platforms known to block attestor datacenter IPs
// These will always use mobile QR code flow for reliability
const ATTESTOR_BLOCKED_PLATFORMS: string[] = ['tiktok', 'instagram'];

// Error patterns that indicate attestor IP blocking
const BLOCKING_ERROR_PATTERNS = [
  'CLOSE_NOTIFY',
  'tls session ended',
  'missing bytes from packet',
  'Fatal alert',
  'connection refused',
  'ECONNRESET',
];

// Virality Nexus Verification Extension ID - update after loading unpacked or publishing
// You get this from chrome://extensions when loading unpacked, or from Chrome Web Store after publishing
const EXTENSION_ID = import.meta.env.VITE_RECLAIM_EXTENSION_ID || '';

interface UseReclaimVerificationOptions {
  socialAccountId: string;
  platform: 'tiktok' | 'instagram';
  videoId?: string; // Only required for video/post-specific verification (content_id for Instagram)
  useVideoProvider?: boolean; // Set to true for per-video/post verification (brand fraud checks)
  onSuccess?: (data: VerifyZkTLSProofResponse) => void;
  onError?: (error: Error) => void;
}

type VerificationMode = 'extension' | 'mobile' | null;

interface UseReclaimVerificationReturn {
  status: VerificationStatus;
  requestUrl: string | null;
  error: string | null;
  verificationData: VerifyZkTLSProofResponse | null;
  isExtensionAvailable: boolean;
  verificationMode: VerificationMode;
  startVerification: () => Promise<void>;
  reset: () => void;
}

// Check if an error message indicates attestor IP blocking
function isBlockingError(errorMessage: string): boolean {
  const lowerError = errorMessage.toLowerCase();
  return BLOCKING_ERROR_PATTERNS.some(pattern =>
    lowerError.includes(pattern.toLowerCase())
  );
}

// Check if a platform is known to block attestor IPs
function isPlatformBlocked(platform: string): boolean {
  return ATTESTOR_BLOCKED_PLATFORMS.includes(platform.toLowerCase());
}

// Helper to select provider based on platform and verification type
function getProvider(platform: 'tiktok' | 'instagram', useVideoProvider: boolean): ZkTLSProvider | null {
  if (platform === 'instagram') {
    // Instagram supports both account-wide and per-post verification
    return useVideoProvider ? INSTAGRAM_POST_PROVIDER : INSTAGRAM_ACCOUNT_PROVIDER;
  }
  // TikTok supports both account-wide and per-video
  return useVideoProvider ? TIKTOK_VIDEO_PROVIDER : TIKTOK_ACCOUNT_PROVIDER;
}

export function useReclaimVerification({
  socialAccountId,
  platform,
  videoId,
  useVideoProvider = false,
  onSuccess,
  onError,
}: UseReclaimVerificationOptions): UseReclaimVerificationReturn {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [requestUrl, setRequestUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerifyZkTLSProofResponse | null>(null);
  const [isExtensionAvailable, setIsExtensionAvailable] = useState(false);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>(null);

  // Check if the browser extension is installed
  useEffect(() => {
    const checkExtension = async () => {
      console.log('[zkTLS] Checking for extension, ID:', EXTENSION_ID);
      if (!EXTENSION_ID) {
        console.log('[zkTLS] No extension ID configured');
        setIsExtensionAvailable(false);
        return;
      }
      try {
        console.log('[zkTLS] Calling isExtensionInstalled...');
        const installed = await reclaimExtensionSDK.isExtensionInstalled({
          extensionID: EXTENSION_ID,
          timeout: 5000,
        });
        console.log('[zkTLS] Extension installed:', installed);
        setIsExtensionAvailable(installed);
      } catch (err) {
        console.error('[zkTLS] Extension check failed:', err);
        setIsExtensionAvailable(false);
      }
    };
    checkExtension();
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setRequestUrl(null);
    setError(null);
    setVerificationData(null);
    setVerificationMode(null);
  }, []);

  // Submit proof to backend and handle response
  const submitProofToBackend = useCallback(async (
    proofs: unknown,
    provider: ZkTLSProvider
  ): Promise<void> => {
    setStatus('verifying');

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('verify-zktls-proof', {
      body: {
        social_account_id: socialAccountId,
        proof: proofs,
        provider_id: provider.reclaimProviderId,
        video_id: provider.requiresVideoId ? videoId : undefined,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Verification failed');
    }

    const result = response.data as VerifyZkTLSProofResponse;
    setVerificationData(result);
    setStatus('success');
    onSuccess?.(result);
  }, [socialAccountId, videoId, onSuccess]);

  // Browser extension verification flow (desktop)
  const startExtensionVerification = useCallback(async (provider: ZkTLSProvider) => {
    setStatus('initializing');
    setError(null);
    setVerificationMode('extension');

    // Initialize with browser extension SDK
    const request = await reclaimExtensionSDK.init(
      RECLAIM_APP_ID,
      RECLAIM_APP_SECRET,
      provider.reclaimProviderId,
      { extensionID: EXTENSION_ID }
    );

    // Add context for video/post-specific verification
    if (provider.requiresVideoId && videoId) {
      if (platform === 'instagram') {
        request.addContext('content_id', videoId);
      } else {
        request.addContext('postId', videoId);
      }
    }

    setRequestUrl(request.getStatusUrl());
    setStatus('waiting');

    // Set up event handlers
    request.on('error', (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message :
        typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) :
        'Extension verification failed';
      setError(errorMessage);
      setStatus('error');
      onError?.(new Error(errorMessage));
    });

    // Start verification - this opens the provider page in a new tab
    const proofs = await request.startVerification();
    await submitProofToBackend(proofs, provider);
  }, [platform, videoId, onError, submitProofToBackend]);

  // Mobile QR code verification flow
  const startMobileVerification = useCallback(async (provider: ZkTLSProvider) => {
    setStatus('initializing');
    setError(null);
    setVerificationMode('mobile');

    // Initialize Reclaim SDK with our app ID, app secret, and provider ID
    const reclaimProofRequest = await ReclaimProofRequest.init(
      RECLAIM_APP_ID,
      RECLAIM_APP_SECRET,
      provider.reclaimProviderId
    );

    // Add context with the video/content ID for per-content verification
    if (provider.requiresVideoId && videoId) {
      if (platform === 'instagram') {
        reclaimProofRequest.addContext('content_id', videoId);
      } else {
        reclaimProofRequest.addContext('postId', videoId);
      }
    }

    // Generate the verification request URL
    const url = await reclaimProofRequest.getRequestUrl();
    setRequestUrl(url);
    setStatus('waiting');

    // Start the verification session and wait for proof
    await reclaimProofRequest.startSession({
      onSuccess: async (proofs) => {
        try {
          await submitProofToBackend(proofs, provider);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to verify proof';
          setError(errorMessage);
          setStatus('error');
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
      },
      onError: (err) => {
        const errorMessage = err instanceof Error ? err.message : 'Verification session failed';
        setError(errorMessage);
        setStatus('error');
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      },
    });
  }, [platform, videoId, onError, submitProofToBackend]);

  const startVerification = useCallback(async () => {
    // Select the appropriate provider based on platform
    const provider = getProvider(platform, useVideoProvider);

    if (!provider) {
      setError(`No provider available for platform: ${platform}`);
      setStatus('error');
      return;
    }

    // Only require videoId for video/post-specific verification
    if (provider.requiresVideoId && !videoId) {
      const idName = platform === 'instagram' ? 'Post shortcode (content_id)' : 'Video ID';
      setError(`${idName} is required for ${provider.name} verification`);
      setStatus('error');
      return;
    }

    try {
      // Check if this platform is known to block attestor datacenter IPs
      const platformBlocked = isPlatformBlocked(platform);

      if (platformBlocked) {
        console.log(`[zkTLS] Platform "${platform}" blocks attestor IPs, using mobile QR flow`);
      }

      // Use mobile QR code flow for blocked platforms, or if extension not available
      if (platformBlocked || !isExtensionAvailable || !EXTENSION_ID) {
        await startMobileVerification(provider);
      } else {
        await startExtensionVerification(provider);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize verification';

      // Detect if this looks like attestor IP blocking
      if (isBlockingError(errorMessage)) {
        console.warn(
          `[zkTLS] Detected attestor blocking for platform "${platform}". ` +
          `Consider adding "${platform}" to ATTESTOR_BLOCKED_PLATFORMS.`
        );
      }

      setError(errorMessage);
      setStatus('error');
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [platform, videoId, useVideoProvider, isExtensionAvailable, startExtensionVerification, startMobileVerification, onError]);

  return {
    status,
    requestUrl,
    error,
    verificationData,
    isExtensionAvailable,
    verificationMode,
    startVerification,
    reset,
  };
}

// Export types for consumers
export type { UseReclaimVerificationOptions, UseReclaimVerificationReturn };

// Export utilities for detecting blocked platforms
export { ATTESTOR_BLOCKED_PLATFORMS, BLOCKING_ERROR_PATTERNS, isBlockingError, isPlatformBlocked };
