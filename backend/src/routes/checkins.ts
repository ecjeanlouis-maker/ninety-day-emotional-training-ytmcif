import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerCheckinRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get(
    '/api/checkins',
    {
      schema: {
        description: 'Get the last 20 emotional check-ins for the authenticated user',
        tags: ['checkins'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, maximum: 10000, default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              checkins: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    emotion: { type: 'string' },
                    intensity: { type: 'integer' },
                    trigger_note: { type: ['string', 'null'] },
                    chosen_response: { type: ['string', 'null'] },
                    notes: { type: ['string', 'null'] },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const rawLimit = request.query.limit ?? 20;
      const rawOffset = request.query.offset ?? 0;
      if (rawLimit > 100) {
        return reply.status(400).send({ error: 'limit must not exceed 100' });
      }
      const limit = Math.min(rawLimit, 100);
      const offset = Math.min(rawOffset, 10000);

      app.logger.info({ userId: session.user.id }, 'Fetching check-ins');

      const checkins = await app.db
        .select()
        .from(schema.emotionalCheckins)
        .where(eq(schema.emotionalCheckins.userId, session.user.id))
        .orderBy(desc(schema.emotionalCheckins.createdAt))
        .limit(limit)
        .offset(offset);

      app.logger.info(
        { userId: session.user.id, count: checkins.length },
        'Check-ins fetched successfully'
      );

      reply.send({ checkins });
    }
  );

  app.fastify.post(
    '/api/checkins',
    {
      schema: {
        description: 'Create a new emotional check-in',
        tags: ['checkins'],
        body: {
          type: 'object',
          required: ['emotion'],
          properties: {
            emotion: { type: 'string', minLength: 1, maxLength: 100 },
            intensity: { type: 'integer', minimum: 1, maximum: 10 },
            trigger_note: { type: 'string', maxLength: 500 },
            chosen_response: { type: 'string', maxLength: 500 },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              emotion: { type: 'string' },
              intensity: { type: 'integer' },
              trigger_note: { type: ['string', 'null'] },
              chosen_response: { type: ['string', 'null'] },
              notes: { type: ['string', 'null'] },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          emotion?: string;
          intensity?: number;
          trigger_note?: string;
          chosen_response?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { emotion, intensity, trigger_note, chosen_response, notes } = request.body;

      app.logger.info(
        { userId: session.user.id, emotion, intensity },
        'Creating check-in'
      );

      if (!emotion || typeof emotion !== 'string' || emotion.length > 100) {
        return reply.status(400).send({ error: 'emotion is invalid' });
      }
      if (trigger_note !== undefined && (typeof trigger_note !== 'string' || trigger_note.length > 500)) {
        return reply.status(400).send({ error: 'trigger_note is invalid' });
      }
      if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
        return reply.status(400).send({ error: 'notes is invalid' });
      }
      if (chosen_response !== undefined && (typeof chosen_response !== 'string' || chosen_response.length > 500)) {
        return reply.status(400).send({ error: 'chosen_response is invalid' });
      }
      if (intensity !== undefined && (typeof intensity !== 'number' || intensity < 1 || intensity > 10)) {
        return reply.status(400).send({ error: 'intensity is invalid' });
      }

      const [created] = await app.db
        .insert(schema.emotionalCheckins)
        .values({
          userId: session.user.id,
          emotion,
          intensity: intensity ?? 3,
          triggerNote: trigger_note,
          chosenResponse: chosen_response,
          notes,
        })
        .returning();

      app.logger.info(
        { userId: session.user.id, checkinId: created.id },
        'Check-in created successfully'
      );

      reply.status(201).send(created);
    }
  );

  app.fastify.delete(
    '/api/checkins/:id',
    {
      schema: {
        description: 'Delete an emotional check-in',
        tags: ['checkins'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;

      app.logger.info(
        { userId: session.user.id, checkinId: id },
        'Deleting check-in'
      );

      const checkin = await app.db
        .select()
        .from(schema.emotionalCheckins)
        .where(and(
          eq(schema.emotionalCheckins.id, id),
          eq(schema.emotionalCheckins.userId, session.user.id)
        ))
        .limit(1);

      if (!checkin.length) {
        app.logger.warn(
          { userId: session.user.id, checkinId: id },
          'Check-in not found'
        );
        reply.status(404).send({ error: 'Check-in not found' });
        return;
      }

      await app.db
        .delete(schema.emotionalCheckins)
        .where(and(
          eq(schema.emotionalCheckins.id, id),
          eq(schema.emotionalCheckins.userId, session.user.id)
        ));

      app.logger.info(
        { userId: session.user.id, checkinId: id },
        'Check-in deleted successfully'
      );

      reply.send({ success: true });
    }
  );
}
