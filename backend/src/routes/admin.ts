import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and, count } from 'drizzle-orm';
import * as schema from '../db/schema.js';

async function requireAdminRole(
  request: FastifyRequest,
  reply: FastifyReply,
  requireAuth: (req: FastifyRequest, rep: FastifyReply) => Promise<any>
) {
  const session = await requireAuth(request, reply);
  if (!session) return null;

  const profile = await (request as any).app.db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, session.user.id))
    .limit(1);

  if (profile.length === 0 || profile[0].role !== 'admin') {
    reply.status(403).send({ error: 'Admin access required' });
    return null;
  }

  return session;
}

export function registerAdminRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/admin/users - Get all users (paginated)
  app.fastify.get(
    '/api/admin/users',
    {
      schema: {
        description: 'Get all users with profiles and subscriptions',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 50 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: ['string', 'null'] },
                    role: { type: 'string' },
                    isActive: { type: 'boolean' },
                    hasSubscription: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              total: { type: 'number' },
              page: { type: 'number' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdminRole(request, reply, requireAuth);
      if (!session) return;

      app.logger.info({ adminId: session.user.id, page: request.query.page }, 'Fetching users');

      try {
        const page = request.query.page || 1;
        const limit = Math.min(request.query.limit || 50, 100);
        const offset = (page - 1) * limit;

        const profiles = await app.db
          .select()
          .from(schema.userProfiles)
          .orderBy(desc(schema.userProfiles.createdAt))
          .limit(limit)
          .offset(offset);

        const users = await Promise.all(
          profiles.map(async (profile) => {
            const sub = await app.db
              .select()
              .from(schema.subscriptions)
              .where(
                and(
                  eq(schema.subscriptions.userId, profile.userId),
                  eq(schema.subscriptions.status, 'active')
                )
              )
              .limit(1);

            return {
              userId: profile.userId,
              email: '', // Would need to fetch from user table
              name: profile.fullName,
              role: profile.role,
              isActive: profile.isActive,
              hasSubscription: sub.length > 0,
              createdAt: profile.createdAt.toISOString(),
            };
          })
        );

        const [{ value: totalCount }] = await app.db
          .select({ value: count() })
          .from(schema.userProfiles);

        app.logger.info({ adminId: session.user.id, userCount: users.length }, 'Users fetched');
        return {
          users,
          total: totalCount || 0,
          page,
        };
      } catch (error) {
        app.logger.error({ err: error, adminId: session.user.id }, 'Failed to fetch users');
        return reply.status(500).send({ error: 'Failed to fetch users' });
      }
    }
  );

  // PATCH /api/admin/users/:userId - Update user (role, active status)
  app.fastify.patch(
    '/api/admin/users/:userId',
    {
      schema: {
        description: 'Update user role or active status',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['free', 'premium', 'admin'] },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { userId: string };
        Body: { role?: string; isActive?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdminRole(request, reply, requireAuth);
      if (!session) return;

      const { userId } = request.params;
      const { role, isActive } = request.body;

      app.logger.info({ adminId: session.user.id, targetUserId: userId }, 'Updating user');

      try {
        const profile = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, userId))
          .limit(1);

        if (profile.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }

        const updates: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (role) {
          if (!['free', 'premium', 'admin'].includes(role)) {
            return reply.status(400).send({ error: 'Invalid role' });
          }
          updates.role = role;
        }

        if (typeof isActive === 'boolean') {
          updates.isActive = isActive;
        }

        await app.db
          .update(schema.userProfiles)
          .set(updates)
          .where(eq(schema.userProfiles.userId, userId));

        app.logger.info(
          { adminId: session.user.id, targetUserId: userId, updates },
          'User updated'
        );
        return { message: 'User updated successfully' };
      } catch (error) {
        app.logger.error({ err: error, adminId: session.user.id }, 'Failed to update user');
        return reply.status(500).send({ error: 'Failed to update user' });
      }
    }
  );

  // GET /api/admin/subscriptions - Get all subscriptions
  app.fastify.get(
    '/api/admin/subscriptions',
    {
      schema: {
        description: 'Get all subscriptions',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 50 },
            status: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              subscriptions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    programType: { type: 'string' },
                    planType: { type: 'string' },
                    status: { type: 'string' },
                    amount: { type: 'number' },
                    startedAt: { type: 'string', format: 'date-time' },
                    expiresAt: { type: ['string', 'null'], format: 'date-time' },
                  },
                },
              },
              total: { type: 'number' },
              page: { type: 'number' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: number; limit?: number; status?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdminRole(request, reply, requireAuth);
      if (!session) return;

      app.logger.info({ adminId: session.user.id }, 'Fetching subscriptions');

      try {
        const page = request.query.page || 1;
        const limit = Math.min(request.query.limit || 50, 100);
        const offset = (page - 1) * limit;

        let subs: any[];
        if (request.query.status) {
          subs = await app.db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.status, request.query.status))
            .orderBy(desc(schema.subscriptions.createdAt))
            .limit(limit)
            .offset(offset);
        } else {
          subs = await app.db
            .select()
            .from(schema.subscriptions)
            .orderBy(desc(schema.subscriptions.createdAt))
            .limit(limit)
            .offset(offset);
        }

        app.logger.info({ adminId: session.user.id, subCount: subs.length }, 'Subscriptions fetched');
        return {
          subscriptions: subs.map((s) => ({
            id: s.id,
            userId: s.userId,
            programType: s.programType,
            planType: s.planType,
            status: s.status,
            amount: parseFloat(s.amount),
            startedAt: s.startedAt.toISOString(),
            expiresAt: s.expiresAt?.toISOString() || null,
          })),
          total: subs.length,
          page,
        };
      } catch (error) {
        app.logger.error({ err: error, adminId: session.user.id }, 'Failed to fetch subscriptions');
        return reply.status(500).send({ error: 'Failed to fetch subscriptions' });
      }
    }
  );

  // GET /api/admin/payments - Get payment transactions
  app.fastify.get(
    '/api/admin/payments',
    {
      schema: {
        description: 'Get payment transactions',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 50 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              transactions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    amount: { type: 'number' },
                    status: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              total: { type: 'number' },
              page: { type: 'number' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdminRole(request, reply, requireAuth);
      if (!session) return;

      app.logger.info({ adminId: session.user.id }, 'Fetching payments');

      try {
        const page = request.query.page || 1;
        const limit = Math.min(request.query.limit || 50, 100);
        const offset = (page - 1) * limit;

        const transactions = await app.db
          .select()
          .from(schema.paymentTransactions)
          .orderBy(desc(schema.paymentTransactions.createdAt))
          .limit(limit)
          .offset(offset);

        app.logger.info({ adminId: session.user.id, count: transactions.length }, 'Payments fetched');
        return {
          transactions: transactions.map((t) => ({
            id: t.id,
            userId: t.userId,
            amount: parseFloat(t.amount),
            status: t.status,
            createdAt: t.createdAt.toISOString(),
          })),
          total: transactions.length,
          page,
        };
      } catch (error) {
        app.logger.error({ err: error, adminId: session.user.id }, 'Failed to fetch payments');
        return reply.status(500).send({ error: 'Failed to fetch payments' });
      }
    }
  );

  // GET /api/admin/analytics/overview - Get analytics overview
  app.fastify.get(
    '/api/admin/analytics/overview',
    {
      schema: {
        description: 'Get analytics overview',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              totalUsers: { type: 'number' },
              activeSubscriptions: { type: 'number' },
              totalRevenue: { type: 'number' },
              averageSubscriptionValue: { type: 'number' },
              monthlyRecurringRevenue: { type: 'number' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAdminRole(request, reply, requireAuth);
      if (!session) return;

      app.logger.info({ adminId: session.user.id }, 'Fetching analytics');

      try {
        const [{ value: totalUsers }] = await app.db
          .select({ value: count() })
          .from(schema.userProfiles);

        const activeSubsResult = await app.db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.status, 'active'));

        const allTransactions = await app.db.select().from(schema.paymentTransactions);

        const totalRevenue = allTransactions.reduce((sum, t) => {
          if (t.status === 'succeeded') {
            return sum + parseFloat(t.amount);
          }
          return sum;
        }, 0);

        const averageSubscriptionValue =
          activeSubsResult.length > 0
            ? activeSubsResult.reduce((sum, s) => sum + parseFloat(s.amount), 0) / activeSubsResult.length
            : 0;

        const monthlyActive = activeSubsResult.filter((s) => s.planType === 'monthly');
        const monthlyRecurringRevenue = monthlyActive.reduce((sum, s) => {
          return sum + parseFloat(s.amount);
        }, 0);

        app.logger.info(
          { adminId: session.user.id, totalUsers, activeSubscriptions: activeSubsResult.length },
          'Analytics fetched'
        );

        return {
          totalUsers: parseInt(totalUsers.toString()),
          activeSubscriptions: activeSubsResult.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageSubscriptionValue: Math.round(averageSubscriptionValue * 100) / 100,
          monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
        };
      } catch (error) {
        app.logger.error({ err: error, adminId: session.user.id }, 'Failed to fetch analytics');
        return reply.status(500).send({ error: 'Failed to fetch analytics' });
      }
    }
  );

  // GET /api/admin/content/:key - Get content
  app.fastify.get(
    '/api/admin/content/:key',
    {
      schema: {
        description: 'Get content by key',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            key: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              content: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  title: { type: 'string' },
                  subtitle: { type: ['string', 'null'] },
                  content: { type: 'object' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { key: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdminRole(request, reply, requireAuth);
      if (!session) return;

      const { key } = request.params;
      app.logger.info({ adminId: session.user.id, contentKey: key }, 'Fetching content');

      try {
        const content = await app.db
          .select()
          .from(schema.appContent)
          .where(eq(schema.appContent.key, key))
          .limit(1);

        if (content.length === 0) {
          return reply.status(404).send({ error: 'Content not found' });
        }

        app.logger.info({ adminId: session.user.id, contentKey: key }, 'Content fetched');
        return {
          content: {
            key: content[0].key,
            title: content[0].title,
            subtitle: content[0].subtitle,
            content: content[0].content,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, adminId: session.user.id }, 'Failed to fetch content');
        return reply.status(500).send({ error: 'Failed to fetch content' });
      }
    }
  );

  // PATCH /api/admin/content/:key - Update content
  app.fastify.patch(
    '/api/admin/content/:key',
    {
      schema: {
        description: 'Update content',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            key: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            content: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { key: string };
        Body: { title?: string; subtitle?: string; content?: object };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdminRole(request, reply, requireAuth);
      if (!session) return;

      const { key } = request.params;
      const { title, subtitle, content } = request.body;

      app.logger.info({ adminId: session.user.id, contentKey: key }, 'Updating content');

      try {
        const existing = await app.db
          .select()
          .from(schema.appContent)
          .where(eq(schema.appContent.key, key))
          .limit(1);

        const updates: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (title) updates.title = title;
        if (subtitle) updates.subtitle = subtitle;
        if (content) updates.content = content;

        if (existing.length === 0) {
          if (!title) {
            return reply.status(400).send({ error: 'Title is required for new content' });
          }
          await app.db.insert(schema.appContent).values({
            key,
            title,
            subtitle,
            content,
          });
        } else {
          await app.db
            .update(schema.appContent)
            .set(updates)
            .where(eq(schema.appContent.key, key));
        }

        app.logger.info({ adminId: session.user.id, contentKey: key }, 'Content updated');
        return { message: 'Content updated successfully' };
      } catch (error) {
        app.logger.error({ err: error, adminId: session.user.id }, 'Failed to update content');
        return reply.status(500).send({ error: 'Failed to update content' });
      }
    }
  );
}
