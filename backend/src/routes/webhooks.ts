import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

const HANDLED_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'CANCELLATION',
  'UNCANCELLATION',
  'BILLING_ISSUE',
  'EXPIRATION',
  'TRANSFER',
  'SUBSCRIBER_ALIAS',
  'REFUND',
  'REVOCATION',
  'SUBSCRIPTION_PAUSED',
  'SUBSCRIPTION_EXTENDED',
]);

interface RCEventBody {
  event: {
    id: string;
    type: string;
    app_user_id: string;
    original_app_user_id?: string;
    aliases?: string[];
    expiration_at_ms?: number;
    purchased_at_ms?: number;
    period_type?: string;
    is_trial_conversion?: boolean;
    cancel_reason?: string;
    grace_period_expiration_at_ms?: number;
    transferred_from?: string[];
    transferred_to?: string[];
    new_product_id?: string;
    product_id?: string;
  };
}

function normalizeRCEvent(event: RCEventBody['event']): {
  accountType: string;
  subscriptionStatus: string;
  trialStatus: string;
  paymentStatus: string;
  subscriptionEndDate: Date | null;
} | null {
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const gracePeriodEnd = event.grace_period_expiration_at_ms ? new Date(event.grace_period_expiration_at_ms) : null;

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'NON_RENEWING_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'SUBSCRIPTION_EXTENDED':
    case 'PRODUCT_CHANGE': {
      const isTrial = event.period_type === 'TRIAL';
      if (isTrial) {
        return {
          accountType: 'premium',
          subscriptionStatus: 'trialing',
          trialStatus: 'active',
          paymentStatus: 'none',
          subscriptionEndDate: expiresAt,
        };
      }
      return {
        accountType: 'premium',
        subscriptionStatus: 'active',
        trialStatus: event.is_trial_conversion ? 'converted' : 'none',
        paymentStatus: 'succeeded',
        subscriptionEndDate: expiresAt,
      };
    }

    case 'CANCELLATION': {
      const endDate = gracePeriodEnd ?? expiresAt;
      return {
        accountType: 'premium',
        subscriptionStatus: 'cancelled',
        trialStatus: 'none',
        paymentStatus: 'none',
        subscriptionEndDate: endDate,
      };
    }

    case 'BILLING_ISSUE': {
      return {
        accountType: 'premium',
        subscriptionStatus: 'past_due',
        trialStatus: 'none',
        paymentStatus: 'failed',
        subscriptionEndDate: gracePeriodEnd ?? expiresAt,
      };
    }

    case 'EXPIRATION': {
      return {
        accountType: 'free',
        subscriptionStatus: 'expired',
        trialStatus: event.period_type === 'TRIAL' ? 'expired' : 'none',
        paymentStatus: 'none',
        subscriptionEndDate: expiresAt,
      };
    }

    case 'REFUND':
    case 'REVOCATION': {
      return {
        accountType: 'free',
        subscriptionStatus: 'refunded',
        trialStatus: 'none',
        paymentStatus: 'refunded',
        subscriptionEndDate: null,
      };
    }

    case 'SUBSCRIPTION_PAUSED': {
      return {
        accountType: 'premium',
        subscriptionStatus: 'paused',
        trialStatus: 'none',
        paymentStatus: 'none',
        subscriptionEndDate: expiresAt,
      };
    }

    case 'TRANSFER':
    case 'SUBSCRIBER_ALIAS':
      return null;

    default:
      return null;
  }
}

