# Stripe Billing System Setup

Complete Stripe subscription billing integration with admin panel, analytics, and CMS content management.

## Overview

The Stripe billing system provides:
- Subscription checkout with Stripe Checkout
- Billing portal for subscription management
- Subscription status tracking and cancellation
- Plan changes and resume functionality
- Webhook handling for Stripe events
- Admin dashboard for user and subscription management
- Analytics overview (total users, revenue, MRR)
- Content management system for paywall and welcome pages

## Database Tables

### New Tables

**stripe_customers** - Maps users to Stripe customer IDs
- id (uuid, PK)
- user_id (text, FK to user, unique)
- stripe_customer_id (text, unique)
- created_at (timestamp with timezone)

**stripe_config** - Singleton configuration for Stripe setup
- id (uuid, PK)
- publishable_key (text, optional)
- webhook_secret (text, optional)
- bootstrapped (boolean, default false)
- created_at (timestamp with timezone)
- updated_at (timestamp with timezone)

**stripe_events** - Webhook event deduplication
- id (uuid, PK)
- stripe_event_id (text, unique)
- type (text)
- data (jsonb)
- processed (boolean, default false)
- created_at (timestamp with timezone)

**subscription_reminders** - Daily renewal reminder scheduling
- id (uuid, PK)
- user_id (text, FK to user, cascade)
- subscription_id (uuid, FK to subscriptions, cascade)
- type (text) - 'renewal_upcoming', 'renewal_failed'
- scheduled_at (timestamp with timezone)
- sent_at (timestamp with timezone)
- created_at (timestamp with timezone)

**app_content** - CMS for paywall and welcome content
- id (uuid, PK)
- key (text, unique) - 'welcome', 'paywall', etc.
- title (text)
- subtitle (text, optional)
- content (jsonb) - HTML, feature list, or structured data
- created_at (timestamp with timezone)
- updated_at (timestamp with timezone)

### Modified Tables

**subscriptions**
- Added: stripe_customer_id (text, optional)
- Added: provider (text, default 'stripe') - for RevenueCat coexistence

**payment_transactions**
- Added: stripe_invoice_id (text, optional)

**user_profiles**
- Added: is_active (boolean, default true)

## API Endpoints

### Public Endpoints

#### GET /api/stripe/plans
Get available subscription plans.

Response:
```json
{
  "plans": [
    {
      "priceId": "price_xxx",
      "productId": "prod_xxx",
      "planType": "monthly",
      "programType": "emotional",
      "amount": 499,
      "currency": "usd",
      "recurring": {
        "interval": "month",
        "interval_count": 1
      }
    }
  ]
}
```

### Authenticated Endpoints

#### POST /api/stripe/checkout-session
Create Stripe Checkout session for subscription purchase.

Request:
```json
{
  "priceId": "price_xxx"
}
```

