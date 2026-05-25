import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerPaymentRoutes } from './routes/payments.js';

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
      console.log('========== EMAIL VERIFICATION ==========');
      console.log('To:', user.email);
      console.log('URL:', url);
      console.log('========================================');
    },
    sendResetPassword: async ({ user, url }) => {
      console.log('========== PASSWORD RESET ==========');
      console.log('To:', user.email);
      console.log('URL:', url);
      console.log('====================================');
    },
  },
} as any);

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerPaymentRoutes(app);

await app.run();
app.logger.info('Application running');
