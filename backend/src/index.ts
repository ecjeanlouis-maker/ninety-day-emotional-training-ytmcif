import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerPaymentRoutes } from './routes/payments.js';
import { sendEmail } from './lib/email.js';
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
          const { html, text } = welcomeEmailTemplate({
            userName: user.name || undefined,
          });
          await sendEmail({
            to: user.email,
            subject: 'Welcome to Control & Confidence',
            html,
            text,
          });
        },
      },
    },
  },
} as any);

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerPaymentRoutes(app);

await app.run();
app.logger.info('Application running');