Response:
```json
{
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

#### POST /api/stripe/billing-portal
Create Stripe billing portal session.

Response:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

#### GET /api/stripe/subscription
Get current active subscription status.

Response:
```json
{
  "subscription": {
    "id": "uuid",
    "programType": "emotional",
    "planType": "monthly",
    "status": "active",
    "amount": 499,
    "startedAt": "2026-05-25T10:00:00.000Z",
    "expiresAt": null
  }
}
```

#### GET /api/stripe/billing-history
Get payment transaction history (up to 50 most recent).

Response:
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": 499,
      "status": "succeeded",
      "description": null,
      "createdAt": "2026-05-25T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/stripe/cancel
Cancel active subscription.

Response:
```json
{
  "message": "Subscription cancelled successfully"
}
```

#### POST /api/stripe/resume
Resume previously cancelled subscription.

Response:
```json
{
  "message": "Subscription resumed successfully"
}
```

#### POST /api/stripe/change-plan
Change subscription plan (upgrade/downgrade).

Request:
```json
{
  "newPriceId": "price_xxx"
}
```

Response:
```json
{
  "message": "Plan changed successfully"
}
```

#### POST /api/stripe/webhook
Stripe webhook endpoint (public, no auth required).

Handles events:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded

Response:
```json
{
  "received": true
}
```

### Admin Endpoints

All admin endpoints require authentication and admin role in user_profiles.

#### GET /api/admin/users
Get all users with profiles and subscription status (paginated).

Query params:
- page (number, default 1)
- limit (number, default 50, max 100)

Response:
```json
{
  "users": [
    {
      "userId": "user_xxx",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "free",
      "isActive": true,
      "hasSubscription": true,
      "createdAt": "2026-05-25T10:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1
}
```

#### PATCH /api/admin/users/:userId
Update user role or active status.

Request:
```json
{
  "role": "premium",
  "isActive": true
}
```

Response:
```json
{
  "message": "User updated successfully"
}
```

#### GET /api/admin/subscriptions
Get all subscriptions (paginated, optionally filtered by status).

Query params:
- page (number, default 1)
- limit (number, default 50, max 100)
- status (string, optional) - 'active', 'cancelled', 'expired', 'pending'

Response:
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "userId": "user_xxx",
      "programType": "emotional",
      "planType": "monthly",
      "status": "active",
      "amount": 499,
      "startedAt": "2026-05-25T10:00:00.000Z",
      "expiresAt": null
    }
  ],
  "total": 50,
  "page": 1
}
```

#### GET /api/admin/payments
Get payment transactions (paginated).

Query params:
- page (number, default 1)
- limit (number, default 50, max 100)

Response:
```json
{
  "transactions": [
    {
      "id": "uuid",
      "userId": "user_xxx",
      "amount": 499,
      "status": "succeeded",
      "createdAt": "2026-05-25T10:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1
}
```

#### GET /api/admin/analytics/overview
Get high-level analytics.

Response:
```json
{
  "totalUsers": 500,
  "activeSubscriptions": 150,
  "totalRevenue": 75000.00,
  "averageSubscriptionValue": 500.00,
  "monthlyRecurringRevenue": 35000.00
}
```

#### GET /api/admin/content/:key
Get content by key (welcome, paywall, etc.).

Response:
```json
{
  "content": {
    "key": "welcome",
    "title": "Welcome to Control & Confidence",
    "subtitle": "Transform your mindset",
    "content": {
      "html": "<h1>...</h1>",
      "features": ["Feature 1", "Feature 2"]
    }
  }
}
```

#### PATCH /api/admin/content/:key
Create or update content.

Request:
```json
{
  "title": "Updated Title",
  "subtitle": "Updated subtitle",
  "content": {
    "html": "<h1>...</h1>",
    "features": ["Feature 1", "Feature 2"]
  }
}
```

Response:
```json
{
  "message": "Content updated successfully"
}
```

## Configuration

### Environment Variables

Required:
- `STRIPE_SECRET_KEY` - Stripe secret API key (required for production)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `FRONTEND_URL` - Frontend URL for redirect links (default: http://localhost:3000)

### Stripe Bootstrap

On application startup, if Stripe is configured, the system automatically:
1. Checks if products/prices already exist
2. If not, creates products for each program type:
   - Monthly plan ($4.99/month)
   - Lifetime plan ($10.99 one-time)
   - Premium lifetime plan ($59.99 one-time)
3. Creates prices with metadata for plan_type and program_type

Program types: emotional, confidence, anger, stress, social-anxiety, thoughts

### Webhook Configuration

1. Get your webhook endpoint URL: `https://yourdomain.com/api/stripe/webhook`
2. Create a webhook endpoint in Stripe Dashboard:
   - Settings > Webhooks > Add endpoint
   - URL: Your webhook endpoint
   - Events: Select all subscription and invoice events
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Admin Role Setup

Admin users are created by setting role to 'admin' in user_profiles via the PATCH /api/admin/users/:userId endpoint.

Admin permissions:
- View all users
- Modify user roles and active status
- View all subscriptions
- View all payments
- View analytics
- Manage CMS content

To promote a user to admin:
```bash
PATCH /api/admin/users/:userId
{
  "role": "admin"
}
```

## Integration with User Profiles

The user_profiles table now includes:
- `is_active` - Flag for account suspension/deactivation
- `role` - 'free', 'premium', or 'admin'

When creating a profile via POST /api/profile:
- role always defaults to 'free'
- is_active always defaults to true
- admin role can only be set via admin endpoint

Stripe system respects these flags:
- Inactive users cannot access subscription endpoints
- Role determines AI message allowance and feature access

## Daily Renewal Reminders

The system can schedule renewal reminders for upcoming subscriptions:

1. Creates subscription_reminders entries with:
   - type: 'renewal_upcoming' (3 days before) or 'renewal_failed' (after failed renewal)
   - scheduled_at: when reminder should be sent
   - sent_at: null until reminder is sent

2. A background job (not yet implemented in routes) processes reminders:
   - Queries unsent reminders with scheduled_at <= now()
   - Sends email via sendEmail()
   - Updates sent_at timestamp

## CMS Content Management

Content can be managed per key (welcome, paywall, etc.):

```bash
# Create welcome page content
PATCH /api/admin/content/welcome
{
  "title": "Welcome to Control & Confidence",
  "subtitle": "Transform your mindset",
  "content": {
    "hero_text": "Start your journey today",
    "features": ["Feature 1", "Feature 2"],
    "cta_button": "Get Started"
  }
}

# Update paywall
PATCH /api/admin/content/paywall
{
  "title": "Unlock Premium Features",
  "subtitle": "Get access to all programs",
  "content": {
    "pricing": {...},
    "benefits": [...]
  }
}
```

## Security

- All authenticated endpoints require valid session token
- Admin endpoints additionally check for admin role
- Webhook signature verified using STRIPE_WEBHOOK_SECRET
- Events deduplicated using stripe_event_id unique constraint
- User isolation: users can only access their own subscriptions
- Role cannot be set from client except 'free'/'premium' (admin role admin-only)

## Error Handling

Consistent error responses:

**Validation Error (400)**
```json
{
  "error": "validation_error",
  "fields": {
    "field_name": "Error message"
  }
}
```

**Not Found (404)**
```json
{
  "error": "Resource not found"
}
```

**Unauthorized (401)**
```json
{
  "error": "Authentication required"
}
```

**Forbidden (403)**
```json
{
  "error": "Admin access required"
}
```

**Rate Limited (429)**
```json
{
  "error": "Too many requests"
}
```

## Testing Workflow

1. Create a user and profile
2. Get available plans: GET /api/stripe/plans
3. Create checkout session: POST /api/stripe/checkout-session
4. Use Stripe test cards to complete checkout
5. Check subscription status: GET /api/stripe/subscription
6. Access billing portal: POST /api/stripe/billing-portal
7. View billing history: GET /api/stripe/billing-history
8. Promote user to admin: PATCH /api/admin/users/:userId
9. View analytics: GET /api/admin/analytics/overview

## Production Checklist

- [ ] STRIPE_SECRET_KEY configured
- [ ] STRIPE_WEBHOOK_SECRET configured
- [ ] FRONTEND_URL configured correctly
- [ ] Database migrations applied
- [ ] Stripe webhook endpoint created and verified
- [ ] Test cards verified in checkout flow
- [ ] Admin user created and tested
- [ ] Email notifications configured (if using reminders)
- [ ] Monitoring set up for webhook failures
- [ ] Backup and recovery procedures documented

## Future Enhancements

- RevenueCat integration (provider field supports 'revenueCat')
- Automated renewal reminder emails
- Subscription usage tracking and limits by plan
- Proration handling for mid-cycle upgrades
- Dunning management for failed payments
- Custom analytics dashboards
- Invoice PDF generation
- Coupon/discount codes
