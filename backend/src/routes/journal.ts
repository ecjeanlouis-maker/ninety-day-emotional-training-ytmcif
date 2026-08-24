import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, or, and, ilike } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerJournalRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get(
    '/api/journal',
    {
      schema: {
        description: 'List journal entries for the authenticated user',
        tags: ['journal'],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', maxLength: 200, description: 'Search entries by title or content' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    mood: { type: ['string', 'null'] },
                    tags: { type: 'array', items: { type: 'string' } },
                    is_private: { type: 'boolean' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
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
    async (
      request: FastifyRequest<{ Querystring: { search?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { search } = request.query as { search?: string };

      app.logger.info(
        { userId: session.user.id, search },
        'Fetching journal entries'
      );

      let whereCondition = eq(schema.journalEntries.userId, session.user.id);

      if (search) {
        whereCondition = and(
          eq(schema.journalEntries.userId, session.user.id),
          or(
            ilike(schema.journalEntries.title, `%${search}%`),
            ilike(schema.journalEntries.content, `%${search}%`)
          )
        );
      }

      const entries = await app.db
        .select()
        .from(schema.journalEntries)
        .where(whereCondition)
        .orderBy(desc(schema.journalEntries.createdAt))
        .limit(50);

      app.logger.info(
        { userId: session.user.id, count: entries.length },
        'Journal entries fetched successfully'
      );

      reply.send({ entries });
    }
  );

  app.fastify.post(
    '/api/journal',
    {
      schema: {
        description: 'Create a new journal entry',
        tags: ['journal'],
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 10000 },
            title: { type: 'string', maxLength: 200 },
            mood: { type: 'string', maxLength: 50 },
            tags: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 50 } },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              content: { type: 'string' },
              mood: { type: ['string', 'null'] },
              tags: { type: 'array', items: { type: 'string' } },
              is_private: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
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
          content?: string;
          title?: string;
          mood?: string;
          tags?: string[];
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { content, title = 'Untitled Entry', mood, tags = [] } = request.body;

      app.logger.info(
        { userId: session.user.id, title },
        'Creating journal entry'
      );

      if (!content || typeof content !== 'string') {
        app.logger.warn(
          { userId: session.user.id, contentType: typeof content },
          'Invalid content provided'
        );
        reply.status(400).send({ error: 'content is required and must be a string' });
        return;
      }

      const [created] = await app.db
        .insert(schema.journalEntries)
        .values({
          userId: session.user.id,
          title,
          content,
          mood,
          tags,
          isPrivate: true,
        })
        .returning();

      app.logger.info(
        { userId: session.user.id, entryId: created.id },
        'Journal entry created successfully'
      );

      reply.status(201).send(created);
    }
  );

  app.fastify.get(
    '/api/journal/:id',
    {
      schema: {
        description: 'Get a single journal entry',
        tags: ['journal'],
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
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              content: { type: 'string' },
              mood: { type: ['string', 'null'] },
              tags: { type: 'array', items: { type: 'string' } },
              is_private: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
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
        { userId: session.user.id, entryId: id },
        'Fetching journal entry'
      );

      const entry = await app.db
        .select()
        .from(schema.journalEntries)
        .where(and(
          eq(schema.journalEntries.id, id),
          eq(schema.journalEntries.userId, session.user.id)
        ))
        .limit(1);

      if (!entry.length) {
        app.logger.warn(
          { userId: session.user.id, entryId: id },
          'Journal entry not found'
        );
        reply.status(404).send({ error: 'Journal entry not found' });
        return;
      }

      app.logger.info(
        { userId: session.user.id, entryId: id },
        'Journal entry fetched successfully'
      );

      reply.send(entry[0]);
    }
  );

  app.fastify.put(
    '/api/journal/:id',
    {
      schema: {
        description: 'Update a journal entry',
        tags: ['journal'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 200 },
            content: { type: 'string', maxLength: 10000 },
            mood: { type: 'string', nullable: true, maxLength: 50 },
            tags: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 50 } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              content: { type: 'string' },
              mood: { type: ['string', 'null'] },
              tags: { type: 'array', items: { type: 'string' } },
              is_private: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
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
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          title?: string;
          content?: string;
          mood?: string | null;
          tags?: string[];
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { title, content, mood, tags } = request.body;

      app.logger.info(
        { userId: session.user.id, entryId: id },
        'Updating journal entry'
      );

      const entry = await app.db
        .select()
        .from(schema.journalEntries)
        .where(and(
          eq(schema.journalEntries.id, id),
          eq(schema.journalEntries.userId, session.user.id)
        ))
        .limit(1);

      if (!entry.length) {
        app.logger.warn(
          { userId: session.user.id, entryId: id },
          'Journal entry not found'
        );
        reply.status(404).send({ error: 'Journal entry not found' });
        return;
      }

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (mood !== undefined) updates.mood = mood;
      if (tags !== undefined) updates.tags = tags;
      updates.updatedAt = new Date();

      const [updated] = await app.db
        .update(schema.journalEntries)
        .set(updates)
        .where(and(
          eq(schema.journalEntries.id, id),
          eq(schema.journalEntries.userId, session.user.id)
        ))
        .returning();

      app.logger.info(
        { userId: session.user.id, entryId: id },
        'Journal entry updated successfully'
      );

      reply.send(updated);
    }
  );

  app.fastify.delete(
    '/api/journal/:id',
    {
      schema: {
        description: 'Delete a journal entry',
        tags: ['journal'],
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
        { userId: session.user.id, entryId: id },
        'Deleting journal entry'
      );

      const entry = await app.db
        .select()
        .from(schema.journalEntries)
        .where(and(
          eq(schema.journalEntries.id, id),
          eq(schema.journalEntries.userId, session.user.id)
        ))
        .limit(1);

      if (!entry.length) {
        app.logger.warn(
          { userId: session.user.id, entryId: id },
          'Journal entry not found'
        );
        reply.status(404).send({ error: 'Journal entry not found' });
        return;
      }

      await app.db
        .delete(schema.journalEntries)
        .where(and(
          eq(schema.journalEntries.id, id),
          eq(schema.journalEntries.userId, session.user.id)
        ));

      app.logger.info(
        { userId: session.user.id, entryId: id },
        'Journal entry deleted successfully'
      );

      reply.send({ success: true });
    }
  );
}
