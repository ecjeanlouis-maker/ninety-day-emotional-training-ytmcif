import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { hasAccess, AppFeature } from '@/lib/access';

type Role = 'free' | 'premium' | 'admin';

type AccessState = 'active' | 'trialing' | 'cancelled_grace' | 'past_due' | 'expired' | 'inactive' | 'admin';
type AccountType = 'free' | 'premium';
type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing';
type PlanType = 'monthly' | 'yearly' | 'lifetime';
type TrialStatus = 'none' | 'active' | 'expired' | 'converted';
type PaymentStatus = 'none' | 'succeeded' | 'failed' | 'pending' | 'refunded';

interface UserProfile {
  full_name: string;
  age_range: string;
  main_goal: string;
  confidence_level: number;
  emotional_control_level: number;
  role: Role;
  ai_messages_remaining: number | null;
  // subscription fields
  account_type: AccountType;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_type: PlanType | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_status: TrialStatus;
  payment_status: PaymentStatus;
  is_premium_active: boolean;
  access_state: AccessState;
}

export interface EntitlementData {
  is_premium: boolean;
  status: string;
  valid_until: string | null;
  reason: string;
  days_1_7_access: boolean;
  days_8_90_access: boolean;
}

interface UserContextValue {
  profile: UserProfile | null;
  loading: boolean;
  role: Role;
  isFree: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isInGracePeriod: boolean;
  trialDaysRemaining: number | null;
  entitlement: EntitlementData | null;
  refreshProfile: () => Promise<void>;
  refreshEntitlement: () => Promise<void>;
  consumeAiMessage: () => Promise<{ allowed: boolean; remaining: number | null; resetsAt?: string }>;
  canAccess: (feature: AppFeature) => boolean;
  startTrial: () => Promise<{ ok: true } | { ok: false; reason: 'already_used' | 'already_premium' | 'unknown' }>;
  cancelTrial: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [entitlement, setEntitlement] = useState<EntitlementData | null>(null);

