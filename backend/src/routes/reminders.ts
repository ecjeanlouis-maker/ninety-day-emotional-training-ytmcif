import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerReminderRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/reminders/prefs - Get user's reminder preferences
  app.fastify.get(
    '/api/reminders/prefs',
    {
      schema: {
        description: 'Get reminder preferences for the current user',
        tags: ['reminders'],
        response: {
          200: {
            description: 'Reminder preferences',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              enabled: { type: 'boolean' },
              reminderTime: { type: 'string' },
              timezone: { type: 'string' },
              activeDays: { type: 'array', items: { type: 'integer' } },
              quietHoursStart: { type: 'string', nullable: true },
              quietHoursEnd: { type: 'string', nullable: true },
              missedDayReminder: { type: 'boolean' },
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
      app.logger.info({ userId }, 'Fetching reminder preferences');

      const existing = await app.db.query.userReminderPrefs.findFirst({
        where: eq(schema.userReminderPrefs.userId, userId),
      });

      if (existing) {
        return existing;
      }

      // Return defaults if no preferences exist
      return {
        id: undefined,
        userId,
        enabled: false,
        reminderTime: '08:00',
        timezone: 'UTC',
        activeDays: [1, 2, 3, 4, 5, 6, 7],
        quietHoursStart: null,
        quietHoursEnd: null,
        missedDayReminder: false,
        updatedAt: new Date(),
      };
    }
  );

  // PUT /api/reminders/prefs - Update reminder preferences
  app.fastify.put(
    '/api/reminders/prefs',
    {
      schema: {
        description: 'Update reminder preferences for the current user',
        tags: ['reminders'],
        body: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            reminderTime: { type: 'string', maxLength: 5 },
            timezone: { type: 'string', maxLength: 100 },
            activeDays: { type: 'array', items: { type: 'integer' }, maxItems: 7 },
            quietHoursStart: { type: 'string', nullable: true, maxLength: 5 },
            quietHoursEnd: { type: 'string', nullable: true, maxLength: 5 },
            missedDayReminder: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Updated reminder preferences',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              enabled: { type: 'boolean' },
              reminderTime: { type: 'string' },
              timezone: { type: 'string' },
              activeDays: { type: 'array', items: { type: 'integer' } },
              quietHoursStart: { type: 'string', nullable: true },
              quietHoursEnd: { type: 'string', nullable: true },
              missedDayReminder: { type: 'boolean' },
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
    async (
      request: FastifyRequest<{
        Body: {
          enabled?: boolean;
          reminderTime?: string;
          timezone?: string;
          activeDays?: number[];
          quietHoursStart?: string | null;
          quietHoursEnd?: string | null;
          missedDayReminder?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const body = request.body;

      app.logger.info({ userId, body }, 'Updating reminder preferences');

      const updateData: any = { updatedAt: new Date() };
      if (body.enabled !== undefined) updateData.enabled = body.enabled;
      if (body.reminderTime !== undefined) updateData.reminderTime = body.reminderTime;
      if (body.timezone !== undefined) updateData.timezone = body.timezone;
      if (body.activeDays !== undefined) updateData.activeDays = body.activeDays;
      if (body.quietHoursStart !== undefined) updateData.quietHoursStart = body.quietHoursStart;
      if (body.quietHoursEnd !== undefined) updateData.quietHoursEnd = body.quietHoursEnd;
      if (body.missedDayReminder !== undefined) updateData.missedDayReminder = body.missedDayReminder;

      // Check if preferences exist
      const existing = await app.db.query.userReminderPrefs.findFirst({
        where: eq(schema.userReminderPrefs.userId, userId),
      });

      let result;
      if (existing) {
        // Update existing
        const updated = await app.db
          .update(schema.userReminderPrefs)
          .set(updateData)
          .where(eq(schema.userReminderPrefs.userId, userId))
          .returning();
        result = updated[0];
      } else {
        // Insert new
        const inserted = await app.db
          .insert(schema.userReminderPrefs)
          .values({
            userId,
            enabled: updateData.enabled ?? false,
            reminderTime: updateData.reminderTime ?? '08:00',
            timezone: updateData.timezone ?? 'UTC',
            activeDays: updateData.activeDays ?? [1, 2, 3, 4, 5, 6, 7],
            quietHoursStart: updateData.quietHoursStart ?? null,
            quietHoursEnd: updateData.quietHoursEnd ?? null,
            missedDayReminder: updateData.missedDayReminder ?? false,
            updatedAt: new Date(),
          })
          .returning();
        result = inserted[0];
      }

      app.logger.info({ userId, prefsId: result.id }, 'Reminder preferences updated successfully');
      return result;
    }
  );
}
