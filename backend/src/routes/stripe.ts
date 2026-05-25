import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { getStripe, isStripeConfigured, getStripePriceIds } from '../lib/stripe.js';
import { requireAuthUserId } from '../lib/auth.js';

export function registerStripeRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/stripe/plans - Get available plans
  app.fastify.get(
    '/api/stripe/plans',
    {
      schema: {
        description: 'Get available subscription plans',
        tags: ['stripe'],
        response: {
          200: {
            type: 'object',
            properties: {
              plans: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    priceId: { type: 'string' },
                    productId: { type: 'string' },
                    planType: { type: 'string' },
                    programType: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                    recurring: {
                      type: 'object',
                      properties: {
                        interval: { type: 'string' },
                        interval_count: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          503: {
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
      app.logger.info('Fetching available plans');

      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      try {
        const prices = await getStripePriceIds();
        app.logger.info({ priceCount: prices.length }, 'Plans fetched successfully');
        return { plans: prices };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch plans');
        return reply.status(500).send({ error: 'Failed to fetch plans' });
      }
    }
  );

  // POST /api/stripe/checkout-session - Create checkout session
  app.fastify.post(
    '/api/stripe/checkout-session',
    {
      schema: {
        description: 'Create a Stripe checkout session',
        tags: ['stripe'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['priceId'],
          properties: {
            priceId: { type: 'string', description: 'Stripe price ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              url: { type: ['string', 'null'] },
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
          503: {
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
        Body: { priceId: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { priceId } = request.body;

      app.logger.info({ userId, priceId }, 'Creating checkout session');

      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      try {
        const stripe = getStripe();

        // Get or create Stripe customer
        let customerId: string;
        const existing = await app.db
          .select()
          .from(schema.stripeCustomers)
          .where(eq(schema.stripeCustomers.userId, userId))
          .limit(1);

        if (existing.length > 0) {
          customerId = existing[0].stripeCustomerId;
        } else {
          const customer = await stripe.customers.create({
            email: session.user.email,
            metadata: { userId },
          });
          customerId = customer.id;

          await app.db.insert(schema.stripeCustomers).values({
            userId,
            stripeCustomerId: customerId,
          });
        }

        // Create checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancel`,
          billing_address_collection: 'required',
        });

        app.logger.info({ userId, sessionId: checkoutSession.id }, 'Checkout session created');
        return {
          sessionId: checkoutSession.id,
          url: checkoutSession.url,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to create checkout session');
        return reply.status(500).send({ error: 'Failed to create checkout session' });
      }
    }
  );

  // POST /api/stripe/billing-portal - Create billing portal session
  app.fastify.post(
    '/api/stripe/billing-portal',
    {
      schema: {
        description: 'Create a Stripe billing portal session',
        tags: ['stripe'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          503: {
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Creating billing portal session');

      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      try {
        const stripe = getStripe();
        const existing = await app.db
          .select()
          .from(schema.stripeCustomers)
          .where(eq(schema.stripeCustomers.userId, userId))
          .limit(1);

        if (existing.length === 0) {
          return reply.status(404).send({ error: 'No billing information found' });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: existing[0].stripeCustomerId,
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/account/billing`,
        });

        app.logger.info({ userId }, 'Billing portal session created');
        return { url: portalSession.url };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to create billing portal session');
        return reply.status(500).send({ error: 'Failed to create billing portal session' });
      }
    }
  );

  // GET /api/stripe/subscription - Get subscription status
  app.fastify.get(
    '/api/stripe/subscription',
    {
      schema: {
        description: 'Get current subscription status',
        tags: ['stripe'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              subscription: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  programType: { type: 'string' },
                  planType: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  startedAt: { type: 'string', format: 'date-time' },
                  expiresAt: { type: ['string', 'null'], format: 'date-time' },
                },
              },
            },
          },
          401: {
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching subscription');

      try {
        const subs = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, userId),
              eq(schema.subscriptions.status, 'active')
            )
          )
          .limit(1);

        if (subs.length === 0) {
          return reply.status(404).send({ error: 'No active subscription' });
        }

        const sub = subs[0];
        app.logger.info({ userId, subscriptionId: sub.id }, 'Subscription fetched');
        return {
          subscription: {
            id: sub.id,
            programType: sub.programType,
            planType: sub.planType,
            status: sub.status,
            amount: parseFloat(sub.amount),
            startedAt: sub.startedAt.toISOString(),
            expiresAt: sub.expiresAt?.toISOString() || null,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch subscription');
        return reply.status(500).send({ error: 'Failed to fetch subscription' });
      }
    }
  );

  // GET /api/stripe/billing-history - Get billing history
  app.fastify.get(
    '/api/stripe/billing-history',
    {
      schema: {
        description: 'Get billing transaction history',
        tags: ['stripe'],
        security: [{ bearerAuth: [] }],
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
                    amount: { type: 'number' },
                    status: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: {
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching billing history');

      try {
        const transactions = await app.db
          .select()
          .from(schema.paymentTransactions)
          .where(eq(schema.paymentTransactions.userId, userId))
          .orderBy(desc(schema.paymentTransactions.createdAt))
          .limit(50);

        app.logger.info({ userId, count: transactions.length }, 'Billing history fetched');
        return {
          transactions: transactions.map((t) => ({
            id: t.id,
            amount: parseFloat(t.amount),
            status: t.status,
            description: t.description,
            createdAt: t.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch billing history');
        return reply.status(500).send({ error: 'Failed to fetch billing history' });
      }
    }
  );

  // POST /api/stripe/cancel - Cancel subscription
  app.fastify.post(
    '/api/stripe/cancel',
    {
      schema: {
        description: 'Cancel active subscription',
        tags: ['stripe'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          503: {
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Canceling subscription');

      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      try {
        const stripe = getStripe();
        const subs = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, userId),
              eq(schema.subscriptions.status, 'active')
            )
          )
          .limit(1);

        if (subs.length === 0) {
          return reply.status(404).send({ error: 'No active subscription' });
        }

        const sub = subs[0];
        if (sub.stripeSubscriptionId) {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        }

        await app.db
          .update(schema.subscriptions)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, sub.id));

        app.logger.info({ userId, subscriptionId: sub.id }, 'Subscription cancelled');
        return { message: 'Subscription cancelled successfully' };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to cancel subscription');
        return reply.status(500).send({ error: 'Failed to cancel subscription' });
      }
    }
  );

  // POST /api/stripe/resume - Resume cancelled subscription
  app.fastify.post(
    '/api/stripe/resume',
    {
      schema: {
        description: 'Resume cancelled subscription',
        tags: ['stripe'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          503: {
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Resuming subscription');

      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      try {
        const stripe = getStripe();
        const subs = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, userId),
              eq(schema.subscriptions.status, 'cancelled')
            )
          )
          .orderBy(desc(schema.subscriptions.cancelledAt))
          .limit(1);

        if (subs.length === 0) {
          return reply.status(404).send({ error: 'No cancelled subscription to resume' });
        }

        const sub = subs[0];
        if (sub.stripeSubscriptionId) {
          await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            pause_collection: null,
          });
        }

        await app.db
          .update(schema.subscriptions)
          .set({
            status: 'active',
            cancelledAt: null,
          })
          .where(eq(schema.subscriptions.id, sub.id));

        app.logger.info({ userId, subscriptionId: sub.id }, 'Subscription resumed');
        return { message: 'Subscription resumed successfully' };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to resume subscription');
        return reply.status(500).send({ error: 'Failed to resume subscription' });
      }
    }
  );

  // POST /api/stripe/change-plan - Change subscription plan
  app.fastify.post(
    '/api/stripe/change-plan',
    {
      schema: {
        description: 'Change subscription plan',
        tags: ['stripe'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['newPriceId'],
          properties: {
            newPriceId: { type: 'string', description: 'New Stripe price ID' },
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
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          503: {
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
        Body: { newPriceId: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { newPriceId } = request.body;

      app.logger.info({ userId, newPriceId }, 'Changing subscription plan');

      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      try {
        const stripe = getStripe();
        const subs = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, userId),
              eq(schema.subscriptions.status, 'active')
            )
          )
          .limit(1);

        if (subs.length === 0) {
          return reply.status(404).send({ error: 'No active subscription' });
        }

        const sub = subs[0];
        if (sub.stripeSubscriptionId) {
          const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
          await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            items: [
              {
                id: stripeSubscription.items.data[0].id,
                price: newPriceId,
              },
            ],
          });
        }

        app.logger.info({ userId, subscriptionId: sub.id }, 'Plan changed successfully');
        return { message: 'Plan changed successfully' };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to change plan');
        return reply.status(500).send({ error: 'Failed to change plan' });
      }
    }
  );

  // POST /api/stripe/webhook - Stripe webhook
  app.fastify.post(
    '/api/stripe/webhook',
    {
      schema: {
        description: 'Handle Stripe webhook events',
        tags: ['stripe'],
        response: {
          200: {
            type: 'object',
            properties: { received: { type: 'boolean' } },
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          503: {
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
      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      try {
        const stripe = getStripe();
        const signature = request.headers['stripe-signature'] as string;
        const body = (request as any).rawBody as Buffer | string;

        let event;
        try {
          event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ''
          );
        } catch (error) {
          app.logger.warn({ err: error }, 'Invalid Stripe webhook signature');
          return reply.status(400).send({ error: 'Invalid signature' });
        }

        // Check for duplicate events
        const existing = await app.db
          .select()
          .from(schema.stripeEvents)
          .where(eq(schema.stripeEvents.stripeEventId, event.id))
          .limit(1);

        if (existing.length > 0) {
          app.logger.info({ eventId: event.id }, 'Duplicate event, skipping');
          return { received: true };
        }

        // Store event
        await app.db.insert(schema.stripeEvents).values({
          stripeEventId: event.id,
          type: event.type,
          data: event.data.object as any,
        });

        // Handle event
        switch (event.type) {
          case 'checkout.session.completed':
            app.logger.info({ eventId: event.id }, 'Checkout completed');
            break;
          case 'customer.subscription.updated':
            app.logger.info({ eventId: event.id }, 'Subscription updated');
            break;
          case 'customer.subscription.deleted':
            app.logger.info({ eventId: event.id }, 'Subscription deleted');
            break;
          case 'invoice.payment_succeeded':
            app.logger.info({ eventId: event.id }, 'Invoice paid');
            break;
          default:
            app.logger.debug({ eventType: event.type }, 'Unhandled event type');
        }

        return { received: true };
      } catch (error) {
        app.logger.error({ err: error }, 'Webhook error');
        return reply.status(500).send({ error: 'Webhook processing failed' });
      }
    }
  );
}
