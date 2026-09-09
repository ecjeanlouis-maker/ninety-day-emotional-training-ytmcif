import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { resolveEntitlement, syncFromRCCustomerInfo } from '../lib/entitlement.js';

export function registerEntitlementRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/entitlement — get normalized entitlement state
  app.fastify.get(
    '/api/entitlement',
    {
      schema: {
        description: 'Get normalized entitlement state for the authenticated user',
        tags: ['entitlement'],
        response: {
          200: {
            type: 'object',
            properties: {
              is_premium: { type: 'boolean' },
              status: { type: 'string' },
              valid_until: { type: 'string', nullable: true },
              reason: { type: 'string' },
              days_1_7_access: { type: 'boolean' },
              days_8_90_access: { type: 'boolean' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'GET /api/entitlement');
      const result = await resolveEntitlement(app, session.user.id);
      return reply.send({
        is_premium: result.isPremium,
        status: result.status,
        valid_until: result.validUntil,
        reason: result.reason,
        days_1_7_access: result.days_1_7_access,
        days_8_90_access: result.days_8_90_access,
      });
    }
  );

  // POST /api/subscription/sync — sync from RevenueCat customerInfo
  app.fastify.post(
    '/api/subscription/sync',
    {
      schema: {
        description: 'Sync subscription state from RevenueCat customerInfo',
        tags: ['entitlement'],
        body: {
          type: 'object',
          required: ['customerInfo'],
          properties: {
            customerInfo: {
              type: 'object',
              properties: {
                entitlements: {
                  type: 'object',
                  properties: {
                    active: {
                      type: 'object',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          expirationDate: { type: ['string', 'null'] },
                          periodType: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                originalAppUserId: { type: 'string' },
                activeSubscriptions: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              is_premium: { type: 'boolean' },
              status: { type: 'string' },
              valid_until: { type: 'string', nullable: true },
              reason: { type: 'string' },
              days_1_7_access: { type: 'boolean' },
              days_8_90_access: { type: 'boolean' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as { customerInfo?: any };
      if (!body.customerInfo) {
        app.logger.warn({ userId: session.user.id }, 'POST /api/subscription/sync - missing customerInfo');
        return reply.status(400).send({ error: 'customerInfo_required' });
      }

      app.logger.info({ userId: session.user.id }, 'POST /api/subscription/sync');

      // Sync the customer info
      await syncFromRCCustomerInfo(app, session.user.id, body.customerInfo);

      // Return updated entitlement state
      const result = await resolveEntitlement(app, session.user.id);
      return reply.send({
        is_premium: result.isPremium,
        status: result.status,
        valid_until: result.validUntil,
        reason: result.reason,
        days_1_7_access: result.days_1_7_access,
        days_8_90_access: result.days_8_90_access,
      });
    }
  );
}
