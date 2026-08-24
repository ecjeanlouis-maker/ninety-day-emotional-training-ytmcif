import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';

const ALLOWED_EVENT_NAMES = [
  'onboarding_started',
  'onboarding_completed',
  'account_created',
  'login_success',
  'assessment_completed',
  'day_viewed',
  'exercise_started',
  'exercise_completed',
  'day_completed',
  'reminder_enabled',
  'reminder_disabled',
  'reminder_opened',
  'paywall_viewed',
  'purchase_started',
  'purchase_canceled',
  'purchase_verification_pending',
  'purchase_verified',
  'purchase_failed',
  'restore_started',
  'restore_verified',
  'restore_failed',
  'journal_entry_created',
  'account_export_requested',
  'account_deletion_requested',
  'account_deletion_completed',
];

const ALWAYS_ALLOWED_EVENTS = [
  'account_created',
  'login_success',
  'account_export_requested',
  'account_deletion_requested',
  'account_deletion_completed',
];

const SENSITIVE_KEYS = ['text', 'content', 'reflection', 'emotion_text', 'trigger_note', 'notes', 'password', 'token', 'secret'];

function filterProperties(properties: any): any {
  if (!properties || typeof properties !== 'object') {
    return {};
  }

  const filtered: any = {};
  for (const [key, value] of Object.entries(properties)) {
    // Skip sensitive keys
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      continue;
    }

    // Skip values longer than 500 characters
    if (typeof value === 'string' && value.length > 500) {
      filtered[key] = value.substring(0, 500);
      continue;
    }

    filtered[key] = value;
  }
  return filtered;
}

