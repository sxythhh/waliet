/**
 * Capacitor mobile utilities
 * Provides native functionality for iOS and Android
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';

/**
 * Check if running on a native platform (iOS or Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the current platform
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

/**
 * Initialize native app settings
 * Call this once when the app starts
 */
export const initializeNativeApp = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    // Add platform class to body for CSS targeting
    const platform = getPlatform();
    document.body.classList.add(`capacitor-${platform}`);

    // Hide splash screen after app is ready
    await SplashScreen.hide();

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });

    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#000000' });
    }

    // Setup keyboard listeners
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch (error) {
    console.error('Error initializing native app:', error);
  }
};

/**
 * Trigger haptic feedback
 */
export const hapticFeedback = async (style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> => {
  if (!isNativePlatform()) return;

  const impactStyle = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  }[style];

  await Haptics.impact({ style: impactStyle });
};

/**
 * Share content using native share sheet
 */
export const shareContent = async (options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  try {
    await Share.share(options);
    return true;
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
};

/**
 * Open URL in native browser
 */
export const openBrowser = async (url: string): Promise<void> => {
  await Browser.open({ url });
};

/**
 * Close native browser
 */
export const closeBrowser = async (): Promise<void> => {
  await Browser.close();
};
