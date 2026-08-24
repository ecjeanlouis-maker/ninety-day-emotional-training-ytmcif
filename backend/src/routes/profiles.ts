import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireAuthUserId } from '../lib/auth.js';

const VALID_AGE_RANGES = ['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus'];
const VALID_MAIN_GOALS = [
  'emotional_control',
  'build_confidence',
  'manage_anger',
  'reduce_stress',
  'social_anxiety',
  'thought_regulation',
];

interface ProfileValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

function validateProfileInput(input: any): ProfileValidationResult {
  const errors: Record<string, string> = {};

  if (typeof input.full_name !== 'string' || input.full_name.trim().length === 0) {
    errors.full_name = 'full_name must be a non-empty string';
  }

  if (!VALID_AGE_RANGES.includes(input.age_range)) {
    errors.age_range = `age_range must be one of: ${VALID_AGE_RANGES.join(', ')}`;
  }

  if (!VALID_MAIN_GOALS.includes(input.main_goal)) {
    errors.main_goal = `main_goal must be one of: ${VALID_MAIN_GOALS.join(', ')}`;
  }

  const confidenceLevel = parseInt(input.confidence_level);
  if (!Number.isInteger(confidenceLevel) || confidenceLevel < 1 || confidenceLevel > 5) {
    errors.confidence_level = 'confidence_level must be an integer between 1 and 5';
  }

  const emotionalControlLevel = parseInt(input.emotional_control_level);
  if (!Number.isInteger(emotionalControlLevel) || emotionalControlLevel < 1 || emotionalControlLevel > 5) {
    errors.emotional_control_level = 'emotional_control_level must be an integer between 1 and 5';
  }

  return Object.keys(errors).length > 0 ? { valid: false, errors } : { valid: true };
}

interface ProfileResponse {
  user_id: string;
  full_name: string;
  age_range: string;
  main_goal: string;
  confidence_level: number;
  emotional_control_level: number;
  role: string;
  is_active: boolean;
  ai_messages_remaining: number | null;
  account_type: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_type: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_status: string;
  payment_status: string;
  is_premium_active: boolean;
  access_state: string;
  created_at: string;
  updated_at: string;
}

function computeAiMessagesRemaining(profile: {
  role: string;
  aiMessagesUsedToday: number;
  aiMessagesResetAt: Date;
}): number | null {
  if (profile.role === 'premium') {
    return null;
  }

  const now = new Date();
  const hoursSinceReset = (now.getTime() - profile.aiMessagesResetAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    return 3;
  }

  return Math.max(0, 3 - profile.aiMessagesUsedToday);
}

function computeIsPremiumActive(profile: any): boolean {
  if (profile.accountType !== 'premium') {
    return false;
  }
  // True for both 'active' and 'trialing', also true for 'past_due'
  if (!['active', 'trialing', 'past_due'].includes(profile.subscriptionStatus)) {
    return false;
  }
  if (profile.subscriptionEndDate === null || profile.subscriptionEndDate === undefined) {
    return true;
  }
  return profile.subscriptionEndDate > new Date();
}

function computeAccessState(profile: any): string {
  // Precedence order as specified
  if (profile.role === 'admin') {
    return 'admin';
  }
  if (profile.subscriptionStatus === 'past_due') {
    return 'past_due';
  }
  if (profile.subscriptionStatus === 'trialing') {
    return 'trialing';
  }
  if (profile.subscriptionStatus === 'active') {
    return 'active';
  }
  if (profile.subscriptionStatus === 'cancelled') {
    if (profile.subscriptionEndDate && profile.subscriptionEndDate > new Date()) {
      return 'cancelled_grace';
    }
  }
  if (profile.subscriptionStatus === 'expired') {
    return 'expired';
  }
  return 'inactive';
}

