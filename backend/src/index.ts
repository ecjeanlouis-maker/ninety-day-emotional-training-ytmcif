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

// Add global error handler for better diagnostics
app.fastify.setErrorHandler((error: any, request, reply) => {
  console.error('[GLOBAL ERROR HANDLER]', error?.message, error?.stack, error?.cause ?? '');
  reply.status(error?.statusCode ?? 500).send({ error: error?.message ?? 'Internal server error' });
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
          console.error('[AUTH sendVerificationEmail ERROR]', (result as any).error);
        }
      } catch (error: any) {
        console.error('[AUTH sendVerificationEmail ERROR]', error?.message, error?.stack);
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
          console.error('[AUTH sendResetPassword ERROR]', (result as any).error);
        }
      } catch (error: any) {
        console.error('[AUTH sendResetPassword ERROR]', error?.message, error?.stack);
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
            }).catch((error: any) => {
              console.error('[AUTH user.create.after ERROR]', error?.message, error?.stack);
            });
          } catch (error: any) {
            console.error('[AUTH user.create.after ERROR]', error?.message, error?.stack);
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
            } catch (dbError: any) {
              console.error('[AUTH session.create.after ERROR]', dbError?.message, dbError?.stack);
            }
          } catch (error: any) {
            console.error('[AUTH session.create.after ERROR]', error?.message, error?.stack);
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
} catch (error: any) {
  // Log the specific Stripe error but don't crash the server
  const errorMsg = error?.message ?? String(error);
  console.error('[Stripe bootstrap error]', errorMsg);
  app.logger.warn({ err: error }, 'Stripe bootstrap failed - continuing without Stripe');
}

await app.run();
app.logger.info('Application running');
