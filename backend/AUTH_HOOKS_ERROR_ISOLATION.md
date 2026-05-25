# Better Auth Database Hooks — Error Isolation Fix

## Overview

Fixed Better Auth database hooks (`databaseHooks.user.create.after` and `databaseHooks.session.create.after`) to prevent authentication errors (500s) when hook operations fail.

**Goal**: After this fix, sign-in always returns 200 for valid credentials and 401 for invalid credentials, never 500 due to a hook failure.

**Date**: 2026-05-25

---

## Changes Made

### 1. User Create After Hook — Error Isolation

**File**: `src/index.ts` (lines 57-84)

**Before**:
```typescript
after: async (user) => {
  const { html, text } = welcomeEmailTemplate({...});
  await sendEmail({...}); // ❌ If this fails, entire auth fails
}
```

**After**:
```typescript
after: async (user) => {
  try {
    const { html, text } = welcomeEmailTemplate({...});
    // Fire-and-forget with error isolation
    sendEmail({...}).catch((error) => {
      console.error('[AUTH_HOOK_ERROR] Welcome email send failed', error);
    });
  } catch (error) {
    console.error('[AUTH_HOOK_ERROR] Welcome email hook failed', error);
  }
}
```

**Isolation Strategy**:
- Outer try/catch wraps entire hook body
- Email sending is fire-and-forget (not awaited inline)
- `.catch()` handler on promise prevents unhandled rejection
- All errors logged but never rethrown
- Hook always completes successfully

**Error Scenarios Handled**:
- ✅ Missing RESEND_API_KEY
- ✅ Email template generation fails
- ✅ Email service returns error
- ✅ Network failure during email send
- ✅ Unknown exceptions in hook logic

---

### 2. Session Create After Hook — New Feature with Error Isolation

**File**: `src/index.ts` (lines 87-134)

**Purpose**: Automatically promote users to admin role when their email matches `ADMIN_EMAILS` environment variable.

**Implementation**:
```typescript
after: async (session) => {
  try {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(...) || [];
    
    if (!adminEmails.length) return; // No admin promotion configured
    
    const user = session.user;
    if (!user?.email || !adminEmails.includes(user.email)) return; // Not admin
    
    try {
      // Promote user to admin in user_profiles
      const profile = await app.db.select()...;
      if (profile.length > 0) {
        await app.db.update(...).set({ role: 'admin' })...;
        app.logger.info({...}, 'User promoted to admin');
      }
    } catch (dbError) {
      console.error('[AUTH_HOOK_ERROR] Failed to promote to admin', dbError);
    }
  } catch (error) {
    console.error('[AUTH_HOOK_ERROR] Session create hook failed', error);
  }
}
```

**Error Isolation Strategy**:
- Outer try/catch for hook-level failures
- Inner try/catch for database operations
- All errors logged but never rethrown
- Early returns for missing config (not errors)
- Hook always completes successfully

**Error Scenarios Handled**:
- ✅ ADMIN_EMAILS not set (silently skipped)
- ✅ ADMIN_EMAILS is empty (silently skipped)
- ✅ User email not in admin list (silently skipped)
- ✅ Database connection fails
- ✅ Profile lookup fails
- ✅ Profile update fails
- ✅ Unknown exceptions in hook logic

**Configuration**:
```bash
# Set comma-separated list of admin emails
ADMIN_EMAILS="admin@example.com,superuser@example.com"

# If not set or empty, feature is disabled (no errors)
```

---

### 3. Stripe Bootstrap Error Isolation

**File**: `src/index.ts` (lines 145-156)

**Before**:
```typescript
try {
  await bootstrapStripe();
  app.logger.info('Stripe bootstrapped successfully');
} catch (error) {
  app.logger.warn({...}, 'Stripe bootstrap failed');
  // ❌ Doesn't prevent downstream failures
}
```

**After**:
```typescript
try {
  await bootstrapStripe();
  app.logger.info('Stripe bootstrapped successfully');
} catch (error) {
  console.error('[STRIPE_BOOTSTRAP_ERROR]', error.message);
  app.logger.warn({...}, 'Stripe bootstrap failed or not configured - continuing without Stripe');
  // ✅ Explicitly continues and logs clear message
}
```

**Error Scenarios Handled**:
- ✅ STRIPE_SECRET_KEY not set
- ✅ Stripe API unreachable
- ✅ Stripe API returns errors
- ✅ Invalid Stripe credentials
- ✅ Network failures during bootstrap
- ✅ Unknown exceptions during bootstrap

---

## Testing Checklist

### Sign-up (User Create Hook)
- [ ] Valid signup with working email → 200, welcome email sent
- [ ] Valid signup with invalid email API key → 200, error logged
- [ ] Valid signup with network error → 200, error logged
- [ ] Sign-up always completes without 500

