import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

interface ProgressResponse {
  current_streak: number;
  longest_streak: number;
  total_days_completed: number;
  total_xp: number;
  weekly_completion: any[];
  current_day: number;
}

export function registerProgressRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/progress - Fetch progress for the authenticated user
  app.fastify.get(
    "/api/progress",
    {
      schema: {
        description: "Get user progress",
        tags: ["progress"],
        response: {
          200: {
            description: "Progress retrieved successfully",
            type: "object",
            properties: {
              current_streak: { type: "number" },
              longest_streak: { type: "number" },
              total_days_completed: { type: "number" },
              total_xp: { type: "number" },
              weekly_completion: { type: "array" },
              current_day: { type: "number" },
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
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<ProgressResponse> => {
      const session = await requireAuth(request, reply);
      if (!session) {
        return {
          current_streak: 0,
          longest_streak: 0,
          total_days_completed: 0,
          total_xp: 0,
          weekly_completion: [],
          current_day: 1,
        };
      }

      const userId = session.user.id;
      app.logger.info({ userId }, "Fetching progress");

      try {
        const progressRecords = await app.db
          .select()
          .from(schema.userProgress)
          .where(eq(schema.userProgress.userId, userId))
          .limit(1);

        if (!progressRecords.length) {
          app.logger.info({ userId }, "No progress record found, returning defaults");
          return {
            current_streak: 0,
            longest_streak: 0,
            total_days_completed: 0,
            total_xp: 0,
            weekly_completion: [],
            current_day: 1,
          };
        }

        const progress = progressRecords[0];
        app.logger.info(
          { progressId: progress.id, userId },
          "Progress retrieved successfully"
        );

        return {
          current_streak: progress.currentStreak,
          longest_streak: progress.longestStreak,
          total_days_completed: progress.totalDaysCompleted,
          total_xp: progress.totalXp,
          weekly_completion: (progress.weeklyCompletion as any[]) || [],
          current_day: progress.currentDay,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch progress"
        );
        throw error;
      }
    }
  );
}
