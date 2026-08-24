import { and, eq, gt } from 'drizzle-orm';
import type { App } from '../index.js';
import * as schema from '../db/schema.js';

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
  days_1_7_access: boolean;
  days_8_90_access: boolean;
}

/** Compute entitlement from a user_profiles row only (no support grant check). */
export function computeProfileEntitlement(profile: {
  role: string;
  accountType: string;
  subscriptionStatus: string;
  trialStatus: string;
  subscriptionEndDate: Date | null;
  paymentStatus: string;
}): { isPremium: boolean; status: EntitlementStatus; validUntil: string | null; reason: string } {
  const now = new Date();
  const endDate = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : null;

  if (profile.role === 'admin') {
    return { isPremium: true, status: 'active', validUntil: null, reason: 'admin_role' };
  }
  if (profile.subscriptionStatus === 'active' && profile.accountType === 'premium') {
    if (!endDate || endDate > now) {
      return { isPremium: true, status: 'active', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_active' };
    }
    return { isPremium: false, status: 'expired', validUntil: endDate.toISOString(), reason: 'subscription_expired' };
  }
  if (profile.subscriptionStatus === 'trialing' && profile.trialStatus === 'active') {
    if (!endDate || endDate > now) {
      return { isPremium: true, status: 'trialing', validUntil: endDate?.toISOString() ?? null, reason: 'trial_active' };
    }
    return { isPremium: false, status: 'expired', validUntil: endDate?.toISOString() ?? null, reason: 'trial_expired' };
  }
  if (profile.subscriptionStatus === 'cancelled' && endDate && endDate > now) {
    return { isPremium: true, status: 'grace', validUntil: endDate.toISOString(), reason: 'canceled_period_end' };
  }
  if (profile.subscriptionStatus === 'past_due') {
    return { isPremium: true, status: 'past_due', validUntil: endDate?.toISOString() ?? null, reason: 'payment_past_due' };
  }
  if (profile.subscriptionStatus === 'refunded' || profile.paymentStatus === 'refunded') {
    return { isPremium: false, status: 'refunded_or_revoked', validUntil: null, reason: 'payment_refunded' };
  }
  if (profile.subscriptionStatus === 'paused') {
    return { isPremium: false, status: 'paused', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_paused' };
  }
  if (profile.subscriptionStatus === 'expired') {
    return { isPremium: false, status: 'expired', validUntil: endDate?.toISOString() ?? null, reason: 'subscription_expired' };
  }
  return { isPremium: false, status: 'free', validUntil: null, reason: 'no_subscription' };
}

/** Backward-compatible alias used by existing callers (entitlement.ts route, program.ts). */
export function computeEntitlement(profile: any): { isPremium: boolean; status: EntitlementStatus; validUntil: string | null; reason: string } {
  return computeProfileEntitlement(profile);
}

/** Full entitlement check: profile + active support grants. Support grants take precedence. */
export async function resolveEntitlement(app: App, userId: string): Promise<EntitlementResult> {
  const now = new Date();

  // Check active support grant first
  const grants = await app.db
    .select()
    .from(schema.userEntitlementGrants)
    .where(
      and(
        eq(schema.userEntitlementGrants.userId, userId),
        gt(schema.userEntitlementGrants.expiresAt, now)
      )
    )
    .limit(1);

  const activeGrant = grants.find((g: any) => !g.revokedAt);
  if (activeGrant) {
    return {
      isPremium: true,
      status: 'support_grant',
      validUntil: activeGrant.expiresAt.toISOString(),
      reason: 'support_grant_active',
      days_1_7_access: true,
      days_8_90_access: true,
    };
  }

  // Fall back to profile-based entitlement
  const rows = await app.db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    return {
      isPremium: false,
      status: 'free',
      validUntil: null,
      reason: 'no_profile',
      days_1_7_access: true,
      days_8_90_access: false,
    };
  }

  const result = computeProfileEntitlement(rows[0]);
  return { ...result, days_1_7_access: true, days_8_90_access: result.isPremium };
}

/** Quick boolean check used by program route guards. */
export async function userIsPremium(app: App, userId: string): Promise<boolean> {
  const result = await resolveEntitlement(app, userId);
  return result.isPremium;
}
