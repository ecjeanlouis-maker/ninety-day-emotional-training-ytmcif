# User Profiles Subscription Fields - Implementation Summary

## Overview

Extended the `user_profiles` table with 9 new subscription management fields and added a new API endpoint for updating subscription status. The system now tracks detailed subscription lifecycle information including trial status, payment status, and Stripe integration details.

## Database Schema Changes

### Altered Table: `user_profiles`

Added 9 new columns (all nullable except those with defaults):

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_type text,
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none';
```

### Column Definitions

| Column | Type | Default | Nullable | Enums |
|--------|------|---------|----------|-------|
| account_type | text | 'free' | No | 'free', 'premium' |
| subscription_status | text | 'inactive' | No | 'inactive', 'active', 'past_due', 'cancelled', 'expired', 'trialing' |
| stripe_customer_id | text | NULL | Yes | - |
| stripe_subscription_id | text | NULL | Yes | - |
| plan_type | text | NULL | Yes | 'monthly', 'yearly', 'lifetime' |
| subscription_start_date | timestamptz | NULL | Yes | - |
| subscription_end_date | timestamptz | NULL | Yes | - |
| trial_status | text | 'none' | No | 'none', 'active', 'expired', 'converted' |
| payment_status | text | 'none' | No | 'none', 'succeeded', 'failed', 'pending', 'refunded' |

## API Changes

### 1. Updated: GET /api/profile

**New Response Fields:**
- `account_type` (string, enum) - User's account tier
- `subscription_status` (string, enum) - Current subscription state
- `stripe_customer_id` (string | null) - Stripe customer identifier
- `stripe_subscription_id` (string | null) - Stripe subscription identifier
- `plan_type` (string | null, enum) - Type of plan if subscribed
- `subscription_start_date` (ISO 8601 | null) - When subscription started
- `subscription_end_date` (ISO 8601 | null) - When subscription expires/expired
- `trial_status` (string, enum) - Trial state
- `payment_status` (string, enum) - Last payment outcome
- `is_premium_active` (boolean) - Computed field (see below)

**Computed Field: `is_premium_active`**

Returns `true` when ALL of the following are met:
- `account_type === 'premium'`
- `subscription_status` is one of: `'active'`, `'trialing'`
- `subscription_end_date` is null OR `subscription_end_date > now()`

Otherwise returns `false`.

**Example Response:**
```json
{
  "user_id": "user_123",
  "full_name": "Jane Doe",
  "age_range": "25_34",
  "main_goal": "build_confidence",
  "confidence_level": 4,
  "emotional_control_level": 3,
  "role": "premium",
  "is_active": true,
  "ai_messages_remaining": null,
  "account_type": "premium",
  "subscription_status": "active",
  "stripe_customer_id": "cus_xxx",
  "stripe_subscription_id": "sub_xxx",
  "plan_type": "monthly",
  "subscription_start_date": "2026-05-01T10:00:00.000Z",
  "subscription_end_date": null,
  "trial_status": "converted",
  "payment_status": "succeeded",
  "is_premium_active": true,
  "created_at": "2026-05-25T10:00:00.000Z",
  "updated_at": "2026-05-25T10:00:00.000Z"
}
```

### 2. Updated: POST /api/profile (create profile)

When creating a new profile, the system now explicitly sets:
- `account_type = 'free'`
- `subscription_status = 'inactive'`
- `trial_status = 'none'`
- `payment_status = 'none'`
- All other new fields: `null`

Request body remains unchanged (accepts only profile fields, not subscription fields).

Response includes all new subscription fields (see GET /api/profile above).

### 3. New Endpoint: POST /api/profile/subscription

Updates the authenticated user's subscription fields. This endpoint is designed to be called by verified webhook handlers (Stripe, RevenueCat).

**Authentication:** Required

**Path:** `/api/profile/subscription`

**Method:** POST

**Request Body Schema:**

```json
{
  "account_type": "free" | "premium",                              // REQUIRED
  "subscription_status": "inactive" | "active" | "past_due" | "cancelled" | "expired" | "trialing",  // optional
  "stripe_customer_id": string | null,                             // optional
  "stripe_subscription_id": string | null,                         // optional
  "plan_type": "monthly" | "yearly" | "lifetime" | null,          // optional
  "subscription_start_date": ISO 8601 string | null,              // optional
  "subscription_end_date": ISO 8601 string | null,                // optional
  "trial_status": "none" | "active" | "expired" | "converted",   // optional
  "payment_status": "none" | "succeeded" | "failed" | "pending" | "refunded"  // optional
}
```

**Validation Rules:**
- `account_type` is required; returns 400 if missing or invalid
- All provided fields are validated against their enums; returns 400 with field-level error messages on failure
- Date fields must be valid ISO 8601 strings; returns 400 if invalid
- Only fields present in the request body are updated; others left untouched
- Fields NOT accepted in body: `user_id` (always from session)

**Key Behavior: Role Synchronisation**

The endpoint automatically synchronises the `role` field for backwards compatibility:
- When `account_type === 'premium'`, sets `role = 'premium'`
- When `account_type === 'free'` AND `role !== 'admin'`, sets `role = 'free'`
- If `role === 'admin'`, it is NEVER changed

This ensures:
- Free users have `role = 'free'` and can access free features only
- Premium users have `role = 'premium'` and can access paid features
- Admin users retain admin role regardless of account_type

**Request Examples:**

Activate a subscription:
```json
{
  "account_type": "premium",
  "subscription_status": "active",
  "stripe_customer_id": "cus_xxx",
  "stripe_subscription_id": "sub_xxx",
  "plan_type": "monthly",
  "subscription_start_date": "2026-05-25T10:00:00.000Z",
  "trial_status": "converted",
  "payment_status": "succeeded"
}
```

Mark subscription as failed:
```json
{
  "account_type": "premium",
  "subscription_status": "past_due",
  "payment_status": "failed"
}
```

Downgrade to free (from webhook):
```json
{
  "account_type": "free",
  "subscription_status": "cancelled",
  "stripe_subscription_id": null,
  "trial_status": "none",
  "payment_status": "none"
}
```

**Response (200 OK):**

Returns full updated profile in same shape as GET /api/profile.

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Validation error (missing account_type, invalid enum, bad date) | `{ "error": "validation_error", "fields": { "field_name": "error message" } }` |
| 401 | Not authenticated | `{ "error": "Unauthorized" }` |
| 404 | Profile not found | `{ "error": "profile_not_found" }` |

**Example Error Response:**

```json
{
  "error": "validation_error",
  "fields": {
    "subscription_status": "subscription_status must be one of: inactive, active, past_due, cancelled, expired, trialing",
    "subscription_start_date": "subscription_start_date must be a valid ISO 8601 date string"
  }
}
```

## Logging

All endpoints log at appropriate levels:
- **Info:** Route entry with relevant context (userId, action)
- **Error:** All exceptions with context and userId for debugging

Example logs:
```
[info] userId: user_123 | Fetching profile
[info] userId: user_123 accountType: premium | Subscription fields updated successfully
[error] userId: user_123 | Failed to update subscription fields
```

## Backwards Compatibility

✓ All existing endpoints continue to work  
✓ New fields added with sensible defaults  
✓ Role field kept in sync with account_type  
✓ GET /api/profile always returns complete profile shape  
✓ POST /api/profile (profile creation) unchanged for clients  
✓ PATCH /api/profile (profile update) unchanged for clients  

## Migration

Migration file: `drizzle/20260525040000_user_profiles_subscription.sql`

The migration uses `ADD COLUMN IF NOT EXISTS` to ensure idempotency. Existing rows automatically receive the default values.

## Security

- Authentication required on all endpoints
- User isolation: subscription fields can only be updated for authenticated user (user_id from session)
- Client cannot set subscription fields via POST /api/profile (only via new /api/profile/subscription)
- Admin role protected: cannot be changed by account_type field

## Use Cases

### Webhook Integration

When Stripe/RevenueCat webhooks arrive:

1. Verify webhook signature
2. Call `POST /api/profile/subscription` with new subscription state
3. System automatically updates all fields and synchronises role
4. Return updated profile to webhook handler

### Trial Management

```json
{
  "account_type": "premium",
  "subscription_status": "trialing",
  "trial_status": "active",
  "subscription_start_date": "2026-05-25T10:00:00.000Z",
  "subscription_end_date": "2026-06-25T10:00:00.000Z"
}
```

### Payment Failure Recovery

```json
{
  "payment_status": "failed",
  "subscription_status": "past_due"
}
```

### Subscription Downgrade

```json
{
  "account_type": "free",
  "subscription_status": "cancelled",
  "subscription_end_date": "2026-05-31T23:59:59.000Z"
}
```

## OpenAPI Schema

All endpoints documented with complete OpenAPI schemas including:
- Field descriptions and types
- Enum constraints for validation
- Required/optional markers
- Error response schemas
- Example values

## Testing Checklist

- [ ] Create profile (defaults applied correctly)
- [ ] Get profile (all new fields returned)
- [ ] Update subscription to active (role synced to premium)
- [ ] Update subscription to cancelled (role synced to free)
- [ ] Admin user stays admin even with account_type changes
- [ ] Invalid enum values rejected with 400
- [ ] Invalid dates rejected with 400
- [ ] Missing account_type rejected with 400
- [ ] Unauthenticated request rejected with 401
- [ ] Non-existent profile rejected with 404
- [ ] is_premium_active computed correctly
- [ ] Partial updates work (only provided fields updated)
