import { createApplication } from "@specific-dev/framework";
import { eq } from 'drizzle-orm';
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerPaymentRoutes } from './routes/payments.js';
import { registerProfileRoutes } from './routes/profiles.js';
import { registerStripeRoutes } from './routes/stripe.js';
import { registerAdminRoutes } from './routes/admin.js';
import { sendEmail } from './lib/email.js';
import { bootstrapStripe } from './lib/stripe.js';
import {
  verificationEmailTemplate,
  resetPasswordEmailTemplate,
  welcomeEmailTemplate,
} from './lib/email-templates.js';

// Combine schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Hook into swagger generation to add bearerAuth security scheme
// This enables routes with security: [{ bearerAuth: [] }] to resolve correctly
app.fastify.addHook('onSend', async (request, reply, payload) => {
  if (request.url === '/openapi.yaml' || request.url === '/openapi.json') {
    try {
      let spec = payload;
      if (typeof payload === 'string') {
        spec = JSON.parse(payload);
      }
      if (spec && typeof spec === 'object') {
        const specObj = spec as any;
        specObj.components = specObj.components || {};
        specObj.components.securitySchemes = specObj.components.securitySchemes || {};
        specObj.components.securitySchemes.bearerAuth = {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        };
        return JSON.stringify(specObj);
      }
    } catch (error) {
      console.error('[OPENAPI_HOOK_ERROR] Failed to add bearerAuth to OpenAPI spec:', error);
    }
  }
  return payload;
});

// Enable authentication with email verification and password reset
app.withAuth({
  emailAndPassword: {
    requireEmailVerification: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        const { html, text } = verificationEmailTemplate({
          userName: user.name || undefined,
          url,
        });
        const result = await sendEmail({
          to: user.email,
          subject: 'Verify your email address',
          html,
          text,
        });
        if (!result.ok) {
          console.error('[HOOK CRASH sendVerificationEmail]:', (result as any).error);
        }
      } catch (error) {
        console.error('[HOOK CRASH sendVerificationEmail]:', error, (error as any)?.stack);
      }
    },
    sendResetPassword: async ({ user, url }) => {
      try {
        const { html, text } = resetPasswordEmailTemplate({
          userName: user.name || undefined,
          url,
        });
        const result = await sendEmail({
          to: user.email,
          subject: 'Reset your password',
          html,
          text,
        });
        if (!result.ok) {
          console.error('[HOOK CRASH sendResetPassword]:', (result as any).error);
        }
      } catch (error) {
        console.error('[HOOK CRASH sendResetPassword]:', error, (error as any)?.stack);
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const { html, text } = welcomeEmailTemplate({
              userName: user.name || undefined,
            });
            // Fire-and-forget email send with error isolation
            sendEmail({
              to: user.email,
              subject: 'Welcome to Control & Confidence',
              html,
              text,
            }).catch((error) => {
              console.error(
                '[HOOK CRASH user.create.after]:',
                error instanceof Error ? error.message : error,
                (error as any)?.stack
              );
            });
          } catch (error) {
            console.error(
              '[HOOK CRASH user.create.after]:',
              error instanceof Error ? error.message : error,
              (error as any)?.stack
            );
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          try {
            const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) || [];

            if (!adminEmails.length) {
              return; // No admin promotion configured
            }

            // Check if this user's email is in the admin list
            const user = session.user;
            if (!user?.email || !adminEmails.includes(user.email)) {
              return; // Not an admin email
            }

            // Try to promote user to admin in user_profiles
            try {
              const profile = await app.db
                .select()
                .from(appSchema.userProfiles)
                .where(eq(appSchema.userProfiles.userId, user.id))
                .limit(1);

              if (profile.length > 0) {
                await app.db
                  .update(appSchema.userProfiles)
                  .set({ role: 'admin', updatedAt: new Date() })
                  .where(eq(appSchema.userProfiles.userId, user.id));

                app.logger.info({ userId: user.id, email: user.email }, 'User promoted to admin');
              }
            } catch (dbError) {
              console.error(
                '[HOOK CRASH session.create.after]:',
                dbError instanceof Error ? dbError.message : dbError,
                (dbError as any)?.stack
              );
            }
          } catch (error) {
            console.error(
              '[HOOK CRASH session.create.after]:',
              error instanceof Error ? error.message : error,
              (error as any)?.stack
            );
          }
        },
      },
    },
  },
} as any);

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerPaymentRoutes(app);
registerProfileRoutes(app);
registerStripeRoutes(app);
registerAdminRoutes(app);

// Bootstrap Stripe if configured - wrap in try/catch to prevent startup failure
try {
  await bootstrapStripe();
  app.logger.info('Stripe bootstrapped successfully');
} catch (error) {
  // Log the error but do not rethrow - Stripe misconfiguration should not crash the server
  console.error(
    '[STRIPE_BOOTSTRAP_ERROR]',
    error instanceof Error ? error.message : String(error)
  );
  app.logger.warn({ err: error }, 'Stripe bootstrap failed or not configured - continuing without Stripe');
}

await app.run();
app.logger.info('Application running');
