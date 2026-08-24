import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const REVENUECAT_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '';
const REVENUECAT_GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? '';
const ENTITLEMENT_ID = 'pro';

interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  isLoading: true,
  customerInfo: null,
  restorePurchases: async () => {},
  refreshSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

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
  }, []);

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
      })
      .catch((e) => console.warn('[SubscriptionContext] RevenueCat login failed:', e));
  }, [user?.id]);

  const restorePurchases = useCallback(async () => {
    console.log('[SubscriptionContext] User tapped Restore Purchases');
    if (Platform.OS === 'web') return;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
    if (!apiKey) {
      console.log('[SubscriptionContext] No API key — cannot restore');
      return;
    }
    try {
      const info = await Purchases.restorePurchases();
      const active = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      console.log('[SubscriptionContext] Restore complete — isSubscribed:', active);
      setCustomerInfo(info);
      setIsSubscribed(active);
    } catch (e) {
      console.warn('[SubscriptionContext] Restore failed:', e);
    }
  }, []);

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
    } catch (e) {
      console.warn('[SubscriptionContext] Refresh failed:', e);
    }
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, isLoading, customerInfo, restorePurchases, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