  // Track last user id to avoid redundant fetches
  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      console.log('[UserContext] No user — skipping profile fetch');
      setProfile(null);
      return;
    }
    console.log('[UserContext] Fetching profile for user:', user.id);
    setLoading(true);
    try {
      const data = await authenticatedGet<UserProfile>('/api/profile');
      console.log('[UserContext] Profile loaded:', data);
      setProfile(data);
    } catch (error: any) {
      // 404 means profile not yet created — that's fine
      if (
        error?.message?.includes('404') ||
        error?.message?.includes('profile_not_found') ||
        error?.message?.includes('Resource not found')
      ) {
        console.log('[UserContext] Profile not found (404) — new user');
        setProfile(null);
      } else {
        console.error('[UserContext] Failed to fetch profile:', error);
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchEntitlement = useCallback(async () => {
    if (!user?.id) {
      console.log('[UserContext] No user — skipping entitlement fetch');
      setEntitlement(null);
      return;
    }
    console.log('[UserContext] Fetching entitlement for user:', user.id);
    try {
      const data = await authenticatedGet<EntitlementData>('/api/entitlement');
      console.log('[UserContext] Entitlement loaded:', data);
      setEntitlement(data);
    } catch (error: any) {
      console.error('[UserContext] Failed to fetch entitlement:', error);
      // Don't clear entitlement on error — keep stale data
    }
  }, [user?.id]);

  // Fetch profile + entitlement when user changes
  useEffect(() => {
    if (user?.id !== lastUserIdRef.current) {
      lastUserIdRef.current = user?.id ?? null;
      fetchProfile();
      fetchEntitlement();
    }
  }, [user?.id, fetchProfile, fetchEntitlement]);

  // AppState listener — refresh entitlement when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && user?.id) {
        console.log('[UserContext] App came to foreground — refreshing entitlement');
        fetchEntitlement();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user?.id, fetchEntitlement]);

  // Effective role: strictly follows the 5 access rules
  const accessState = profile?.access_state;
  const role: Role =
    // Rule 5: admin
    profile?.role === 'admin' || accessState === 'admin'
      ? 'admin'
      // Rule 1, trial, past_due (warning only), and cancelled grace period all grant premium
      : accessState === 'active'
        || accessState === 'trialing'
        || accessState === 'past_due'
        || accessState === 'cancelled_grace'
        || isSubscribed                              // RevenueCat fallback
        || profile?.is_premium_active === true       // backend computed flag fallback
        || entitlement?.is_premium === true          // entitlement authoritative source
      ? 'premium'
      // Rule 4 (expired) and inactive → free
      : 'free';

  const isFree = role === 'free';
  const isPremium = role === 'premium' || role === 'admin';
  const isAdmin = role === 'admin';
  const isTrialing = accessState === 'trialing';
  const isPastDue = accessState === 'past_due';
  const isInGracePeriod = accessState === 'cancelled_grace';

  // Compute trial days remaining from subscription_end_date when trialing
  let trialDaysRemaining: number | null = null;
  if (isTrialing && profile?.subscription_end_date) {
    const endMs = new Date(profile.subscription_end_date).getTime();
    const nowMs = Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / 86_400_000));
  }

  const refreshProfile = useCallback(async () => {
    console.log('[UserContext] refreshProfile called');
    await fetchProfile();
    // Also refresh entitlement after profile refresh
    await fetchEntitlement();
  }, [fetchProfile, fetchEntitlement]);

  const refreshEntitlement = useCallback(async () => {
    console.log('[UserContext] refreshEntitlement called');
    await fetchEntitlement();
  }, [fetchEntitlement]);

  const consumeAiMessage = useCallback(async (): Promise<{
    allowed: boolean;
    remaining: number | null;
    resetsAt?: string;
  }> => {
    console.log('[UserContext] consumeAiMessage called');
    try {
      const result = await authenticatedPost<{
        allowed: boolean;
        remaining: number | null;
        role: Role;
        resets_at?: string;
      }>('/api/profile/ai-message-consume', {});
      console.log('[UserContext] consumeAiMessage result:', result);
      // Update local remaining count
      if (profile) {
        setProfile((prev) =>
          prev ? { ...prev, ai_messages_remaining: result.remaining } : prev
        );
      }
      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetsAt: result.resets_at,
      };
    } catch (error: any) {
      // 429 = limit reached
      if (error?.message?.includes('429')) {
        console.log('[UserContext] AI message limit reached (429)');
        return { allowed: false, remaining: 0 };
      }
      console.error('[UserContext] consumeAiMessage error:', error);
      return { allowed: false, remaining: null };
    }
  }, [profile]);

  const canAccess = useCallback(
    (feature: AppFeature): boolean => {
      // If entitlement is loaded, use it as the authoritative source for premium features
      if (entitlement !== null) {
        const effectiveRole: 'free' | 'premium' = entitlement.is_premium ? 'premium' : 'free';
        return hasAccess(effectiveRole, feature);
      }
      // Fall back to role-based logic (admin treated as premium for feature access)
      const accessRole: 'free' | 'premium' = role === 'free' ? 'free' : 'premium';
      return hasAccess(accessRole, feature);
    },
    [role, entitlement]
  );

  const startTrial = useCallback(async (): Promise<
    { ok: true } | { ok: false; reason: 'already_used' | 'already_premium' | 'unknown' }
  > => {
    console.log('[UserContext] startTrial called');
    try {
      await authenticatedPost('/api/profile/trial/start', {});
      console.log('[UserContext] startTrial — success, refreshing profile and entitlement');
      await fetchProfile();
      await fetchEntitlement();
      return { ok: true };
    } catch (error: any) {
      console.error('[UserContext] startTrial error:', error);
      const msg: string = error?.message ?? '';
      if (msg.includes('409') || msg.includes('trial_unavailable')) {
        if (msg.includes('already_used')) {
          return { ok: false, reason: 'already_used' };
        }
        if (msg.includes('already_premium')) {
          return { ok: false, reason: 'already_premium' };
        }
        return { ok: false, reason: 'unknown' };
      }
      return { ok: false, reason: 'unknown' };
    }
  }, [fetchProfile, fetchEntitlement]);

  const cancelTrial = useCallback(async (): Promise<void> => {
    console.log('[UserContext] cancelTrial called');
    try {
      await authenticatedPost('/api/profile/trial/cancel', {});
      console.log('[UserContext] cancelTrial — success, refreshing profile and entitlement');
      await fetchProfile();
      await fetchEntitlement();
    } catch (error: any) {
      console.error('[UserContext] cancelTrial error:', error);
      throw error;
    }
  }, [fetchProfile, fetchEntitlement]);

  return (
    <UserContext.Provider
      value={{
        profile,
        loading,
        role,
        isFree,
        isPremium,
        isAdmin,
        isTrialing,
        isPastDue,
        isInGracePeriod,
        trialDaysRemaining,
        entitlement,
        refreshProfile,
        refreshEntitlement,
        consumeAiMessage,
        canAccess,
        startTrial,
        cancelTrial,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