### Sign-in (Session Create Hook)
- [ ] Valid credentials, email not in admin list → 200, normal user
- [ ] Valid credentials, email in ADMIN_EMAILS → 200, user promoted to admin
- [ ] Valid credentials, ADMIN_EMAILS not set → 200, normal user
- [ ] Valid credentials, DB error during promotion → 200, error logged, user created anyway
- [ ] Invalid credentials → 401 (unchanged)
- [ ] Sign-in always returns 200/401, never 500

### Stripe Bootstrap
- [ ] STRIPE_SECRET_KEY not set → Server starts, logs warning
- [ ] STRIPE_SECRET_KEY invalid → Server starts, logs warning
- [ ] STRIPE_SECRET_KEY valid → Server starts, Stripe bootstrapped

---

## Error Logging

All hook errors are logged with `[AUTH_HOOK_ERROR]` prefix for easy filtering:

```
[AUTH_HOOK_ERROR] Welcome email send failed for user <userId> <error message>
[AUTH_HOOK_ERROR] Welcome email hook failed for user <userId> <error message>
[AUTH_HOOK_ERROR] Failed to promote user to admin <userId> <error message>
[AUTH_HOOK_ERROR] Session create hook failed <error message>
[STRIPE_BOOTSTRAP_ERROR] <error message>
```

Filter logs: `grep -E 'AUTH_HOOK_ERROR|STRIPE_BOOTSTRAP_ERROR' logs.txt`

---

## Behavior Changes

### Before Fix
- Email send failure in user.create hook → 500 error during sign-up
- Database promotion failure in session.create hook → 500 error during sign-in
- Stripe bootstrap failure → Server may not start or start in bad state
- Session creation didn't support admin promotion

### After Fix
- Email send failure → Sign-up completes (200), error logged
- Database promotion failure → Sign-in completes (200), error logged
- Stripe bootstrap failure → Server starts normally, error logged
- Session creation auto-promotes emails in ADMIN_EMAILS → admin role assigned

---

## No Breaking Changes

✅ Authentication flow unchanged  
✅ Sign-up/sign-in responses unchanged  
✅ Email sending still works when API key configured  
✅ Stripe functionality unchanged (optional)  
✅ Admin promotion is new feature (opt-in via ADMIN_EMAILS env var)  
✅ All existing code paths preserved  

---

## Implementation Details

### Email Send Pattern (Fire-and-Forget)
```typescript
// Good: Promise chain with .catch() prevents rejection propagation
sendEmail({...}).catch((error) => {
  console.error('[AUTH_HOOK_ERROR]', error);
});

// Bad: Awaiting without try/catch lets error propagate
await sendEmail({...});

// Bad: Awaiting in try/catch throws on error
try {
  await sendEmail({...});
} catch (error) {
  throw error; // ❌ Rethrows to hook, causes 500
}
```

### Multiple Isolation Layers
```typescript
// Layer 1: Outer catch for hook-level failures
try {
  // Layer 2: Fire-and-forget pattern for async operations
  operation().catch(logError);
  
  try {
    // Layer 3: Inner catch for specific operations
    await database.query();
  } catch (innerError) {
    logError(innerError);
  }
} catch (outerError) {
  logError(outerError);
}
```

### Early Returns vs Errors
```typescript
// Good: Early return for missing config (not an error)
if (!config) return;

// Good: Early return for non-matching case (not an error)
if (!matches) return;

// Good: Try/catch for actual failure cases
try {
  await operation();
} catch (error) {
  logError(error);
}
```

---

## Future Considerations

### When Adding New Hooks
1. Always wrap entire hook body in try/catch
2. Use fire-and-forget pattern for async operations (`.catch(logError)`)
3. Add early returns for optional features (no config = skip, don't error)
4. Log with `[AUTH_HOOK_ERROR]` prefix for consistency
5. Never rethrow errors from hooks

### When Modifying Existing Hooks
1. Preserve error isolation
2. Test with missing environment variables
3. Test with network failures
4. Test with database errors
5. Verify auth always completes (never 500)

---

## Environment Variables

```bash
# Email sending (already existing)
RESEND_API_KEY=     # Optional: if not set, dry-run mode
EMAIL_FROM=         # Optional: sender email address
EMAIL_DRY_RUN=      # Optional: force dry-run mode

# Stripe (already existing)
STRIPE_SECRET_KEY=  # Optional: if not set, Stripe disabled

# New: Admin promotion
ADMIN_EMAILS=       # Optional: comma-separated list of admin emails
                    # Example: "admin@example.com,superuser@example.com"
                    # If not set or empty, feature disabled
```

---

## Summary

This fix isolates all Better Auth hook errors so they never cause authentication failures. Sign-in and sign-up remain reliable (200/401 responses) even when secondary operations (email, admin promotion, Stripe) fail. All failures are logged with `[AUTH_HOOK_ERROR]` or `[STRIPE_BOOTSTRAP_ERROR]` prefixes for debugging.
