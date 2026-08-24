import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

interface OnboardingBody {
  preferred_name?: string;
  primary_goal?: string;
  biggest_challenge?: string;
  reminder_time?: string;
}

export function registerOnboardingRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/onboarding - Upsert onboarding record
  app.fastify.post<{ Body: OnboardingBody }>(
    "/api/onboarding",
    {
      schema: {
        description: "Upsert user onboarding record",
        tags: ["onboarding"],
        body: {
          type: "object",
          properties: {
            preferred_name: { type: "string", maxLength: 100 },
            primary_goal: { type: "string", maxLength: 200 },
            biggest_challenge: { type: "string", maxLength: 500 },
            reminder_time: { type: "string", maxLength: 10 },
          },
        },
        response: {
          200: {
            description: "Onboarding record upserted successfully",
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              preferred_name: { type: ["string", "null"] },
              primary_goal: { type: ["string", "null"] },
              biggest_challenge: { type: ["string", "null"] },
              reminder_time: { type: ["string", "null"] },
              completed_at: { type: ["string", "null"], format: "date-time" },
            },
          },
          401: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: OnboardingBody }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { preferred_name, primary_goal, biggest_challenge, reminder_time } =
        request.body;

      if (preferred_name !== undefined && (typeof preferred_name !== 'string' || preferred_name.length > 100)) {
        return reply.status(400).send({ error: 'preferred_name is invalid' });
      }
      if (primary_goal !== undefined && (typeof primary_goal !== 'string' || primary_goal.length > 500)) {
        return reply.status(400).send({ error: 'primary_goal is invalid' });
      }
      if (biggest_challenge !== undefined && (typeof biggest_challenge !== 'string' || biggest_challenge.length > 500)) {
        return reply.status(400).send({ error: 'biggest_challenge is invalid' });
      }
      if (reminder_time !== undefined && (typeof reminder_time !== 'string' || reminder_time.length > 10)) {
        return reply.status(400).send({ error: 'reminder_time is invalid' });
      }

      app.logger.info(
        { userId, preferred_name, primary_goal },
        "Upserting onboarding record"
      );

      try {
        const now = new Date();

        // Upsert onboarding record
        const result = await app.db
          .insert(schema.userOnboarding)
          .values({
            userId,
            preferredName: preferred_name || null,
            primaryGoal: primary_goal || null,
            biggestChallenge: biggest_challenge || null,
            reminderTime: reminder_time || null,
            completedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.userOnboarding.userId,
            set: {
              preferredName: preferred_name || null,
              primaryGoal: primary_goal || null,
              biggestChallenge: biggest_challenge || null,
              reminderTime: reminder_time || null,
              completedAt: now,
              updatedAt: now,
            },
          })
          .returning();

        // Ensure user_progress record exists
        await app.db
          .insert(schema.userProgress)
          .values({
            userId,
          })
          .onConflictDoNothing();

        const onboarding = result[0];
        app.logger.info(
          { onboardingId: onboarding.id, userId },
          "Onboarding record upserted successfully"
        );

        return reply.status(200).send({
          id: onboarding.id,
          preferred_name: onboarding.preferredName,
          primary_goal: onboarding.primaryGoal,
          biggest_challenge: onboarding.biggestChallenge,
          reminder_time: onboarding.reminderTime,
          completed_at: onboarding.completedAt?.toISOString() || null,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId, body: request.body },
          "Failed to upsert onboarding"
        );
        throw error;
      }
    }
  );

  // GET /api/onboarding - Fetch onboarding record
  app.fastify.get(
    "/api/onboarding",
    {
      schema: {
        description: "Get user onboarding record",
        tags: ["onboarding"],
        response: {
          200: {
            description: "Onboarding record retrieved successfully",
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              preferred_name: { type: ["string", "null"] },
              primary_goal: { type: ["string", "null"] },
              biggest_challenge: { type: ["string", "null"] },
              reminder_time: { type: ["string", "null"] },
              completed_at: { type: ["string", "null"], format: "date-time" },
            },
          },
          401: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, "Fetching onboarding record");

      try {
        const onboarding = await app.db
          .select()
          .from(schema.userOnboarding)
          .where(eq(schema.userOnboarding.userId, userId))
          .limit(1);

        if (!onboarding.length) {
          app.logger.info({ userId }, "Onboarding record not found");
          return reply.status(404).send({ error: "onboarding_not_found" });
        }

        const record = onboarding[0];
        app.logger.info(
          { onboardingId: record.id, userId },
          "Onboarding record retrieved successfully"
        );

        return reply.status(200).send({
          id: record.id,
          preferred_name: record.preferredName,
          primary_goal: record.primaryGoal,
          biggest_challenge: record.biggestChallenge,
          reminder_time: record.reminderTime,
          completed_at: record.completedAt?.toISOString() || null,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch onboarding"
        );
        throw error;
      }
    }
  );
}
