import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};

// Required public config — validated at startup
export const BUILD_CONFIG = {
  backendUrl: (extra.backendUrl as string) || '',
  entitlementId: (extra.entitlementId as string) || 'pro',
  env: (process.env.EXPO_PUBLIC_ENV as string) || 'development',
  revenuecatAppleKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || '',
  revenuecatGoogleKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || '',
} as const;

// Validate required config at startup — fail loudly in dev, warn in prod
export function validateBuildConfig(): void {
  const errors: string[] = [];

  if (!BUILD_CONFIG.backendUrl) {
    errors.push('MISSING: extra.backendUrl in app.json');
  }
  if (BUILD_CONFIG.backendUrl && !BUILD_CONFIG.backendUrl.startsWith('https://')) {
    errors.push('INVALID: backendUrl must start with https://');
  }
  if (Platform.OS === 'ios' && !BUILD_CONFIG.revenuecatAppleKey) {
    errors.push('MISSING: EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY env var');
  }
  if (Platform.OS === 'android' && !BUILD_CONFIG.revenuecatGoogleKey) {
    errors.push('MISSING: EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY env var');
  }

  if (errors.length > 0) {
    const message = `Build config validation failed:\n${errors.join('\n')}`;
    if (__DEV__) {
      throw new Error(message);
    } else {
      console.warn('[BuildConfig]', message);
    }
  }
}

// Ensure backend webhook secrets are NEVER bundled
// These should only exist server-side
const FORBIDDEN_IN_CLIENT = ['RC_WEBHOOK_SECRET', 'DATABASE_URL', 'BETTER_AUTH_SECRET'];
export function assertNoServerSecrets(): void {
  for (const key of FORBIDDEN_IN_CLIENT) {
    if (process.env[key]) {
      console.error(`[Security] Server secret ${key} found in client bundle — remove immediately`);
    }
  }
}
