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

// Enable authentication with email verification and password reset
app.withAuth({
  emailAndPassword: {
    requireEmailVerification: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { html, text } = verificationEmailTemplate({
        userName: user.name || undefined,
        url,
      });
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        html,
        text,
      });
    },
    sendResetPassword: async ({ user, url }) => {
      const { html, text } = resetPasswordEmailTemplate({
        userName: user.name || undefined,
        url,
      });
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        html,
        text,
      });
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
                '[AUTH_HOOK_ERROR] Welcome email send failed for user',
                user.id,
                error instanceof Error ? error.message : error
              );
            });
          } catch (error) {
            console.error(
              '[AUTH_HOOK_ERROR] Welcome email hook failed for user',
              user.id,
              error instanceof Error ? error.message : error
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
                '[AUTH_HOOK_ERROR] Failed to promote user to admin',
                user.id,
                dbError instanceof Error ? dbError.message : dbError
              );
            }
          } catch (error) {
            console.error(
              '[AUTH_HOOK_ERROR] Session create hook failed',
              error instanceof Error ? error.message : error
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
