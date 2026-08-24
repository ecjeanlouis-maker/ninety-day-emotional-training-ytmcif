import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, desc } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";

interface AssessmentBody {
  emotional_identification: number;
  response_control: number;
  confidence_composure: number;
  assessment_type?: string;
}

export function registerAssessmentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/assessments - Submit a new assessment
  app.fastify.post<{ Body: AssessmentBody }>(
    "/api/assessments",
    {
      schema: {
        description: "Submit a new assessment",
        tags: ["assessments"],
        body: {
          type: "object",
          required: [
            "emotional_identification",
            "response_control",
            "confidence_composure",
          ],
          properties: {
            emotional_identification: { type: "integer", minimum: 0, maximum: 10 },
            response_control: { type: "integer", minimum: 0, maximum: 10 },
            confidence_composure: { type: "integer", minimum: 0, maximum: 10 },
            assessment_type: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Assessment submitted successfully",
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              emotional_identification: { type: "number" },
              response_control: { type: "number" },
              confidence_composure: { type: "number" },
              overall_score: { type: "number" },
              assessment_type: { type: "string" },
              created_at: { type: "string", format: "date-time" },
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
      request: FastifyRequest<{ Body: AssessmentBody }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const {
        emotional_identification,
        response_control,
        confidence_composure,
        assessment_type = "baseline",
      } = request.body;

      const fields = ['emotional_identification', 'response_control', 'confidence_composure'] as const;
      for (const field of fields) {
        const val = request.body[field as keyof typeof request.body];
        if (typeof val !== 'number' || val < 0 || val > 10) {
          return reply.status(400).send({ error: `${field} must be between 0 and 10` });
        }
      }

      app.logger.info(
        {
          userId,
          emotional_identification,
          response_control,
          confidence_composure,
        },
        "Submitting assessment"
      );

      try {
        const overallScore = Math.round(
          (emotional_identification + response_control + confidence_composure) /
            3
        );

        const result = await app.db
          .insert(schema.userAssessments)
          .values({
            userId,
            emotionalIdentification: emotional_identification,
            responseControl: response_control,
            confidenceComposure: confidence_composure,
            overallScore,
            assessmentType: assessment_type,
          })
          .returning();

        const assessment = result[0];
        app.logger.info(
          {
            assessmentId: assessment.id,
            userId,
            overallScore,
          },
          "Assessment submitted successfully"
        );

        return reply.status(200).send({
          id: assessment.id,
          emotional_identification: assessment.emotionalIdentification,
          response_control: assessment.responseControl,
          confidence_composure: assessment.confidenceComposure,
          overall_score: assessment.overallScore,
          assessment_type: assessment.assessmentType,
          created_at: assessment.createdAt.toISOString(),
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId, body: request.body },
          "Failed to submit assessment"
        );
        throw error;
      }
    }
  );

  // GET /api/assessments/latest - Fetch the most recent assessment
  app.fastify.get(
    "/api/assessments/latest",
    {
      schema: {
        description: "Get the most recent assessment",
        tags: ["assessments"],
        response: {
          200: {
            description: "Assessment retrieved successfully",
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              emotional_identification: { type: "number" },
              response_control: { type: "number" },
              confidence_composure: { type: "number" },
              overall_score: { type: "number" },
              assessment_type: { type: "string" },
              created_at: { type: "string", format: "date-time" },
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
      app.logger.info({ userId }, "Fetching latest assessment");

      try {
        const assessments = await app.db
          .select()
          .from(schema.userAssessments)
          .where(eq(schema.userAssessments.userId, userId))
          .orderBy(desc(schema.userAssessments.createdAt))
          .limit(1);

        if (!assessments.length) {
          app.logger.info({ userId }, "No assessment found");
          return reply.status(404).send({ error: "assessment_not_found" });
        }

        const assessment = assessments[0];
        app.logger.info(
          { assessmentId: assessment.id, userId },
          "Assessment retrieved successfully"
        );

        return reply.status(200).send({
          id: assessment.id,
          emotional_identification: assessment.emotionalIdentification,
          response_control: assessment.responseControl,
          confidence_composure: assessment.confidenceComposure,
          overall_score: assessment.overallScore,
          assessment_type: assessment.assessmentType,
          created_at: assessment.createdAt.toISOString(),
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          "Failed to fetch latest assessment"
        );
        throw error;
      }
    }
  );
}
