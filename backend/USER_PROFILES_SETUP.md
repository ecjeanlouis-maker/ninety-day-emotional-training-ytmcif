# User Profiles API - Setup and Implementation Guide

This document describes the user profiles system for the Control & Confidence application, including role-based AI message gating.

## Overview

The user profiles system provides:
- User profile creation and management
- Age range and main goal tracking
- Confidence and emotional control level assessment (1-5 scale)
- Free/Premium role management
- Daily AI message limiting for free tier users (3 messages/day)
- Unlimited AI messages for premium tier users
- Automatic 24-hour counter reset

## Database Table: `user_profiles`

### Schema

```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age_range TEXT NOT NULL,
  main_goal TEXT NOT NULL,
  confidence_level INTEGER NOT NULL,
  emotional_control_level INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'free',
  ai_messages_used_today INTEGER NOT NULL DEFAULT 0,
  ai_messages_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Columns

- **user_id**: TEXT PRIMARY KEY
  - Foreign key to Better Auth `user.id`
  - One-to-one relationship
  - Cascades on delete

- **full_name**: TEXT, NOT NULL
  - User's full name
  - Must be non-empty string

- **age_range**: TEXT, NOT NULL
  - Valid values: `'under_18'`, `'18_24'`, `'25_34'`, `'35_44'`, `'45_54'`, `'55_plus'`
  - Cannot be NULL or empty

- **main_goal**: TEXT, NOT NULL
  - Valid values: `'emotional_control'`, `'build_confidence'`, `'manage_anger'`, `'reduce_stress'`, `'social_anxiety'`, `'thought_regulation'`

- **confidence_level**: INTEGER, NOT NULL
  - Range: 1–5 (inclusive)
  - Represents user's self-assessed confidence

- **emotional_control_level**: INTEGER, NOT NULL
  - Range: 1–5 (inclusive)
  - Represents user's self-assessed emotional control

- **role**: TEXT, NOT NULL, DEFAULT 'free'
  - Valid values: `'free'`, `'premium'`
  - Defaults to `'free'` on creation
  - Free tier: 3 AI messages per 24 hours
  - Premium tier: unlimited AI messages

- **ai_messages_used_today**: INTEGER, NOT NULL, DEFAULT 0
  - Counter for AI messages used in current 24-hour window
  - Free tier only (premium users have unlimited)

- **ai_messages_reset_at**: TIMESTAMPTZ, NOT NULL, DEFAULT now()
  - Timestamp when the current 24-hour window started
  - Used to determine when to reset the counter
  - When `now() - ai_messages_reset_at >= 24 hours`, counter resets to 0

- **created_at**: TIMESTAMPTZ, NOT NULL, DEFAULT now()
  - Profile creation timestamp (UTC)

- **updated_at**: TIMESTAMPTZ, NOT NULL, DEFAULT now()
  - Profile last update timestamp (UTC)
  - Updated on any profile change

## API Endpoints

All endpoints require valid Better Auth session authentication.

### POST /api/profile - Create or Update Profile

**UPSERT** the authenticated user's profile. On conflict on `user_id`, updates all mutable fields.

#### Request

```json
{
  "full_name": "John Doe",
  "age_range": "25_34",
  "main_goal": "build_confidence",
  "confidence_level": 2,
  "emotional_control_level": 3
}
```

#### Validation

- **full_name**: Required, non-empty string
- **age_range**: Required, must be one of the valid enum values
- **main_goal**: Required, must be one of the valid enum values
- **confidence_level**: Required, integer 1–5
- **emotional_control_level**: Required, integer 1–5
- **role**: NOT accepted in request body (always set to 'free' on creation)
- **user_id**: NOT accepted in request body (always from session)

#### Response (200 OK)

```json
{
  "user_id": "user_123",
  "full_name": "John Doe",
  "age_range": "25_34",
  "main_goal": "build_confidence",
  "confidence_level": 2,
  "emotional_control_level": 3,
  "role": "free",
  "ai_messages_remaining": 3,
  "created_at": "2026-05-25T10:00:00.000Z",
  "updated_at": "2026-05-25T10:00:00.000Z"
}
```

#### Error Response (400 Bad Request)

```json
{
  "error": "validation_error",
  "fields": {
    "confidence_level": "confidence_level must be an integer between 1 and 5",
    "age_range": "age_range must be one of: under_18, 18_24, 25_34, 35_44, 45_54, 55_plus"
  }
}
```

### GET /api/profile - Retrieve Profile

Returns the authenticated user's profile.

#### Response (200 OK)

Same shape as POST response above.

The `ai_messages_remaining` field is computed server-side:
- If `role === 'premium'`: returns `null` (unlimited)
- Otherwise: calculates potential 24-hour reset first, then returns `Math.max(0, 3 - counter)`

#### Error Response (404 Not Found)

```json
{
  "error": "profile_not_found"
}
```

### PATCH /api/profile - Update Profile Fields

Update any subset of mutable fields. Only provided fields are updated.

#### Request

```json
{
  "full_name": "Jane Doe",
  "confidence_level": 4
}
```

#### Validation

- Same rules as POST, but only for fields present in the request
- Fields NOT accepted: `role`, `ai_messages_used_today`, `ai_messages_reset_at`, `user_id`

#### Response (200 OK)

Full updated profile in same shape as GET.

#### Error Responses

- **400 Bad Request**: Validation error on provided fields
- **404 Not Found**: Profile does not exist yet

### POST /api/profile/ai-message-consume - Check and Consume AI Message

Atomically checks the daily AI message limit and increments the counter if allowed.

#### Logic

1. Load the profile for the authenticated user
2. If profile not found: return 404
3. **Premium tier**: Do NOT touch counter, return 200 with `remaining: null`
4. **Free tier**:
   - If `now() - ai_messages_reset_at >= 24 hours`: Reset `ai_messages_used_today = 0` and `ai_messages_reset_at = now()` first
   - If `ai_messages_used_today >= 3`: Return 429 (daily limit reached), do NOT increment
   - Otherwise: Increment `ai_messages_used_today` by 1, return 200

#### Response (200 OK) - Allowed

```json
{
  "allowed": true,
  "remaining": 2,
  "role": "free"
}
```

Premium tier response:
```json
{
  "allowed": true,
  "remaining": null,
  "role": "premium"
}
```

#### Response (429 Too Many Requests) - Limit Reached

```json
{
  "allowed": false,
  "remaining": 0,
  "role": "free",
  "error": "daily_limit_reached",
  "resets_at": "2026-05-26T10:00:00.000Z"
}
```

#### Error Responses

- **401 Unauthorized**: Not authenticated
- **404 Not Found**: Profile does not exist

### POST /api/profile/role - Update Role

Updates the authenticated user's role. Currently for internal/verified use only.

#### Request

```json
{
  "role": "premium"
}
```

#### Validation

- **role**: Required, must be `'free'` or `'premium'`

#### Response (200 OK)

Full updated profile in same shape as GET.

#### Error Responses

- **400 Bad Request**: Invalid role value
- **401 Unauthorized**: Not authenticated
- **404 Not Found**: Profile does not exist

## AI Message Gating Logic

### Free Tier (Default)

- **Daily Limit**: 3 AI messages per 24-hour window
- **Counter Reset**: Automatic at 24 hours after `ai_messages_reset_at`
- **Behavior**:
  - On 1st, 2nd, 3rd message: Increment counter, return `allowed: true`, decrement `remaining`
  - On 4th message attempt: Return 429 with `remaining: 0`, `error: 'daily_limit_reached'`, and `resets_at` timestamp
  - Reset occurs silently on next request after 24 hours; counter goes back to 0

### Premium Tier

- **Daily Limit**: None (unlimited)
- **Counter**: Not used; `ai_messages_used_today` and `ai_messages_reset_at` ignored
- **Behavior**:
  - All requests return `allowed: true`, `remaining: null`, `role: 'premium'`
  - Counter is never incremented

## API Response Format

All responses use:
- **Timestamps**: ISO 8601 format (UTC): `"2026-05-25T10:00:00.000Z"`
- **JSON keys**: snake_case
- **Enums**: lowercase with underscores
- **Integers**: Raw integers (no strings)
- **Null values**: JSON `null` for nullable fields

## Error Handling

All endpoints follow consistent error response format:

### Validation Error (400)
```json
{
  "error": "validation_error",
  "fields": {
    "field_name": "Human-readable error message"
  }
}
```

### Not Found (404)
```json
{
  "error": "profile_not_found"
}
```

### Rate Limited (429)
```json
{
  "allowed": false,
  "remaining": 0,
  "role": "free",
  "error": "daily_limit_reached",
  "resets_at": "2026-05-26T10:00:00.000Z"
}
```

### Unauthorized (401)
Handled by Better Auth middleware automatically.

## Security & Authorization

- **Authentication**: All endpoints require valid Better Auth session
- **Ownership**: `user_id` always derived from authenticated session token, never from request body
- **Role Management**: Role updates currently accept any role but are intended for internal/verified use
- **Data Isolation**: Users can only access and modify their own profile

## Field Validation Rules

### full_name
- Type: string
- Required: yes
- Min length: 1 (non-empty after trim)
- Max length: no limit enforced

### age_range
- Type: enum string
- Required: yes
- Valid values: `under_18`, `18_24`, `25_34`, `35_44`, `45_54`, `55_plus`
- No other values accepted

### main_goal
- Type: enum string
- Required: yes
- Valid values: `emotional_control`, `build_confidence`, `manage_anger`, `reduce_stress`, `social_anxiety`, `thought_regulation`
- No other values accepted

### confidence_level
- Type: integer
- Required: yes
- Valid range: 1–5 (inclusive)
- Must be parseable integer, not string

### emotional_control_level
- Type: integer
- Required: yes
- Valid range: 1–5 (inclusive)
- Must be parseable integer, not string

### role
- Type: enum string
- Valid values: `free`, `premium`
- Default: `free` on creation
- NOT accepted from client on POST/PATCH (server-controlled on POST, controlled by role endpoint)

## Implementation Details

### Enums (Constants)

```typescript
const VALID_AGE_RANGES = ['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus'];
const VALID_MAIN_GOALS = [
  'emotional_control',
  'build_confidence',
  'manage_anger',
  'reduce_stress',
  'social_anxiety',
  'thought_regulation',
];
```

### AI Messages Remaining Calculation

```typescript
function computeAiMessagesRemaining(profile) {
  if (profile.role === 'premium') {
    return null;  // Unlimited
  }

  const now = new Date();
  const hoursSinceReset = (now.getTime() - profile.aiMessagesResetAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    return 3;  // Reset window, fresh counter
  }

  return Math.max(0, 3 - profile.aiMessagesUsedToday);
}
```

### Atomicity

The `ai-message-consume` endpoint uses database `UPDATE...RETURNING` to ensure atomic operations under concurrent requests:
1. Load profile
2. Check reset threshold
3. If reset needed: UPDATE with reset, RETURNING
4. Re-read counter
5. Check limit
6. If under limit: UPDATE with increment, RETURNING

This prevents race conditions where two concurrent requests both see "under limit" and increment past 3.

## No Breaking Changes

- ✓ All existing payment endpoints continue to work
- ✓ All existing authentication flows unchanged
- ✓ Email system untouched
- ✓ Better Auth tables untouched
- ✓ trustedOrigins, baseURL, OAuth unchanged
- ✓ No modifications to payment tables

## Testing Workflow

### Manual Testing

1. **Create a profile** (POST /api/profile)
   - Required fields: full_name, age_range, main_goal, confidence_level, emotional_control_level
   - Verify response includes role='free', ai_messages_remaining=3

2. **Update profile** (PATCH /api/profile)
   - Update subset of fields
   - Verify updated_at changes
   - Verify only updated fields change

3. **Consume AI messages** (POST /api/profile/ai-message-consume)
   - Call 3 times: verify remaining goes 3→2→1→0
   - Call 4th time: verify 429 response with resets_at

4. **Verify 24-hour reset**
   - Mock time forward 24+ hours
   - Call consume endpoint
   - Verify remaining resets to 3

5. **Premium tier**
   - Update role to 'premium' (POST /api/profile/role)
   - Consume message repeatedly
   - Verify always returns remaining=null, allowed=true

## Production Checklist

- [ ] Database migration applied (creates user_profiles table)
- [ ] All four endpoints deployed
- [ ] Better Auth integration verified
- [ ] Email system fully functional
- [ ] Payment system fully functional
- [ ] Test with real users (create profile, consume messages, verify limits)
- [ ] Monitor error logs for validation failures
- [ ] Set up alerts for 429 responses (indicates high usage)

## Files

- **Database Schema**: `src/db/schema.ts` - `userProfiles` table definition
- **Routes**: `src/routes/profiles.ts` - All four endpoints
- **Registration**: `src/index.ts` - `registerProfileRoutes(app)` called after app creation
