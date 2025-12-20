import { useEffect } from "react";

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_STORAGE_KEY = 'utm_params';

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
  const stored = localStorage.getItem(UTM_STORAGE_KEY);
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
};
