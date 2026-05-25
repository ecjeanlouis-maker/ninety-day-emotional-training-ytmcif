# Security Rules & Guidelines

This document outlines security requirements for all endpoints and future development.

## Authentication & Authorization

### User ID Derivation

**Rule: Always derive `userId` from the Better Auth session — NEVER from `req.body`, `req.params`, or `req.query`.**

All user-scoped endpoints must use the `requireAuthUserId()` helper function:

```typescript
import { requireAuthUserId } from '../lib/auth.js';

app.fastify.get('/api/user-data', async (request, reply) => {
  const userId = await requireAuthUserId(request, reply, requireAuth);
  if (!userId) return; // 401 already sent

  // Now use userId for all database queries
  const data = await db.select().from(schema.userTable)
    .where(eq(schema.userTable.userId, userId));
});
```

### Database Query Requirements

**Rule: Every SQL SELECT / UPDATE / DELETE against a user-scoped table MUST include `WHERE user_id = $userId`.**

This ensures data isolation and prevents cross-user access.

```typescript
// ✅ CORRECT
await db.select().from(schema.userProfiles)
  .where(eq(schema.userProfiles.userId, userId));

// ❌ WRONG - No user_id filter
await db.select().from(schema.userProfiles);

// ❌ WRONG - user_id from request
const userId = request.body.user_id; // Never do this
```

### Admin Access

**Rule: Cross-user reads/writes are ALWAYS forbidden unless an explicit role check (`role = 'admin'`) is applied. Admin reads must still log the access.**

Admin endpoints must:
1. Authenticate the user
2. Check that `role === 'admin'`
3. Log admin access with admin ID and target resource

```typescript
const session = await requireAuth(request, reply);
if (!session) return;

const profile = await db.select().from(schema.userProfiles)
  .where(eq(schema.userProfiles.userId, session.user.id));

if (profile[0].role !== 'admin') {
  reply.status(403).send({ error: 'Admin access required' });
  return;
}

// Log admin access
app.logger.info(
  { adminId: session.user.id, targetResource: resourceId },
  'Admin accessed resource'
);
```

## User-Scoped Tables

### Design Requirements

Every user-scoped table MUST have:
- A non-null `user_id text` column (references Better Auth `user.id`)
- Foreign key constraint: `REFERENCES user(id) ON DELETE CASCADE`

```typescript
export const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  // ... other columns
});
```

### Endpoint Requirements

Every endpoint operating on user-scoped tables MUST:
1. Call `requireAuthUserId(request, reply, requireAuth)` at the start
2. Filter all queries by `WHERE user_id = $authenticatedUserId`
3. Include `security: [{ bearerAuth: [] }]` in OpenAPI schema
4. Return 404 if the record is not found (not 403)
5. Return 401 if unauthenticated (not 403)

```typescript
app.fastify.get('/api/my-data/:id', {
  schema: {
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    }
  }
}, async (request, reply) => {
  const userId = await requireAuthUserId(request, reply, requireAuth);
  if (!userId) return;

  const { id } = request.params;

  // Ownership check: filter by both id AND userId
  const record = await db.select().from(schema.myTable)
    .where(and(
      eq(schema.myTable.id, id),
      eq(schema.myTable.userId, userId)
    ));

  if (record.length === 0) {
    return reply.status(404).send({ error: 'Record not found' });
  }

  return record[0];
});
```

## API Security Declarations

### Bearer Token Authentication

All user-scoped endpoints MUST declare authentication in OpenAPI schema:

```typescript
schema: {
  security: [{ bearerAuth: [] }],
  // ... rest of schema
}
```

### Public/Webhook Endpoints

The following endpoints are intentionally public and MUST NOT have `security` declared:
- `GET /api/health` (or equivalent health checks)
- `POST /api/stripe/webhook` (Stripe-signed webhook, not user-authenticated)
- Any Better Auth routes under `/api/auth/*`

## Current User-Scoped Tables

All of these require the security rules above:
- `user_profiles` (PK: `user_id`)
- `payment_methods` (FK: `user_id`)
- `payment_transactions` (FK: `user_id`)
- `subscriptions` (FK: `user_id`)
- `stripe_customers` (FK: `user_id`)
- `subscription_reminders` (FK: `user_id`)

## Future Tables

When adding new user-scoped tables (e.g., journal, progress, emotional_tracker, saved_lessons):

1. **Schema**: Always include non-null `user_id text` column with foreign key to auth user
2. **Endpoints**: Call `requireAuthUserId()` and filter by user_id on all queries
3. **OpenAPI**: Add `security: [{ bearerAuth: [] }]` to all user-scoped endpoints
4. **Testing**: Verify cross-user access is impossible (ownership checks work)
5. **Logging**: Log user access to sensitive operations

Example schema for new table:

```typescript
export const journal = pgTable('journal', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

## Common Mistakes to Avoid

- ❌ Reading `user_id` from `request.body` instead of session
- ❌ Forgetting `WHERE user_id = $userId` in queries
- ❌ Not checking `role === 'admin'` before cross-user operations
- ❌ Forgetting ownership checks on GET/:id endpoints
- ❌ Not logging admin access to resources
- ❌ Accepting `user_id` parameter from client (always use session)
- ❌ Returning 403 instead of 404 for missing resources
- ❌ Mixing authentication and authorization (both required)

## Stripe & Payment Security

### Webhook Handling

Stripe webhooks (`POST /api/stripe/webhook`):
- Must NOT require Bearer authentication (Stripe signs with secret)
- MUST verify webhook signature before processing
- MUST check for duplicate events (idempotency)
- MUST log all events
- MUST NOT expose user data in webhook response

### Customer Lookup

All payment operations that need a Stripe customer must:
1. Authenticate the user (get `userId` from session)
2. Look up Stripe customer: `SELECT FROM stripe_customers WHERE user_id = $userId`
3. Never accept `stripe_customer_id` from client request

```typescript
// ✅ CORRECT
const userId = await requireAuthUserId(request, reply, requireAuth);
const customer = await db.select().from(schema.stripeCustomers)
  .where(eq(schema.stripeCustomers.userId, userId));

// ❌ WRONG - Accepting customer ID from client
const customerId = request.body.stripe_customer_id;
const session = await stripe.checkout.sessions.create({ customer: customerId });
```

## Logging Requirements

All endpoints must log:
- **Info**: Route entry with relevant context (userId, action)
- **Info**: Successful operations with result context
- **Warn**: Recoverable issues, deprecated usage
- **Error**: All caught exceptions with context

```typescript
app.logger.info({ userId }, 'Fetching user data');
try {
  const data = await db.select().from(schema.userTable)
    .where(eq(schema.userTable.userId, userId));
  app.logger.info({ userId, recordCount: data.length }, 'User data fetched');
  return data;
} catch (error) {
  app.logger.error({ err: error, userId }, 'Failed to fetch user data');
  throw error;
}
```

Admin operations should log the admin ID and action:

```typescript
app.logger.info(
  { adminId: session.user.id, targetUserId, action: 'role_update' },
  'Admin performed action'
);
```
