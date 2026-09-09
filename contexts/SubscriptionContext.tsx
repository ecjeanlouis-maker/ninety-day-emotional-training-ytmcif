import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPost } from '@/utils/api';

const REVENUECAT_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '';
const REVENUECAT_GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? '';
const ENTITLEMENT_ID = 'pro';

interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  customerInfo: CustomerInfo | null;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  isLoading: true,
  isConfigured: false,
  customerInfo: null,
  restorePurchases: async () => {},
  refreshSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const isConfigured = Platform.OS !== 'web' && !!(Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY);

  const syncToBackend = useCallback(async (info: CustomerInfo) => {
    try {
      await authenticatedPost('/api/subscription/sync', { customerInfo: info });
      console.log('[SubscriptionContext] Synced RC state to backend');
    } catch (e) {
      // Non-fatal — webhook will catch up
      console.warn('[SubscriptionContext] Backend sync failed (non-fatal):', e);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
    if (!apiKey) {
      console.log('[SubscriptionContext] No RevenueCat API key configured — running in free mode');
      setIsLoading(false);
      return;
    }

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      Purchases.configure({ apiKey });
      console.log('[SubscriptionContext] RevenueCat configured');
    } catch (e) {
      console.warn('[SubscriptionContext] Failed to configure RevenueCat:', e);
      setIsLoading(false);
      return;
    }

    const updateCustomerInfo = (info: CustomerInfo) => {
      const active = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      console.log('[SubscriptionContext] Customer info updated — isSubscribed:', active);
      setCustomerInfo(info);
      setIsSubscribed(active);
      setIsLoading(false);
      syncToBackend(info); // fire-and-forget — push to backend immediately
    };

    Purchases.addCustomerInfoUpdateListener(updateCustomerInfo);

    Purchases.getCustomerInfo()
      .then(updateCustomerInfo)
      .catch((e) => {
        console.warn('[SubscriptionContext] Failed to get customer info:', e);
        setIsLoading(false);
      });

    return () => {
      Purchases.removeCustomerInfoUpdateListener(updateCustomerInfo);
    };
  }, [syncToBackend]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!user?.id) return;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
    if (!apiKey) return;

    console.log('[SubscriptionContext] Logging in user to RevenueCat:', user.id);
    Purchases.logIn(user.id)
      .then(({ customerInfo: info }) => {
        const active = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
        console.log('[SubscriptionContext] User logged in — isSubscribed:', active);
        setCustomerInfo(info);
        setIsSubscribed(active);
        syncToBackend(info); // fire-and-forget
      })
      .catch((e) => console.warn('[SubscriptionContext] RevenueCat login failed:', e));
  }, [user?.id, syncToBackend]);

  const restorePurchases = useCallback(async () => {
    console.log('[SubscriptionContext] Restoring purchases');
    if (Platform.OS === 'web') return;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
    if (!apiKey) {
      console.log('[SubscriptionContext] No API key — cannot restore');
      return;
    }
    // Let errors propagate so the paywall can catch and show an error message
    const info = await Purchases.restorePurchases();
    const active = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    console.log('[SubscriptionContext] Restore complete — isSubscribed:', active);
    setCustomerInfo(info);
    setIsSubscribed(active);
    await syncToBackend(info); // await — DB must be written before waitForPremium polls
  }, [syncToBackend]);

  const refreshSubscription = useCallback(async () => {
    console.log('[SubscriptionContext] Refreshing subscription status');
    if (Platform.OS === 'web') return;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
    if (!apiKey) return;
    try {
      const info = await Purchases.getCustomerInfo();
      const active = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      console.log('[SubscriptionContext] Refresh complete — isSubscribed:', active);
      setCustomerInfo(info);
      setIsSubscribed(active);
      await syncToBackend(info); // await — DB must be written before waitForPremium polls
    } catch (e) {
      console.warn('[SubscriptionContext] Refresh failed:', e);
    }
  }, [syncToBackend]);

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, isLoading, isConfigured, customerInfo, restorePurchases, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