export function registerAnalyticsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/analytics/events - Ingest analytics events in batch
  app.fastify.post(
    '/api/analytics/events',
    {
      schema: {
        description: 'Ingest analytics events in batch',
        tags: ['analytics'],
        body: {
          type: 'object',
          required: ['events'],
          properties: {
            events: {
              type: 'array',
              maxItems: 20,
              items: {
                type: 'object',
                required: ['event_name'],
                properties: {
                  event_name: { type: 'string', maxLength: 100 },
                  properties: { type: 'object' },
                  session_id: { type: 'string', maxLength: 100, nullable: true },
                  platform: { type: 'string', enum: ['ios', 'android', 'web'], nullable: true },
                  app_version: { type: 'string', maxLength: 50, nullable: true },
                  timestamp: { type: 'string', maxLength: 30, nullable: true },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Events ingested',
            type: 'object',
            properties: {
              accepted: { type: 'integer' },
              rejected: { type: 'integer' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          events: Array<{
            event_name: string;
            properties?: any;
            session_id?: string;
            platform?: 'ios' | 'android' | 'web';
            app_version?: string;
            timestamp?: string;
          }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const events = request.body.events || [];

      app.logger.info({ userId, eventCount: events.length }, 'Processing analytics events batch');

      // Get user's consent
      const consentRecord = await app.db.query.analyticsConsent.findFirst({
        where: eq(schema.analyticsConsent.userId, userId),
      });
      const consentEnabled = consentRecord?.usageAnalyticsEnabled ?? true;

      let accepted = 0;
      let rejected = 0;

      for (const event of events) {
        // Validate event name
        if (!ALLOWED_EVENT_NAMES.includes(event.event_name)) {
          rejected++;
          continue;
        }

        // Check consent unless event is always-allowed
        if (!ALWAYS_ALLOWED_EVENTS.includes(event.event_name) && !consentEnabled) {
          rejected++;
          continue;
        }

        try {
          // Filter properties
          const filteredProps = filterProperties(event.properties || {});

          // Parse timestamp if provided, otherwise use now
          let createdAt = new Date();
          if (event.timestamp) {
            const parsed = new Date(event.timestamp);
            if (!isNaN(parsed.getTime())) {
              createdAt = parsed;
            }
          }

          await app.db.insert(schema.analyticsEvents).values({
            userId,
            eventName: event.event_name,
            properties: filteredProps,
            sessionId: event.session_id || null,
            platform: event.platform || null,
            appVersion: event.app_version || null,
            createdAt,
          });

          accepted++;
        } catch (error) {
          app.logger.error({ err: error, eventName: event.event_name }, 'Failed to insert analytics event');
          rejected++;
        }
      }

      app.logger.info({ userId, accepted, rejected }, 'Analytics events batch processed');
      return { accepted, rejected };
    }
  );

  // GET /api/analytics/consent - Get analytics consent status
  app.fastify.get(
    '/api/analytics/consent',
    {
      schema: {
        description: 'Get analytics consent status for the current user',
        tags: ['analytics'],
        response: {
          200: {
            description: 'Analytics consent status',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              usageAnalyticsEnabled: { type: 'boolean' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching analytics consent');

      const consent = await app.db.query.analyticsConsent.findFirst({
        where: eq(schema.analyticsConsent.userId, userId),
      });

      // Return default (enabled) if no record exists
      if (consent) {
        return consent;
      }

      return {
        id: undefined,
        userId,
        usageAnalyticsEnabled: true,
        updatedAt: new Date(),
      };
    }
  );

  // PUT /api/analytics/consent - Update analytics consent
  app.fastify.put(
    '/api/analytics/consent',
    {
      schema: {
        description: 'Update analytics consent for the current user',
        tags: ['analytics'],
        body: {
          type: 'object',
          required: ['usage_analytics_enabled'],
          properties: {
            usage_analytics_enabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Updated consent',
            type: 'object',
            properties: {
              usage_analytics_enabled: { type: 'boolean' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { usage_analytics_enabled: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { usage_analytics_enabled } = request.body;

      app.logger.info({ userId, enabled: usage_analytics_enabled }, 'Updating analytics consent');

      // Check if record exists
      const existing = await app.db.query.analyticsConsent.findFirst({
        where: eq(schema.analyticsConsent.userId, userId),
      });

      if (existing) {
        await app.db
          .update(schema.analyticsConsent)
          .set({
            usageAnalyticsEnabled: usage_analytics_enabled,
            updatedAt: new Date(),
          })
          .where(eq(schema.analyticsConsent.userId, userId));
      } else {
        await app.db.insert(schema.analyticsConsent).values({
          userId,
          usageAnalyticsEnabled: usage_analytics_enabled,
          updatedAt: new Date(),
        });
      }

      app.logger.info({ userId, enabled: usage_analytics_enabled }, 'Analytics consent updated successfully');
      return { usage_analytics_enabled };
    }
  );

  // GET /api/analytics/admin/summary - Admin analytics summary
  app.fastify.get(
    '/api/analytics/admin/summary',
    {
      schema: {
        description: 'Get aggregated analytics summary (admin only)',
        tags: ['analytics'],
        response: {
          200: {
            description: 'Analytics summary',
            type: 'object',
            properties: {
              active_users_7d: { type: 'integer' },
              active_users_30d: { type: 'integer' },
              onboarding_started: { type: 'integer' },
              onboarding_completed: { type: 'integer' },
              day_1_completed: { type: 'integer' },
              day_7_completed: { type: 'integer' },
              paywall_viewed: { type: 'integer' },
              purchase_verified: { type: 'integer' },
              reminder_enabled: { type: 'integer' },
              reminder_opened: { type: 'integer' },
              paywall_conversion_rate: { type: 'number' },
              purchase_verified_count: { type: 'integer' },
              reminder_open_rate: { type: 'number' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            description: 'Forbidden',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      // Check if user is admin
      const profile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, userId),
      });

      if (!profile || profile.role !== 'admin') {
        app.logger.warn({ userId }, 'Non-admin user attempted to access analytics summary');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      app.logger.info({ userId }, 'Fetching analytics summary');

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Query analytics data
      const allEvents = await app.db
        .select()
        .from(schema.analyticsEvents)
        .where(sql`${schema.analyticsEvents.createdAt} >= ${thirtyDaysAgo}`);

      const activeUsers7d = new Set(
        allEvents
          .filter((e) => e.createdAt >= sevenDaysAgo)
          .map((e) => e.userId)
      ).size;

      const activeUsers30d = new Set(allEvents.map((e) => e.userId)).size;

      const countByEvent = (eventName: string, minDate: Date = thirtyDaysAgo) =>
        allEvents.filter((e) => e.eventName === eventName && e.createdAt >= minDate).length;

      const onboardingStarted = countByEvent('onboarding_started');
      const onboardingCompleted = countByEvent('onboarding_completed');
      const day1Completed = countByEvent('day_1_completed');
      const day7Completed = countByEvent('day_7_completed');
      const paywallViewed = countByEvent('paywall_viewed');
      const purchaseVerified = countByEvent('purchase_verified');
      const reminderEnabled = countByEvent('reminder_enabled');
      const reminderOpened = countByEvent('reminder_opened');

      const paywallConversionRate =
        paywallViewed > 0 ? (purchaseVerified / paywallViewed) * 100 : 0;
      const reminderOpenRate = reminderEnabled > 0 ? (reminderOpened / reminderEnabled) * 100 : 0;

      app.logger.info(
        {
          activeUsers7d,
          activeUsers30d,
          onboardingStarted,
          onboardingCompleted,
        },
        'Analytics summary retrieved'
      );

      return {
        active_users_7d: activeUsers7d,
        active_users_30d: activeUsers30d,
        onboarding_started: onboardingStarted,
        onboarding_completed: onboardingCompleted,
        day_1_completed: day1Completed,
        day_7_completed: day7Completed,
        paywall_viewed: paywallViewed,
        purchase_verified: purchaseVerified,
        reminder_enabled: reminderEnabled,
        reminder_opened: reminderOpened,
        paywall_conversion_rate: Math.round(paywallConversionRate * 100) / 100,
        purchase_verified_count: purchaseVerified,
        reminder_open_rate: Math.round(reminderOpenRate * 100) / 100,
      };
    }
  );
}
