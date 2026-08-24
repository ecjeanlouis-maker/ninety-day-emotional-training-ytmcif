import { createApplication } from "@specific-dev/framework";
import { eq } from 'drizzle-orm';
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerPaymentRoutes } from './routes/payments.js';
import { registerProfileRoutes } from './routes/profiles.js';
import { registerStripeRoutes } from './routes/stripe.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerAssessmentRoutes } from './routes/assessments.js';
import { registerProgressRoutes } from './routes/progress.js';
import { registerProgramRoutes } from './routes/program.js';
import { registerCheckinRoutes } from './routes/checkins.js';
import { registerJournalRoutes } from './routes/journal.js';
import { registerEntitlementRoutes } from './routes/entitlement.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerReminderRoutes } from './routes/reminders.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerAccountRoutes } from './routes/account.js';
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
  trustedOrigins: [
    'controlconfidence://',
    'control-confidence://',
    'https://yt8rvpzc3a4km4e9x2umpgmuhs7cvhdm.app.specular.dev',
    'https://1fa93668-238b-4d6d-8fa0-fc80cddef055.newly.dev',
    'http://localhost:8081',
    'http://localhost:19006',
    'exp://',
  ],
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
            if (!adminEmails.length) return;

            // BA 1.4.x: session hook receives Session object only — no .user property.
            // Must use session.userId to look up the user.
            const userId = (session as any).userId;
            if (!userId) return;

            // Look up the user's email from the auth schema
            const userRows = await app.db
              .select()
              .from(authSchema.user)
              .where(eq(authSchema.user.id, userId))
              .limit(1);

            if (!userRows.length) return;
            const userEmail = userRows[0].email;
            if (!adminEmails.includes(userEmail)) return;

            // Promote to admin in user_profiles if profile exists
            try {
              const profile = await app.db
                .select()
                .from(appSchema.userProfiles)
                .where(eq(appSchema.userProfiles.userId, userId))
                .limit(1);

              if (profile.length > 0) {
                await app.db
                  .update(appSchema.userProfiles)
                  .set({ role: 'admin', updatedAt: new Date() })
                  .where(eq(appSchema.userProfiles.userId, userId));

                app.logger.info({ userId, email: userEmail }, 'User promoted to admin');
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

// Warn if Google OAuth credentials are missing
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!googleClientId || !googleClientSecret) {
  app.logger.warn(
    'Google OAuth credentials not configured. ' +
    'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars. ' +
    'Authorized JavaScript origin: https://yt8rvpzc3a4km4e9x2umpgmuhs7cvhdm.app.specular.dev ' +
    'Authorized redirect URI: https://yt8rvpzc3a4km4e9x2umpgmuhs7cvhdm.app.specular.dev/api/auth/callback/google'
  );
}

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerPaymentRoutes(app);
registerProfileRoutes(app);
registerStripeRoutes(app);
registerAdminRoutes(app);
registerOnboardingRoutes(app);
registerAssessmentRoutes(app);
registerProgressRoutes(app);
registerProgramRoutes(app);
registerCheckinRoutes(app);
registerJournalRoutes(app);
registerWebhookRoutes(app);
registerEntitlementRoutes(app);
registerReminderRoutes(app);
registerAnalyticsRoutes(app);
registerAccountRoutes(app);

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
