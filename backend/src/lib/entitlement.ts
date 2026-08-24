export type EntitlementStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'grace'
  | 'canceled_period_end'
  | 'expired'
  | 'refunded_or_revoked'
  | 'paused'
  | 'support_grant'
  | 'past_due';

export interface EntitlementResult {
  isPremium: boolean;
  status: EntitlementStatus;
  validUntil: string | null;
  reason: string;
}

export function computeEntitlement(profile: any): EntitlementResult {
  const now = new Date();
  const endDate = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : null;

  // Admin always has access
  if (profile.role === 'admin') {
    return { isPremium: true, status: 'active', validUntil: null, reason: 'admin_role' };
  }

  // Active subscription (not expired)
  if (profile.subscriptionStatus === 'active' && profile.accountType === 'premium') {
    if (!endDate || endDate > now) {
      return { isPremium: true, status: 'active', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_active' };
    }
    return { isPremium: false, status: 'expired', validUntil: endDate.toISOString(), reason: 'subscription_expired' };
  }

  // Trialing
  if (profile.subscriptionStatus === 'trialing' && profile.trialStatus === 'active') {
    if (!endDate || endDate > now) {
      return { isPremium: true, status: 'trialing', validUntil: endDate?.toISOString() ?? null, reason: 'trial_active' };
    }
    return { isPremium: false, status: 'expired', validUntil: endDate?.toISOString() ?? null, reason: 'trial_expired' };
  }

  // Cancelled but still within paid period (grace)
  if (profile.subscriptionStatus === 'cancelled' && endDate && endDate > now) {
    return { isPremium: true, status: 'grace', validUntil: endDate.toISOString(), reason: 'canceled_period_end' };
  }

  // Past due — still grant access but flag it
  if (profile.subscriptionStatus === 'past_due') {
    return { isPremium: true, status: 'past_due', validUntil: endDate?.toISOString() ?? null, reason: 'payment_past_due' };
  }

  // Refunded or revoked
  if (profile.subscriptionStatus === 'refunded' || profile.paymentStatus === 'refunded') {
    return { isPremium: false, status: 'refunded_or_revoked', validUntil: null, reason: 'payment_refunded' };
  }

  // Paused
  if (profile.subscriptionStatus === 'paused') {
    return { isPremium: false, status: 'paused', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_paused' };
  }

  // Expired
  if (profile.subscriptionStatus === 'expired') {
    return { isPremium: false, status: 'expired', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_expired' };
  }

  // Default: free
  return { isPremium: false, status: 'free', validUntil: null, reason: 'no_subscription' };
}
