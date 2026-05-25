/**
 * SECURITY RULES — READ BEFORE MODIFYING
 *
 * requireAuthUserId(req, reply, requireAuthFn) is the ONLY authorised way to obtain a userId in this codebase.
 *
 * Rules:
 *  1. Always derive userId from the Better Auth session — NEVER from req.body, req.params, or req.query.
 *  2. Every SQL SELECT / UPDATE / DELETE against a user-scoped table MUST include
 *     WHERE user_id = $userId  (where $userId comes from requireAuthUserId).
 *  3. Cross-user reads/writes are ALWAYS forbidden unless an explicit role check
 *     (role = 'admin') is applied. Admin reads must still log the access.
 *
 * Forward-looking rules (journal, progress, emotional_tracker, saved_lessons, etc.):
 *  - Every new user-scoped table MUST have a non-null `user_id text` column.
 *  - Every endpoint operating on those tables MUST call requireAuthUserId and filter by user_id.
 *  - No endpoint may accept a user_id from the client to override the session user_id.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Extract and validate user ID from Better Auth session.
 * This is the ONLY way to obtain a userId for database operations.
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @param requireAuthFn - Result of app.requireAuth() call
 * @returns userId string on success, or sends 401 and returns null on auth failure
 */
export async function requireAuthUserId(
  request: FastifyRequest,
  reply: FastifyReply,
  requireAuthFn: (req: FastifyRequest, rep: FastifyReply) => Promise<any>
): Promise<string | null> {
  const session = await requireAuthFn(request, reply);
  if (!session || !session.user || !session.user.id) {
    return null;
  }

  return session.user.id;
}