function formatProfileResponse(profile: any): ProfileResponse {
  return {
    user_id: profile.userId,
    full_name: profile.fullName,
    age_range: profile.ageRange,
    main_goal: profile.mainGoal,
    confidence_level: profile.confidenceLevel,
    emotional_control_level: profile.emotionalControlLevel,
    role: profile.role,
    is_active: profile.isActive,
    ai_messages_remaining: computeAiMessagesRemaining(profile),
    account_type: profile.accountType,
    subscription_status: profile.subscriptionStatus,
    stripe_customer_id: profile.stripeCustomerId || null,
    stripe_subscription_id: profile.stripeSubscriptionId || null,
    plan_type: profile.planType || null,
    subscription_start_date: profile.subscriptionStartDate?.toISOString() || null,
    subscription_end_date: profile.subscriptionEndDate?.toISOString() || null,
    trial_status: profile.trialStatus,
    payment_status: profile.paymentStatus,
    is_premium_active: computeIsPremiumActive(profile),
    access_state: computeAccessState(profile),
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}

export function registerProfileRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/profile - UPSERT profile
  app.fastify.post(
    '/api/profile',
    {
      schema: {
        description: 'Create or update authenticated user profile',
        tags: ['profiles'],
        body: {
          type: 'object',
          required: ['full_name', 'age_range', 'main_goal', 'confidence_level', 'emotional_control_level'],
          properties: {
            full_name: { type: 'string' },
            age_range: { type: 'string', enum: VALID_AGE_RANGES },
            main_goal: { type: 'string', enum: VALID_MAIN_GOALS },
            confidence_level: { type: 'integer', minimum: 1, maximum: 5 },
            emotional_control_level: { type: 'integer', minimum: 1, maximum: 5 },
          },
        },
        response: {
          200: {
            description: 'Profile created or updated',
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              full_name: { type: 'string' },
              age_range: { type: 'string' },
              main_goal: { type: 'string' },
              confidence_level: { type: 'integer' },
              emotional_control_level: { type: 'integer' },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
              ai_messages_remaining: { type: ['integer', 'null'] },
              account_type: { type: 'string', enum: ['free', 'premium'] },
              subscription_status: { type: 'string', enum: ['inactive', 'active', 'past_due', 'cancelled', 'expired', 'trialing'] },
              stripe_customer_id: { type: ['string', 'null'] },
              stripe_subscription_id: { type: ['string', 'null'] },
              plan_type: { type: ['string', 'null'], enum: ['monthly', 'yearly', 'lifetime'] },
              subscription_start_date: { type: ['string', 'null'], format: 'date-time' },
              subscription_end_date: { type: ['string', 'null'], format: 'date-time' },
              trial_status: { type: 'string', enum: ['none', 'active', 'expired', 'converted'] },
              payment_status: { type: 'string', enum: ['none', 'succeeded', 'failed', 'pending', 'refunded'] },
              is_premium_active: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              error: { type: 'string' },
              fields: { type: 'object' },
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

      const body = request.body as any;
      const validation = validateProfileInput(body);

      if (!validation.valid) {
        return reply.status(400).send({
          error: 'validation_error',
          fields: validation.errors,
        });
      }

      app.logger.info({ userId: session.user.id }, 'Creating or updating profile');

      try {
        const existingProfile = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, session.user.id));

        const now = new Date();
        const profileData = {
          userId: session.user.id,
          fullName: body.full_name,
          ageRange: body.age_range,
          mainGoal: body.main_goal,
          confidenceLevel: parseInt(body.confidence_level),
          emotionalControlLevel: parseInt(body.emotional_control_level),
          role: 'free',
          updatedAt: now,
        };

        let profile;
        if (existingProfile.length > 0) {
          const updated = await app.db
            .update(schema.userProfiles)
            .set(profileData)
            .where(eq(schema.userProfiles.userId, session.user.id))
            .returning();
          profile = updated[0];
        } else {
          const inserted = await app.db
            .insert(schema.userProfiles)
            .values({
              ...profileData,
              createdAt: now,
              aiMessagesUsedToday: 0,
              aiMessagesResetAt: now,
              accountType: 'free',
              subscriptionStatus: 'inactive',
              trialStatus: 'none',
              paymentStatus: 'none',
            })
            .returning();
          profile = inserted[0];
        }

        app.logger.info({ userId: session.user.id }, 'Profile created or updated successfully');
        return formatProfileResponse(profile);
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to create or update profile');
        throw error;
      }
    }
  );

  // GET /api/profile - Retrieve profile
  app.fastify.get(
    '/api/profile',
    {
      schema: {
        description: 'Get authenticated user profile',
        tags: ['profiles'],
        response: {
          200: {
            description: 'User profile',
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              full_name: { type: 'string' },
              age_range: { type: 'string' },
              main_goal: { type: 'string' },
              confidence_level: { type: 'integer' },
              emotional_control_level: { type: 'integer' },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
              ai_messages_remaining: { type: ['integer', 'null'] },
              account_type: { type: 'string', enum: ['free', 'premium'] },
              subscription_status: { type: 'string', enum: ['inactive', 'active', 'past_due', 'cancelled', 'expired', 'trialing'] },
              stripe_customer_id: { type: ['string', 'null'] },
              stripe_subscription_id: { type: ['string', 'null'] },
              plan_type: { type: ['string', 'null'], enum: ['monthly', 'yearly', 'lifetime'] },
              subscription_start_date: { type: ['string', 'null'], format: 'date-time' },
              subscription_end_date: { type: ['string', 'null'], format: 'date-time' },
              trial_status: { type: 'string', enum: ['none', 'active', 'expired', 'converted'] },
              payment_status: { type: 'string', enum: ['none', 'succeeded', 'failed', 'pending', 'refunded'] },
              is_premium_active: { type: 'boolean' },
              access_state: { type: 'string', enum: ['active', 'trialing', 'cancelled_grace', 'past_due', 'expired', 'inactive', 'admin'] },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Profile not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching profile');

      try {
        const userId = session.user.id;
        const now = new Date();

        // Fetch profile first
        const profileRows = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, userId));

        if (profileRows.length === 0) {
          return reply.status(404).send({ error: 'profile_not_found' });
        }

        const profile = profileRows[0];

        // Check if any expiry conditions are met and sweep if needed
        let needsUpdate = false;
        const updates: Record<string, any> = {};

        // Trial expired
        if (
          profile.trialStatus === 'active' &&
          profile.subscriptionEndDate &&
          profile.subscriptionEndDate <= now &&
          profile.subscriptionStatus === 'trialing'
        ) {
          updates.trialStatus = 'expired';
          updates.subscriptionStatus = 'expired';
          updates.accountType = 'free';
          updates.paymentStatus = 'none';
          updates.role = profile.role === 'admin' ? 'admin' : 'free';
          updates.updatedAt = now;
          needsUpdate = true;
        }
        // Active subscription expired
        else if (
          profile.subscriptionStatus === 'active' &&
          profile.subscriptionEndDate &&
          profile.subscriptionEndDate <= now &&
          profile.planType &&
          ['monthly', 'yearly'].includes(profile.planType)
        ) {
          updates.subscriptionStatus = 'expired';
          updates.accountType = 'free';
          updates.role = profile.role === 'admin' ? 'admin' : 'free';
          updates.updatedAt = now;
          needsUpdate = true;
        }
        // Cancelled subscription past end date
        else if (
          profile.subscriptionStatus === 'cancelled' &&
          profile.subscriptionEndDate &&
          profile.subscriptionEndDate <= now
        ) {
          updates.subscriptionStatus = 'expired';
          updates.accountType = 'free';
          updates.role = profile.role === 'admin' ? 'admin' : 'free';
          updates.updatedAt = now;
          needsUpdate = true;
        }

        // Apply sweep if needed
        if (needsUpdate) {
          await app.db
            .update(schema.userProfiles)
            .set(updates)
            .where(eq(schema.userProfiles.userId, userId));

          // Re-fetch after update
          const updatedRows = await app.db
            .select()
            .from(schema.userProfiles)
            .where(eq(schema.userProfiles.userId, userId));

          if (updatedRows.length > 0) {
            return formatProfileResponse(updatedRows[0]);
          }
        }

        return formatProfileResponse(profile);
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch profile');
        throw error;
      }
    }
  );

  // PATCH /api/profile - Update profile fields
  app.fastify.patch(
    '/api/profile',
    {
      schema: {
        description: 'Update authenticated user profile',
        tags: ['profiles'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            full_name: { type: 'string' },
            age_range: { type: 'string', enum: VALID_AGE_RANGES },
            main_goal: { type: 'string', enum: VALID_MAIN_GOALS },
            confidence_level: { type: 'integer', minimum: 1, maximum: 5 },
            emotional_control_level: { type: 'integer', minimum: 1, maximum: 5 },
          },
        },
        response: {
          200: {
            description: 'Profile updated',
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              full_name: { type: 'string' },
              age_range: { type: 'string' },
              main_goal: { type: 'string' },
              confidence_level: { type: 'integer' },
              emotional_control_level: { type: 'integer' },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
              ai_messages_remaining: { type: ['integer', 'null'] },
              account_type: { type: 'string', enum: ['free', 'premium'] },
              subscription_status: { type: 'string', enum: ['inactive', 'active', 'past_due', 'cancelled', 'expired', 'trialing'] },
              stripe_customer_id: { type: ['string', 'null'] },
              stripe_subscription_id: { type: ['string', 'null'] },
              plan_type: { type: ['string', 'null'], enum: ['monthly', 'yearly', 'lifetime'] },
              subscription_start_date: { type: ['string', 'null'], format: 'date-time' },
              subscription_end_date: { type: ['string', 'null'], format: 'date-time' },
              trial_status: { type: 'string', enum: ['none', 'active', 'expired', 'converted'] },
              payment_status: { type: 'string', enum: ['none', 'succeeded', 'failed', 'pending', 'refunded'] },
              is_premium_active: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              error: { type: 'string' },
              fields: { type: 'object' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Profile not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as any;

      // Check if profile exists
      const existingProfile = await app.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, session.user.id));

      if (existingProfile.length === 0) {
        return reply.status(404).send({ error: 'profile_not_found' });
      }

      // Validate only provided fields
      const errors: Record<string, string> = {};

      if (body.full_name !== undefined) {
        if (typeof body.full_name !== 'string' || body.full_name.trim().length === 0) {
          errors.full_name = 'full_name must be a non-empty string';
        }
      }

      if (body.age_range !== undefined) {
        if (!VALID_AGE_RANGES.includes(body.age_range)) {
          errors.age_range = `age_range must be one of: ${VALID_AGE_RANGES.join(', ')}`;
        }
      }

      if (body.main_goal !== undefined) {
        if (!VALID_MAIN_GOALS.includes(body.main_goal)) {
          errors.main_goal = `main_goal must be one of: ${VALID_MAIN_GOALS.join(', ')}`;
        }
      }

      if (body.confidence_level !== undefined) {
        const confidenceLevel = parseInt(body.confidence_level);
        if (!Number.isInteger(confidenceLevel) || confidenceLevel < 1 || confidenceLevel > 5) {
          errors.confidence_level = 'confidence_level must be an integer between 1 and 5';
        }
      }

      if (body.emotional_control_level !== undefined) {
        const emotionalControlLevel = parseInt(body.emotional_control_level);
        if (!Number.isInteger(emotionalControlLevel) || emotionalControlLevel < 1 || emotionalControlLevel > 5) {
          errors.emotional_control_level = 'emotional_control_level must be an integer between 1 and 5';
        }
      }

      app.logger.info({ userId: session.user.id }, 'Updating profile');

      try {
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (body.full_name !== undefined) updateData.fullName = body.full_name;
        if (body.age_range !== undefined) updateData.ageRange = body.age_range;
        if (body.main_goal !== undefined) updateData.mainGoal = body.main_goal;
        if (body.confidence_level !== undefined) updateData.confidenceLevel = parseInt(body.confidence_level);
        if (body.emotional_control_level !== undefined)
          updateData.emotionalControlLevel = parseInt(body.emotional_control_level);

        const updated = await app.db
          .update(schema.userProfiles)
          .set(updateData)
          .where(eq(schema.userProfiles.userId, session.user.id))
          .returning();

        app.logger.info({ userId: session.user.id }, 'Profile updated successfully');
        return formatProfileResponse(updated[0]);
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to update profile');
        throw error;
      }
    }
  );

  // POST /api/profile/ai-message-consume - Consume AI message
  app.fastify.post(
    '/api/profile/ai-message-consume',
    {
      schema: {
        description: 'Consume one AI message (with daily limit for free tier)',
        tags: ['profiles'],
        response: {
          200: {
            description: 'AI message allowed',
            type: 'object',
            properties: {
              allowed: { type: 'boolean' },
              remaining: { type: ['integer', 'null'] },
              role: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Profile not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          429: {
            description: 'Daily limit reached',
            type: 'object',
            properties: {
              allowed: { type: 'boolean' },
              remaining: { type: 'integer' },
              role: { type: 'string' },
              error: { type: 'string' },
              resets_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Consuming AI message');

      try {
        // Load profile
        const profileResult = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, session.user.id));

        if (profileResult.length === 0) {
          return reply.status(404).send({ error: 'profile_not_found' });
        }

        let profile = profileResult[0];

        // Premium tier: unlimited
        if (profile.role === 'premium') {
          app.logger.info({ userId: session.user.id }, 'Premium user - AI message allowed (unlimited)');
          return {
            allowed: true,
            remaining: null,
            role: 'premium',
          };
        }

        // Free tier: check reset
        const now = new Date();
        const hoursSinceReset = (now.getTime() - profile.aiMessagesResetAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceReset >= 24) {
          // Reset counter
          const resetResult = await app.db
            .update(schema.userProfiles)
            .set({
              aiMessagesUsedToday: 0,
              aiMessagesResetAt: now,
            })
            .where(eq(schema.userProfiles.userId, session.user.id))
            .returning();

          profile = resetResult[0];
        }

        // Check limit
        if (profile.aiMessagesUsedToday >= 3) {
          const resetTime = new Date(profile.aiMessagesResetAt.getTime() + 24 * 60 * 60 * 1000);
          app.logger.warn(
            { userId: session.user.id, used: profile.aiMessagesUsedToday },
            'Daily AI message limit reached'
          );
          return reply.status(429).send({
            allowed: false,
            remaining: 0,
            role: 'free',
            error: 'daily_limit_reached',
            resets_at: resetTime.toISOString(),
          });
        }

        // Increment counter
        const incrementResult = await app.db
          .update(schema.userProfiles)
          .set({
            aiMessagesUsedToday: profile.aiMessagesUsedToday + 1,
          })
          .where(eq(schema.userProfiles.userId, session.user.id))
          .returning();

        const newCounter = incrementResult[0].aiMessagesUsedToday;
        const remaining = 3 - newCounter;

        app.logger.info(
          { userId: session.user.id, used: newCounter, remaining },
          'AI message consumed successfully'
        );

        return {
          allowed: true,
          remaining,
          role: 'free',
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to consume AI message');
        throw error;
      }
    }
  );


  // POST /api/profile/trial/start - Start a 7-day free trial
  app.fastify.post(
    '/api/profile/trial/start',
    {
      schema: {
        description: 'Start a 7-day free trial for the authenticated user',
        tags: ['profiles'],
        response: {
          200: {
            description: 'Trial started',
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              full_name: { type: 'string' },
              age_range: { type: 'string' },
              main_goal: { type: 'string' },
              confidence_level: { type: 'integer' },
              emotional_control_level: { type: 'integer' },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
              ai_messages_remaining: { type: ['integer', 'null'] },
              account_type: { type: 'string', enum: ['free', 'premium'] },
              subscription_status: { type: 'string', enum: ['inactive', 'active', 'past_due', 'cancelled', 'expired', 'trialing'] },
              stripe_customer_id: { type: ['string', 'null'] },
              stripe_subscription_id: { type: ['string', 'null'] },
              plan_type: { type: ['string', 'null'], enum: ['monthly', 'yearly', 'lifetime'] },
              subscription_start_date: { type: ['string', 'null'], format: 'date-time' },
              subscription_end_date: { type: ['string', 'null'], format: 'date-time' },
              trial_status: { type: 'string', enum: ['none', 'active', 'expired', 'converted'] },
              payment_status: { type: 'string', enum: ['none', 'succeeded', 'failed', 'pending', 'refunded'] },
              is_premium_active: { type: 'boolean' },
              access_state: { type: 'string', enum: ['active', 'trialing', 'cancelled_grace', 'past_due', 'expired', 'inactive', 'admin'] },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Profile not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          409: {
            description: 'Trial unavailable',
            type: 'object',
            properties: {
              error: { type: 'string' },
              reason: { type: 'string', enum: ['already_used', 'already_premium'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Starting trial');

      try {
        // Load user's profile
        const profileRows = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, userId));

        if (profileRows.length === 0) {
          return reply.status(404).send({ error: 'profile_not_found' });
        }

        const profile = profileRows[0];

        // Check if trial has already been used
        if (profile.trialStatus !== 'none') {
          return reply.status(409).send({
            error: 'trial_unavailable',
            reason: 'already_used',
          });
        }

        // Check if already premium
        if (profile.accountType === 'premium') {
          return reply.status(409).send({
            error: 'trial_unavailable',
            reason: 'already_premium',
          });
        }

        // Calculate trial end date (7 days from now)
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Start trial
        const updated = await app.db
          .update(schema.userProfiles)
          .set({
            accountType: 'premium',
            subscriptionStatus: 'trialing',
            trialStatus: 'active',
            planType: 'monthly',
            subscriptionStartDate: now,
            subscriptionEndDate: trialEndDate,
            paymentStatus: 'none',
            role: profile.role === 'admin' ? 'admin' : 'premium',
            updatedAt: now,
          })
          .where(eq(schema.userProfiles.userId, userId))
          .returning();

        app.logger.info({ userId }, 'Trial started successfully');
        return formatProfileResponse(updated[0]);
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to start trial');
        throw error;
      }
    }
  );

  // POST /api/profile/trial/cancel - Cancel active trial
  app.fastify.post(
    '/api/profile/trial/cancel',
    {
      schema: {
        description: 'Cancel an active trial early',
        tags: ['profiles'],
        response: {
          200: {
            description: 'Trial cancelled',
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              full_name: { type: 'string' },
              age_range: { type: 'string' },
              main_goal: { type: 'string' },
              confidence_level: { type: 'integer' },
              emotional_control_level: { type: 'integer' },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
              ai_messages_remaining: { type: ['integer', 'null'] },
              account_type: { type: 'string', enum: ['free', 'premium'] },
              subscription_status: { type: 'string', enum: ['inactive', 'active', 'past_due', 'cancelled', 'expired', 'trialing'] },
              stripe_customer_id: { type: ['string', 'null'] },
              stripe_subscription_id: { type: ['string', 'null'] },
              plan_type: { type: ['string', 'null'], enum: ['monthly', 'yearly', 'lifetime'] },
              subscription_start_date: { type: ['string', 'null'], format: 'date-time' },
              subscription_end_date: { type: ['string', 'null'], format: 'date-time' },
              trial_status: { type: 'string', enum: ['none', 'active', 'expired', 'converted'] },
              payment_status: { type: 'string', enum: ['none', 'succeeded', 'failed', 'pending', 'refunded'] },
              is_premium_active: { type: 'boolean' },
              access_state: { type: 'string', enum: ['active', 'trialing', 'cancelled_grace', 'past_due', 'expired', 'inactive', 'admin'] },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            description: 'No active trial',
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Cancelling trial');

      try {
        // Load user's profile
        const profileRows = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, userId));

        if (profileRows.length === 0) {
          return reply.status(404).send({ error: 'profile_not_found' });
        }

        const profile = profileRows[0];

        // Check if trial is active
        if (profile.trialStatus !== 'active') {
          return reply.status(400).send({ error: 'no_active_trial' });
        }

        // Cancel trial
        const now = new Date();
        const updated = await app.db
          .update(schema.userProfiles)
          .set({
            trialStatus: 'expired',
            subscriptionStatus: 'expired',
            accountType: 'free',
            subscriptionEndDate: now,
            paymentStatus: 'none',
            role: profile.role === 'admin' ? 'admin' : 'free',
            updatedAt: now,
          })
          .where(eq(schema.userProfiles.userId, userId))
          .returning();

        app.logger.info({ userId }, 'Trial cancelled successfully');
        return formatProfileResponse(updated[0]);
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to cancel trial');
        throw error;
      }
    }
  );
}
