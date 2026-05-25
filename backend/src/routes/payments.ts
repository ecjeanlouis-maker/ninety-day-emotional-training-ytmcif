import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireAuthUserId } from '../lib/auth.js';

// Lazy initialization of Stripe
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(apiKey);
  }
  return stripe;
}

const PRICING = {
  monthly: 4.99,
  lifetime: 10.99,
  'premium-lifetime': 59.99,
};

const PROGRAM_TYPES = ['emotional', 'confidence', 'anger', 'stress', 'social-anxiety', 'thoughts'];

export function registerPaymentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/payment-methods - Create a payment method
  app.fastify.post(
    '/api/payment-methods',
    {
      schema: {
        description: 'Create a new payment method',
        tags: ['payment-methods'],
        body: {
          type: 'object',
          required: ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv', 'cardholderName'],
          properties: {
            cardNumber: { type: 'string', description: 'Card number' },
            expiryMonth: { type: 'string', description: 'Expiry month (MM)' },
            expiryYear: { type: 'string', description: 'Expiry year (YY)' },
            cvv: { type: 'string', description: 'Card CVV' },
            cardholderName: { type: 'string', description: 'Cardholder name' },
          },
        },
        response: {
          201: {
            description: 'Payment method created',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              type: { type: 'string' },
              brand: { type: 'string' },
              last4: { type: 'string' },
              expiryMonth: { type: 'string' },
              expiryYear: { type: 'string' },
              isDefault: { type: 'boolean' },
            },
          },
          400: {
            description: 'Invalid card data',
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
      request: FastifyRequest<{
        Body: {
          cardNumber: string;
          expiryMonth: string;
          expiryYear: string;
          cvv: string;
          cardholderName: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = request.body;
      app.logger.info(
        { userId: session.user.id, cardLast4: cardNumber.slice(-4) },
        'Creating payment method'
      );

      try {
        // Create payment method in Stripe
        const paymentMethod = await getStripe().paymentMethods.create({
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: parseInt(expiryMonth),
            exp_year: parseInt(expiryYear),
            cvc: cvv,
          },
          billing_details: {
            name: cardholderName,
          },
        });

        // Store in database
        const inserted = await app.db
          .insert(schema.paymentMethods)
          .values({
            userId: session.user.id,
            stripePaymentMethodId: paymentMethod.id,
            type: 'card',
            cardBrand: paymentMethod.card?.brand ? paymentMethod.card.brand.toUpperCase() : 'Unknown',
            cardLast4: paymentMethod.card?.last4,
            cardExpMonth: String(paymentMethod.card?.exp_month).padStart(2, '0'),
            cardExpYear: String(paymentMethod.card?.exp_year).slice(-2),
            isDefault: false,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, paymentMethodId: inserted[0].id },
          'Payment method created successfully'
        );

        return reply.status(201).send({
          id: inserted[0].id,
          type: inserted[0].type,
          brand: inserted[0].cardBrand,
          last4: inserted[0].cardLast4,
          expiryMonth: inserted[0].cardExpMonth,
          expiryYear: inserted[0].cardExpYear,
          isDefault: inserted[0].isDefault,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, cardLast4: cardNumber.slice(-4) },
          'Failed to create payment method'
        );

        let errorMessage = 'Failed to create payment method';
        if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
          errorMessage = 'Payment processing is not configured';
        } else if (error instanceof Stripe.errors.StripeCardError) {
          errorMessage = error.message;
        }

        return reply.status(400).send({
          error: errorMessage,
        });
      }
    }
  );

  // GET /api/payment-methods - List user's payment methods
  app.fastify.get(
    '/api/payment-methods',
    {
      schema: {
        description: "Get user's payment methods",
        tags: ['payment-methods'],
        response: {
          200: {
            description: 'List of payment methods',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                type: { type: 'string' },
                brand: { type: 'string' },
                last4: { type: 'string' },
                expiryMonth: { type: 'string' },
                expiryYear: { type: 'string' },
                isDefault: { type: 'boolean' },
              },
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

      app.logger.info({ userId: session.user.id }, 'Fetching payment methods');

      try {
        const methods = await app.db
          .select()
          .from(schema.paymentMethods)
          .where(eq(schema.paymentMethods.userId, session.user.id));

        return methods.map((m) => ({
          id: m.id,
          type: m.type,
          brand: m.cardBrand,
          last4: m.cardLast4,
          expiryMonth: m.cardExpMonth,
          expiryYear: m.cardExpYear,
          isDefault: m.isDefault,
        }));
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch payment methods');
        throw error;
      }
    }
  );

  // PUT /api/payment-methods/:id/default - Set as default
  app.fastify.put(
    '/api/payment-methods/:id/default',
    {
      schema: {
        description: 'Set payment method as default',
        tags: ['payment-methods'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Payment method set as default',
            type: 'object',
            properties: { success: { type: 'boolean' } },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Payment method not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, paymentMethodId: id }, 'Setting payment method as default');

      try {
        // Verify ownership
        const method = await app.db
          .select()
          .from(schema.paymentMethods)
          .where(
            and(
              eq(schema.paymentMethods.id, id),
              eq(schema.paymentMethods.userId, session.user.id)
            )
          );

        if (!method.length) {
          return reply.status(404).send({ error: 'Payment method not found' });
        }

        // Unset all others
        await app.db
          .update(schema.paymentMethods)
          .set({ isDefault: false })
          .where(eq(schema.paymentMethods.userId, session.user.id));

        // Set this one as default
        await app.db
          .update(schema.paymentMethods)
          .set({ isDefault: true })
          .where(eq(schema.paymentMethods.id, id));

        app.logger.info({ userId: session.user.id, paymentMethodId: id }, 'Payment method set as default');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, paymentMethodId: id }, 'Failed to set default payment method');
        throw error;
      }
    }
  );

  // DELETE /api/payment-methods/:id - Delete payment method
  app.fastify.delete(
    '/api/payment-methods/:id',
    {
      schema: {
        description: 'Delete payment method',
        tags: ['payment-methods'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Payment method deleted',
            type: 'object',
            properties: { success: { type: 'boolean' } },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Payment method not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, paymentMethodId: id }, 'Deleting payment method');

      try {
        // Verify ownership
        const method = await app.db
          .select()
          .from(schema.paymentMethods)
          .where(
            and(
              eq(schema.paymentMethods.id, id),
              eq(schema.paymentMethods.userId, session.user.id)
            )
          );

        if (!method.length) {
          return reply.status(404).send({ error: 'Payment method not found' });
        }

        // Delete from Stripe
        await getStripe().paymentMethods.detach(method[0].stripePaymentMethodId);

        // Delete from database
        await app.db.delete(schema.paymentMethods).where(eq(schema.paymentMethods.id, id));

        app.logger.info({ userId: session.user.id, paymentMethodId: id }, 'Payment method deleted successfully');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, paymentMethodId: id }, 'Failed to delete payment method');
        throw error;
      }
    }
  );

  // POST /api/subscriptions - Create subscription or one-time payment
  app.fastify.post(
    '/api/subscriptions',
    {
      schema: {
        description: 'Create subscription or one-time payment',
        tags: ['subscriptions'],
        body: {
          type: 'object',
          required: ['programType', 'planType'],
          properties: {
            programType: { type: 'string' },
            planType: { enum: ['monthly', 'lifetime', 'premium-lifetime'] },
            paymentMethodId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            description: 'Subscription created',
            type: 'object',
            properties: {
              subscriptionId: { type: 'string', format: 'uuid' },
              status: { type: 'string' },
              programType: { type: 'string' },
              planType: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            description: 'Invalid request or payment failed',
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
      request: FastifyRequest<{
        Body: {
          programType: string;
          planType: 'monthly' | 'lifetime' | 'premium-lifetime';
          paymentMethodId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { programType, planType, paymentMethodId } = request.body;
      app.logger.info(
        { userId: session.user.id, programType, planType },
        'Creating subscription'
      );

      try {
        // Validate program type (except for premium-lifetime which covers all programs)
        if (planType !== 'premium-lifetime' && !PROGRAM_TYPES.includes(programType)) {
          return reply.status(400).send({ error: 'Invalid program type' });
        }

        // Get payment method
        let paymentMethod: (typeof schema.paymentMethods.$inferSelect) | null = null;

        if (paymentMethodId) {
          const methods = await app.db
            .select()
            .from(schema.paymentMethods)
            .where(
              and(
                eq(schema.paymentMethods.id, paymentMethodId),
                eq(schema.paymentMethods.userId, session.user.id)
              )
            );

          if (!methods.length) {
            return reply.status(400).send({ error: 'Payment method not found' });
          }
          paymentMethod = methods[0];
        } else {
          // Use default payment method
          const methods = await app.db
            .select()
            .from(schema.paymentMethods)
            .where(
              and(
                eq(schema.paymentMethods.userId, session.user.id),
                eq(schema.paymentMethods.isDefault, true)
              )
            );

          if (!methods.length) {
            return reply.status(400).send({ error: 'No default payment method set' });
          }
          paymentMethod = methods[0];
        }

        const amount = PRICING[planType];
        let subscription: typeof schema.subscriptions.$inferInsert = {
          userId: session.user.id,
          programType,
          planType,
          amount: amount as any,
          currency: 'usd',
          status: 'pending',
        };

        // Create one-time or recurring payment intent
        const paymentIntent = await getStripe().paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          payment_method: paymentMethod.stripePaymentMethodId,
          off_session: true,
          confirm: true,
          description: `${planType === 'premium-lifetime' ? 'Premium Lifetime' : programType} (${planType})`,
        });

        subscription.stripePaymentIntentId = paymentIntent.id;
        subscription.status = 'active';

        // For monthly subscriptions, set expiry
        if (planType === 'monthly') {
          subscription.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        }

        // Insert subscription
        const inserted = await app.db
          .insert(schema.subscriptions)
          .values(subscription)
          .returning();

        // Log transaction
        await app.db.insert(schema.paymentTransactions).values({
          userId: session.user.id,
          subscriptionId: inserted[0].id,
          paymentMethodId: paymentMethod.id,
          stripePaymentIntentId: subscription.stripePaymentIntentId || '',
          amount: amount as any,
          currency: 'usd',
          status: 'succeeded',
          description: `${planType} subscription to ${programType}`,
        });

        app.logger.info(
          { userId: session.user.id, subscriptionId: inserted[0].id, programType, planType },
          'Subscription created successfully'
        );

        return reply.status(201).send({
          subscriptionId: inserted[0].id,
          status: inserted[0].status,
          programType: inserted[0].programType,
          planType: inserted[0].planType,
          expiresAt: inserted[0].expiresAt?.toISOString(),
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, programType, planType },
          'Failed to create subscription'
        );

        let errorMessage = 'Failed to process payment';
        if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
          errorMessage = 'Payment processing is not configured';
        } else if (error instanceof Stripe.errors.StripeCardError) {
          errorMessage = error.message;
        }

        return reply.status(400).send({
          error: errorMessage,
        });
      }
    }
  );

  // GET /api/subscriptions - List user's subscriptions
  app.fastify.get(
    '/api/subscriptions',
    {
      schema: {
        description: "Get user's active subscriptions",
        tags: ['subscriptions'],
        response: {
          200: {
            description: 'List of subscriptions',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                programType: { type: 'string' },
                planType: { type: 'string' },
                status: { type: 'string' },
                amount: { type: 'string' },
                startedAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time' },
              },
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

      app.logger.info({ userId: session.user.id }, 'Fetching subscriptions');

      try {
        const subs = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, session.user.id),
              eq(schema.subscriptions.status, 'active')
            )
          );

        return subs.map((s) => ({
          id: s.id,
          programType: s.programType,
          planType: s.planType,
          status: s.status,
          amount: s.amount,
          startedAt: s.startedAt.toISOString(),
          expiresAt: s.expiresAt?.toISOString(),
        }));
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch subscriptions');
        throw error;
      }
    }
  );

  // GET /api/subscriptions/:programType/status - Check access to program
  app.fastify.get(
    '/api/subscriptions/:programType/status',
    {
      schema: {
        description: 'Check if user has access to a program',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          required: ['programType'],
          properties: {
            programType: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Program access status',
            type: 'object',
            properties: {
              hasAccess: { type: 'boolean' },
              planType: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
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
      request: FastifyRequest<{ Params: { programType: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { programType } = request.params;
      app.logger.info({ userId: session.user.id, programType }, 'Checking program access');

      try {
        // Check for specific program subscription or premium-lifetime
        const subs = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, session.user.id),
              eq(schema.subscriptions.status, 'active')
            )
          );

        let hasAccess = false;
        let planType: string | undefined;
        let expiresAt: string | undefined;

        for (const sub of subs) {
          if (sub.planType === 'premium-lifetime' || sub.programType === programType) {
            // Check expiry for monthly subscriptions
            if (sub.planType === 'monthly' && sub.expiresAt && sub.expiresAt < new Date()) {
              continue;
            }
            hasAccess = true;
            planType = sub.planType;
            expiresAt = sub.expiresAt?.toISOString();
            break;
          }
        }

        const response: any = { hasAccess };
        if (planType) response.planType = planType;
        if (expiresAt) response.expiresAt = expiresAt;

        return response;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, programType }, 'Failed to check program access');
        throw error;
      }
    }
  );

  // DELETE /api/subscriptions/:id - Cancel subscription
  app.fastify.delete(
    '/api/subscriptions/:id',
    {
      schema: {
        description: 'Cancel subscription',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Subscription cancelled',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              cancelledAt: { type: 'string', format: 'date-time' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Subscription not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ userId: session.user.id, subscriptionId: id }, 'Cancelling subscription');

      try {
        // Verify ownership
        const sub = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.id, id),
              eq(schema.subscriptions.userId, session.user.id)
            )
          );

        if (!sub.length) {
          return reply.status(404).send({ error: 'Subscription not found' });
        }

        const subscription = sub[0];
        const cancelledAt = new Date();

        // Update in database
        await app.db
          .update(schema.subscriptions)
          .set({
            status: 'cancelled',
            cancelledAt,
          })
          .where(eq(schema.subscriptions.id, id));

        app.logger.info(
          { userId: session.user.id, subscriptionId: id, cancelledAt },
          'Subscription cancelled successfully'
        );

        return {
          success: true,
          cancelledAt: cancelledAt.toISOString(),
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, subscriptionId: id }, 'Failed to cancel subscription');
        throw error;
      }
    }
  );

  // GET /api/transactions - Get payment history
  app.fastify.get(
    '/api/transactions',
    {
      schema: {
        description: "Get user's payment history",
        tags: ['transactions'],
        response: {
          200: {
            description: 'List of transactions',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                amount: { type: 'string' },
                currency: { type: 'string' },
                status: { type: 'string' },
                description: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
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

      app.logger.info({ userId: session.user.id }, 'Fetching transactions');

      try {
        const transactions = await app.db
          .select()
          .from(schema.paymentTransactions)
          .where(eq(schema.paymentTransactions.userId, session.user.id));

        return transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
        }));
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch transactions');
        throw error;
      }
    }
  );
}
