import { useEffect } from "react";

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_STORAGE_KEY = 'utm_params';
const UTM_SESSION_KEY = 'utm_params_session'; // For OAuth flow preservation
const REFERRAL_SESSION_KEY = 'referral_code_session'; // For OAuth flow preservation

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  signup_url?: string;
}

export const useUtmTracking = () => {
  useEffect(() => {
    // Check for UTM parameters in URL on mount
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: UtmParams = {};
    let hasUtm = false;

    UTM_PARAMS.forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        utmParams[param as keyof UtmParams] = value;
        hasUtm = true;
      }
    });

    // Store the full URL if UTM params exist
    if (hasUtm) {
      utmParams.signup_url = window.location.href;
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmParams));
    }
  }, []);
};

export const getStoredUtmParams = (): UtmParams | null => {
  // First try localStorage, then sessionStorage (for OAuth callback restoration)
  const stored = localStorage.getItem(UTM_STORAGE_KEY) || sessionStorage.getItem(UTM_SESSION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const clearStoredUtmParams = () => {
  localStorage.removeItem(UTM_STORAGE_KEY);
  sessionStorage.removeItem(UTM_SESSION_KEY);
};

// Save UTM and referral params to sessionStorage before OAuth redirect
export const preserveTrackingForOAuth = () => {
  const utmParams = localStorage.getItem(UTM_STORAGE_KEY);
  const referralCode = localStorage.getItem('referral_code');

  if (utmParams) {
    sessionStorage.setItem(UTM_SESSION_KEY, utmParams);
  }
  if (referralCode) {
    sessionStorage.setItem(REFERRAL_SESSION_KEY, referralCode);
  }
};

// Restore tracking params from sessionStorage after OAuth callback
export const restoreTrackingFromOAuth = () => {
  const utmParams = sessionStorage.getItem(UTM_SESSION_KEY);
  const referralCode = sessionStorage.getItem(REFERRAL_SESSION_KEY);

  // Restore to localStorage if not already present
  if (utmParams && !localStorage.getItem(UTM_STORAGE_KEY)) {
    localStorage.setItem(UTM_STORAGE_KEY, utmParams);
  }
  if (referralCode && !localStorage.getItem('referral_code')) {
    localStorage.setItem('referral_code', referralCode);
  }

  // Clean up sessionStorage
  sessionStorage.removeItem(UTM_SESSION_KEY);
  sessionStorage.removeItem(REFERRAL_SESSION_KEY);

  return {
    hasReferralCode: !!referralCode,
    hasUtmParams: !!utmParams,
  };
};
