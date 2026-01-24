/**
 * Whop integration utilities
 */

export interface WhopUser {
  id: string;
  username?: string;
  email?: string;
  profile_pic_url?: string;
}

export interface WhopMembership {
  id: string;
  product_id: string;
  status: string;
}

interface WhopAuthState {
  user: WhopUser | null;
  membership: WhopMembership | null;
}

const WHOP_AUTH_KEY = 'whop_auth_state';

/**
 * Check if running inside a Whop iframe
 */
export function isWhopIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Get Whop token from URL or headers
 */
export function getWhopToken(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || params.get('whop_token');
}

/**
 * Authenticate with Whop using token
 */
export async function authenticateWithWhop(token: string): Promise<{
  user: WhopUser;
  membership: WhopMembership | null;
  isNewUser: boolean;
}> {
  const response = await fetch('/api/auth/whop/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with Whop');
  }

  return response.json();
}

/**
 * Save Whop auth state to localStorage
 */
export function saveWhopAuthState(state: WhopAuthState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WHOP_AUTH_KEY, JSON.stringify(state));
}

/**
 * Load Whop auth state from localStorage
 */
export function loadWhopAuthState(): WhopAuthState | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(WHOP_AUTH_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear Whop auth state from localStorage
 */
export function clearWhopAuthState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WHOP_AUTH_KEY);
}
