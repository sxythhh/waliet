import { useState, useCallback, useEffect } from 'react';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import { reclaimExtensionSDK } from '@reclaimprotocol/browser-extension-sdk';
import { supabase } from '@/integrations/supabase/client';
import { VerificationStatus, VerifyZkTLSProofResponse } from '../types';
import { TIKTOK_ACCOUNT_PROVIDER, TIKTOK_DEMOGRAPHICS_PROVIDER, TIKTOK_VIDEO_PROVIDER, INSTAGRAM_ACCOUNT_PROVIDER, INSTAGRAM_POST_PROVIDER, ZkTLSProvider } from '../providers';

// Reclaim App ID - only public credential, secret is server-side only
const RECLAIM_APP_ID = '0x680b1C60dbd34ffaBfAF0e030615965582abc3d8';
// SECURITY: Secret has been moved to Edge Function (init-reclaim-verification)
// Never expose RECLAIM_APP_SECRET in client-side code

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
      if (!EXTENSION_ID) {
        setIsExtensionAvailable(false);
        return;
      }
      try {
        const installed = await reclaimExtensionSDK.isExtensionInstalled({
          extensionID: EXTENSION_ID,
          timeout: 5000,
        });
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
  // Note: Currently disabled for TikTok/Instagram due to attestor IP blocking
  // Falls back to mobile QR flow which uses server-side initialization
  const startExtensionVerification = useCallback(async (provider: ZkTLSProvider) => {
    setStatus('initializing');
    setError(null);
    setVerificationMode('extension');

    try {
      // Get session data for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Map provider to provider_type for the Edge Function
      const providerTypeMap: Record<string, string> = {
        [TIKTOK_ACCOUNT_PROVIDER.reclaimProviderId]: 'tiktok_account',
        [TIKTOK_DEMOGRAPHICS_PROVIDER.reclaimProviderId]: 'tiktok_demographics',
        [TIKTOK_VIDEO_PROVIDER.reclaimProviderId]: 'tiktok_video',
        [INSTAGRAM_ACCOUNT_PROVIDER.reclaimProviderId]: 'instagram_account',
        [INSTAGRAM_POST_PROVIDER.reclaimProviderId]: 'instagram_post',
      };
      const providerType = providerTypeMap[provider.reclaimProviderId] || 'tiktok_account';

      // Initialize verification server-side (secret is kept secure)
      const initResponse = await supabase.functions.invoke('init-reclaim-verification', {
        body: {
          social_account_id: socialAccountId,
          provider_type: providerType,
          video_id: provider.requiresVideoId ? videoId : undefined,
        },
      });

      if (initResponse.error) {
        throw new Error(initResponse.error.message || 'Failed to initialize verification');
      }

      const { request_url, provider_id } = initResponse.data;

      // Initialize extension SDK with server-provided data
      // Note: Extension SDK may require the secret - if so, fall back to mobile flow
      const request = await reclaimExtensionSDK.init(
        RECLAIM_APP_ID,
        '', // Empty - using server-generated request
        provider_id,
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

      setRequestUrl(request.getStatusUrl() || request_url);
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Extension verification failed';
      setError(errorMessage);
      setStatus('error');
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [socialAccountId, platform, videoId, onError, submitProofToBackend]);

  // Mobile QR code verification flow - uses server-side initialization for security
  const startMobileVerification = useCallback(async (provider: ZkTLSProvider) => {
    setStatus('initializing');
    setError(null);
    setVerificationMode('mobile');

    try {
      // Get session data for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Map provider to provider_type for the Edge Function
      const providerTypeMap: Record<string, string> = {
        [TIKTOK_ACCOUNT_PROVIDER.reclaimProviderId]: 'tiktok_account',
        [TIKTOK_DEMOGRAPHICS_PROVIDER.reclaimProviderId]: 'tiktok_demographics',
        [TIKTOK_VIDEO_PROVIDER.reclaimProviderId]: 'tiktok_video',
        [INSTAGRAM_ACCOUNT_PROVIDER.reclaimProviderId]: 'instagram_account',
        [INSTAGRAM_POST_PROVIDER.reclaimProviderId]: 'instagram_post',
      };
      const providerType = providerTypeMap[provider.reclaimProviderId] || 'tiktok_account';

      // Initialize verification server-side (secret is kept secure)
      const initResponse = await supabase.functions.invoke('init-reclaim-verification', {
        body: {
          social_account_id: socialAccountId,
          provider_type: providerType,
          video_id: provider.requiresVideoId ? videoId : undefined,
        },
      });

      if (initResponse.error) {
        throw new Error(initResponse.error.message || 'Failed to initialize verification');
      }

      const { request_url, session_id } = initResponse.data;

      if (!request_url) {
        throw new Error('No verification URL received from server');
      }

      // Set the request URL for QR code display
      setRequestUrl(request_url);
      setStatus('waiting');

      // For mobile flow, we need to poll for completion or use the SDK's session
      // The Reclaim SDK can still be used for session handling with just the app ID
      // Initialize without secret for session polling only
      const reclaimProofRequest = await ReclaimProofRequest.init(
        RECLAIM_APP_ID,
        '', // Empty string - session will use the server-generated URL
        provider.reclaimProviderId
      );

      // Start the verification session and wait for proof
      // The request URL is already generated server-side, we just need the callback handling
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start verification';
      setError(errorMessage);
      setStatus('error');
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [socialAccountId, platform, videoId, onError, submitProofToBackend]);

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
