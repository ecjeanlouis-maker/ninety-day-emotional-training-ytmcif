import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { hasAccess, AppFeature } from '@/lib/access';

type Role = 'free' | 'premium';

interface UserProfile {
  full_name: string;
  age_range: string;
  main_goal: string;
  confidence_level: number;
  emotional_control_level: number;
  role: Role;
  ai_messages_remaining: number | null;
}

interface UserContextValue {
  profile: UserProfile | null;
  loading: boolean;
  role: Role;
  isFree: boolean;
  isPremium: boolean;
  refreshProfile: () => Promise<void>;
  consumeAiMessage: () => Promise<{ allowed: boolean; remaining: number | null; resetsAt?: string }>;
  canAccess: (feature: AppFeature) => boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Effective role: premium if RevenueCat says subscribed OR backend role is premium
  const role: Role =
    isSubscribed || profile?.role === 'premium' ? 'premium' : 'free';

  const isFree = role === 'free';
  const isPremium = role === 'premium';

  const refreshProfile = useCallback(async () => {
    console.log('[UserContext] refreshProfile called');
    await fetchProfile();
  }, [fetchProfile]);

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
      return hasAccess(role, feature);
    },
    [role]
  );

  return (
    <UserContext.Provider
      value={{
        profile,
        loading,
        role,
        isFree,
        isPremium,
        refreshProfile,
        consumeAiMessage,
        canAccess,
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
