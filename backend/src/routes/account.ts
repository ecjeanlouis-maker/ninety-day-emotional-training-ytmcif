import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { resolveEntitlement } from '../lib/entitlement.js';

export function registerAccountRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/account/export - Export all user data as JSON file
  app.fastify.get(
    '/api/account/export',
    {
      schema: {
        description: 'Export all user data as JSON file',
        tags: ['account'],
        response: {
          200: {
            description: 'User data export',
            type: 'object',
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
      app.logger.info({ userId }, 'Exporting user data');

      try {
        // Fetch all user data
        const profile = await app.db.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.userId, userId),
        });

        const onboarding = await app.db.query.userOnboarding.findFirst({
          where: eq(schema.userOnboarding.userId, userId),
        });

        const progress = await app.db.query.userProgress.findFirst({
          where: eq(schema.userProgress.userId, userId),
        });

        const dayProgress = await app.db
          .select()
          .from(schema.userDayProgress)
          .where(eq(schema.userDayProgress.userId, userId));

        const checkins = await app.db
          .select()
          .from(schema.emotionalCheckins)
          .where(eq(schema.emotionalCheckins.userId, userId));

        const journalEntries = await app.db
          .select()
          .from(schema.journalEntries)
          .where(eq(schema.journalEntries.userId, userId));

        const reminderPrefs = await app.db.query.userReminderPrefs.findFirst({
          where: eq(schema.userReminderPrefs.userId, userId),
        });

        const analyticsConsent = await app.db.query.analyticsConsent.findFirst({
          where: eq(schema.analyticsConsent.userId, userId),
        });

        // Get entitlement data
        const entitlement = await resolveEntitlement(app, userId);

        const exportData = {
          exportDate: new Date().toISOString(),
          profile,
          onboarding,
          progress,
          dayProgress,
          checkins,
          journalEntries,
          reminderPreferences: reminderPrefs,
          analyticsConsent,
          entitlementSummary: {
            isPremium: entitlement.isPremium,
            status: entitlement.status,
            validUntil: entitlement.validUntil,
            reason: entitlement.reason,
          },
          note: 'Subscription billing records are managed by your payment provider',
        };

        app.logger.info({ userId }, 'User data exported successfully');

        reply.header('Content-Disposition', 'attachment; filename=control-confidence-data-export.json');
        reply.header('Content-Type', 'application/json');
        return exportData;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to export user data');
        throw error;
      }
    }
  );

  // POST /api/account/delete - Schedule account deletion
  app.fastify.post(
    '/api/account/delete',
    {
      schema: {
        description: 'Schedule account deletion (30 days)',
        tags: ['account'],
        body: {
          type: 'object',
          required: ['confirmation'],
          properties: {
            confirmation: { type: 'string', maxLength: 50 },
          },
        },
        response: {
          200: {
            description: 'Account deletion scheduled',
            type: 'object',
            properties: {
              status: { type: 'string' },
              scheduled_deletion_at: { type: 'string', format: 'date-time' },
              message: { type: 'string' },
              billing_note: { type: 'string' },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: { error: { type: 'string' } },
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
      request: FastifyRequest<{ Body: { confirmation: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { confirmation } = request.body;

      app.logger.info({ userId }, 'Account deletion requested');

      // Validate confirmation
      if (confirmation !== 'DELETE MY ACCOUNT') {
        return reply.status(400).send({ error: 'Confirmation text must be exactly "DELETE MY ACCOUNT"' });
      }

      try {
        // Check for existing pending deletion
        const existingDeletion = await app.db.query.accountDeletionRequests.findFirst({
          where: eq(schema.accountDeletionRequests.userId, userId),
        });

        if (existingDeletion && existingDeletion.status === 'pending') {
          app.logger.warn({ userId, deletionId: existingDeletion.id }, 'Pending deletion already exists');
          return {
            status: 'pending',
            scheduled_deletion_at: existingDeletion.scheduledDeletionAt.toISOString(),
            message: 'Your account deletion is already scheduled',
            billing_note:
              'Please cancel your subscription manually through the App Store or Google Play if applicable',
          };
        }

        // Create deletion request
        const now = new Date();
        const scheduledDeletionAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const deletionRequest = await app.db
          .insert(schema.accountDeletionRequests)
          .values({
            userId,
            requestedAt: now,
            scheduledDeletionAt,
            status: 'pending',
            billingNote: 'User requested account deletion',
          })
          .returning();

        // Immediately delete personal data
        app.logger.info({ userId }, 'Deleting user personal data');

        await app.db
          .delete(schema.journalEntries)
          .where(eq(schema.journalEntries.userId, userId));

        await app.db
          .delete(schema.emotionalCheckins)
          .where(eq(schema.emotionalCheckins.userId, userId));

        await app.db
          .delete(schema.userDayProgress)
          .where(eq(schema.userDayProgress.userId, userId));

        await app.db
          .delete(schema.userProgress)
          .where(eq(schema.userProgress.userId, userId));

        await app.db
          .delete(schema.userOnboarding)
          .where(eq(schema.userOnboarding.userId, userId));

        await app.db
          .delete(schema.userReminderPrefs)
          .where(eq(schema.userReminderPrefs.userId, userId));

        // Anonymize analytics events
        app.logger.info({ userId }, 'Anonymizing analytics events');
        const anonymizedUserId = 'deleted_' + userId.substring(0, 8);

        await app.db
          .update(schema.analyticsEvents)
          .set({ userId: anonymizedUserId })
          .where(eq(schema.analyticsEvents.userId, userId));

        // Update user profile
        await app.db
          .update(schema.userProfiles)
          .set({
            accountType: 'deleted',
            subscriptionStatus: 'deleted',
            updatedAt: new Date(),
          })
          .where(eq(schema.userProfiles.userId, userId));

        app.logger.info(
          { userId, deletionId: deletionRequest[0].id, scheduledDeletionAt },
          'Account deletion scheduled successfully'
        );

        return {
          status: 'pending',
          scheduled_deletion_at: scheduledDeletionAt.toISOString(),
          message: 'Your account will be deleted in 30 days',
          billing_note:
            'Please cancel your subscription manually through the App Store or Google Play if applicable',
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to schedule account deletion');
        throw error;
      }
    }
  );

  // POST /api/account/delete/cancel - Cancel pending account deletion
  app.fastify.post(
    '/api/account/delete/cancel',
    {
      schema: {
        description: 'Cancel pending account deletion',
        tags: ['account'],
        response: {
          200: {
            description: 'Deletion cancelled',
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'No pending deletion found',
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
      app.logger.info({ userId }, 'Canceling account deletion');

      try {
        const pendingDeletion = await app.db.query.accountDeletionRequests.findFirst({
          where: eq(schema.accountDeletionRequests.userId, userId),
        });

        if (!pendingDeletion || pendingDeletion.status !== 'pending') {
          return reply.status(404).send({ error: 'No pending account deletion found' });
        }

        await app.db
          .update(schema.accountDeletionRequests)
          .set({
            status: 'cancelled',
            completedAt: new Date(),
          })
          .where(eq(schema.accountDeletionRequests.id, pendingDeletion.id));

        app.logger.info({ userId, deletionId: pendingDeletion.id }, 'Account deletion cancelled successfully');

        return { status: 'cancelled' };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to cancel account deletion');
        throw error;
      }
    }
  );

  // PATCH /api/account/display-name - Update user display name
  app.fastify.patch(
    '/api/account/display-name',
    {
      schema: {
        description: 'Update user display name',
        tags: ['account'],
        body: {
          type: 'object',
          required: ['display_name'],
          properties: {
            display_name: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        response: {
          200: {
            description: 'Display name updated',
            type: 'object',
            properties: {
              display_name: { type: 'string' },
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
      request: FastifyRequest<{ Body: { display_name: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { display_name } = request.body;

      app.logger.info({ userId, displayName: display_name }, 'Updating display name');

      try {
        await app.db
          .update(schema.userProfiles)
          .set({
            fullName: display_name,
            updatedAt: new Date(),
          })
          .where(eq(schema.userProfiles.userId, userId));

        app.logger.info({ userId, displayName: display_name }, 'Display name updated successfully');

        return { display_name };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to update display name');
        throw error;
      }
    }
  );

  // POST /api/account/sign-out-all - Revoke all sessions
  app.fastify.post(
    '/api/account/sign-out-all',
    {
      schema: {
        description: 'Sign out from all devices by revoking all sessions',
        tags: ['account'],
        response: {
          200: {
            description: 'All sessions revoked',
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' },
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
      app.logger.info({ userId }, 'Revoking all sessions');

      try {
        // Convert Fastify headers to standard Headers
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) {
            headers.append(key, Array.isArray(value) ? value[0] : value);
          }
        });

        // Revoke all sessions using Better Auth
        await (app as any).auth.api.revokeSessions({ headers });

        app.logger.info({ userId }, 'All sessions revoked successfully');

        return {
          status: 'ok',
          message: 'All sessions have been revoked.',
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to revoke all sessions');
        throw error;
      }
    }
  );
}