export function registerWebhookRoutes(app: App) {
  app.fastify.post(
    '/api/webhooks/revenuecat',
    {
      schema: {
        description: 'RevenueCat webhook receiver',
        tags: ['webhooks'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 1. Verify authorization secret
      const secret = process.env.RC_WEBHOOK_SECRET;
      if (!secret) {
        app.logger.warn({}, '[RC Webhook] RC_WEBHOOK_SECRET not configured — rejecting all webhook requests');
        return reply.status(500).send({ error: 'webhook_not_configured' });
      }

      const authHeader = (request.headers['authorization'] as string) ?? '';
      const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (!providedSecret || providedSecret !== secret) {
        app.logger.warn({}, '[RC Webhook] Invalid authorization secret');
        return reply.status(401).send({ error: 'unauthorized' });
      }

      // 2. Parse body defensively
      let body: RCEventBody;
      try {
        body = request.body as RCEventBody;
        if (!body?.event?.id || !body?.event?.type) {
          return reply.status(400).send({ error: 'malformed_payload' });
        }
      } catch {
        return reply.status(400).send({ error: 'malformed_payload' });
      }

      const { event } = body;
      const providerEventId = event.id;
      const eventType = event.type;
      const appUserId = event.app_user_id;
      const originalAppUserId = event.original_app_user_id ?? appUserId;
      const eventAt = event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date();

      app.logger.info({ eventType, appUserId }, '[RC Webhook] Received event');

      // 3. Idempotency check — insert event record, skip if duplicate
      try {
        await app.db.insert(schema.rcWebhookEvents).values({
          providerEventId,
          eventType,
          appUserId,
          originalAppUserId,
          eventAt,
          processed: false,
        });
      } catch (insertErr: any) {
        if (insertErr?.code === '23505' || insertErr?.message?.includes('unique')) {
          app.logger.info({ providerEventId }, '[RC Webhook] Duplicate event — skipping');
          return reply.status(200).send({ status: 'duplicate_ignored' });
        }
        throw insertErr;
      }

      // 4. Ignore unknown event types safely
      if (!HANDLED_EVENT_TYPES.has(eventType)) {
        app.logger.info({ eventType }, '[RC Webhook] Unknown event type — ignoring safely');
        await app.db.update(schema.rcWebhookEvents)
          .set({ processed: true, processedAt: new Date(), normalizedStatus: 'ignored_unknown' })
          .where(eq(schema.rcWebhookEvents.providerEventId, providerEventId));
        return reply.status(200).send({ status: 'ignored_unknown_event' });
      }

      // 5. Resolve userId from RC app_user_id (RC app_user_id = Better Auth user.id)
      const candidateIds = [...new Set([appUserId, originalAppUserId].filter(Boolean))];
      let resolvedUserId: string | null = null;

      for (const candidateId of candidateIds) {
        const profileRows = await app.db
          .select({ userId: schema.userProfiles.userId })
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, candidateId))
          .limit(1);
        if (profileRows.length > 0) {
          resolvedUserId = profileRows[0].userId;
          break;
        }
      }

      if (!resolvedUserId) {
        app.logger.warn({ appUserId, originalAppUserId }, '[RC Webhook] No matching user profile found');
        await app.db.update(schema.rcWebhookEvents)
          .set({ processed: false, processingError: 'user_not_found', processedAt: new Date() })
          .where(eq(schema.rcWebhookEvents.providerEventId, providerEventId));
        return reply.status(200).send({ status: 'user_not_found' });
      }

      // 6. Handle TRANSFER
      if (eventType === 'TRANSFER') {
        const transferredTo = event.transferred_to?.[0];
        const transferredFrom = event.transferred_from?.[0];
        if (transferredFrom) {
          await app.db.update(schema.userProfiles)
            .set({ accountType: 'free', subscriptionStatus: 'expired', updatedAt: new Date() })
            .where(eq(schema.userProfiles.userId, transferredFrom));
        }
        if (transferredTo) {
          app.logger.info({ transferredFrom, transferredTo }, '[RC Webhook] Transfer processed');
        }
        await app.db.update(schema.rcWebhookEvents)
          .set({ processed: true, processedAt: new Date(), normalizedStatus: 'transfer_processed' })
          .where(eq(schema.rcWebhookEvents.providerEventId, providerEventId));
        return reply.status(200).send({ status: 'ok' });
      }

      // 7. Handle SUBSCRIBER_ALIAS
      if (eventType === 'SUBSCRIBER_ALIAS') {
        await app.db.update(schema.rcWebhookEvents)
          .set({ processed: true, processedAt: new Date(), normalizedStatus: 'alias_ignored' })
          .where(eq(schema.rcWebhookEvents.providerEventId, providerEventId));
        return reply.status(200).send({ status: 'ok' });
      }

      // 8. Normalize event to subscription state
      const normalized = normalizeRCEvent(event);
      if (!normalized) {
        await app.db.update(schema.rcWebhookEvents)
          .set({ processed: true, processedAt: new Date(), normalizedStatus: 'no_state_change' })
          .where(eq(schema.rcWebhookEvents.providerEventId, providerEventId));
        return reply.status(200).send({ status: 'ok' });
      }

      // 9. Out-of-order protection
      const currentProfile = await app.db
        .select({ subscriptionEndDate: schema.userProfiles.subscriptionEndDate, subscriptionStatus: schema.userProfiles.subscriptionStatus })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, resolvedUserId))
        .limit(1);

      if (currentProfile.length > 0) {
        const current = currentProfile[0];
        if (['refunded', 'revoked'].includes(current.subscriptionStatus ?? '') &&
            ['active', 'trialing', 'cancelled'].includes(normalized.subscriptionStatus)) {
          const currentEnd = current.subscriptionEndDate ? new Date(current.subscriptionEndDate) : null;
          if (currentEnd && normalized.subscriptionEndDate && normalized.subscriptionEndDate < currentEnd) {
            app.logger.info({ providerEventId }, '[RC Webhook] Stale event — skipping (out-of-order)');
            await app.db.update(schema.rcWebhookEvents)
              .set({ processed: true, processedAt: new Date(), normalizedStatus: 'skipped_stale' })
              .where(eq(schema.rcWebhookEvents.providerEventId, providerEventId));
            return reply.status(200).send({ status: 'skipped_stale' });
          }
        }
      }

      // 10. Apply state to user_profiles
      await app.db.update(schema.userProfiles)
        .set({
          accountType: normalized.accountType,
          subscriptionStatus: normalized.subscriptionStatus,
          trialStatus: normalized.trialStatus,
          paymentStatus: normalized.paymentStatus,
          subscriptionEndDate: normalized.subscriptionEndDate,
          updatedAt: new Date(),
        })
        .where(eq(schema.userProfiles.userId, resolvedUserId));

      // 11. Mark event processed
      await app.db.update(schema.rcWebhookEvents)
        .set({ processed: true, processedAt: new Date(), normalizedStatus: normalized.subscriptionStatus })
        .where(eq(schema.rcWebhookEvents.providerEventId, providerEventId));

      app.logger.info({ resolvedUserId, eventType, normalizedStatus: normalized.subscriptionStatus }, '[RC Webhook] Event processed successfully');
      return reply.status(200).send({ status: 'ok' });
    }
  );
}
