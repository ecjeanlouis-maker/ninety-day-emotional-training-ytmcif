# Email Configuration Guide

This document describes the transactional email system using Resend for the Control & Confidence application.

## Overview

The email system provides:
- **Verification emails** sent when users sign up (24-hour link expiry)
- **Password reset emails** sent on password reset request (1-hour link expiry)
- **Welcome emails** sent automatically after successful sign-up
- **Dry-run mode** for testing without sending real emails
- **Lazy Resend client** initialization for efficient resource usage
- **Error handling** that logs errors but never throws, allowing application flow to continue

## Environment Variables

Configure these in your `.env` file:

### `RESEND_API_KEY` (Required for live sends)
- Your Resend API key for sending real emails
- Obtain from: https://resend.com
- Example: `RESEND_API_KEY=re_abc123xyz`
- **Important**: Your Resend domain (e.g., `noreply@example.com`) must be verified in Resend before sending to external emails

### `EMAIL_FROM` (Optional)
- Sender email address displayed to users
- **Must be from a verified domain** in Resend (or `*.example.com` for development)
- Default: `Control & Confidence <noreply@example.com>`
- Example: `EMAIL_FROM=Control & Confidence <noreply@yourdomain.com>`

### `EMAIL_REPLY_TO` (Optional)
- Reply-To address for user responses
- Default: `support@example.com`
- Example: `EMAIL_REPLY_TO=support@yourdomain.com`

### `EMAIL_DRY_RUN` (Optional)
- Force dry-run mode (logs emails to stdout without sending)
- Set to `true` to enable
- Example: `EMAIL_DRY_RUN=true`
- Useful for: local development, testing, preview environments

## Dry-Run Behavior

The system automatically uses **dry-run mode** when:
1. `EMAIL_DRY_RUN=true` is explicitly set, OR
2. No `RESEND_API_KEY` is provided AND not in production (`NODE_ENV !== 'production'`)

In dry-run mode:
- Emails are logged to stdout in JSON format with `[EMAIL DRY-RUN]` prefix
- No network calls are made to Resend
- Application continues normally
- Result includes `mode: 'dry-run'`

## Email Templates

All email templates are branded with:
- Header with dark background (`#1e293b`)
- Indigo accent color (`#6366f1`)
- Responsive design for mobile/desktop
- Both HTML and plain text versions

### Verification Email
- **Subject**: "Verify your email address"
- **Trigger**: User signs up with email/password
- **CTA**: Button linking to 24-hour verification URL
- **Content**: Welcome message, verification instructions, expiry notice

### Password Reset Email
- **Subject**: "Reset your password"
- **Trigger**: User requests password reset
- **CTA**: Button linking to 1-hour reset URL
- **Content**: Reset instructions, security note, expiry notice

### Welcome Email
- **Subject**: "Welcome to Control & Confidence"
- **Trigger**: After successful user registration (automatic)
- **Content**: Feature highlights, encouragement to explore
- **Note**: No CTA, purely informational

## Architecture

### Email Utility (`src/lib/email.ts`)
- **Function**: `sendEmail(options)` - Main entry point
- **Lazy initialization**: Resend client created only when needed
- **Error handling**: Catches all exceptions, returns error in result
- **Result type**: `EmailResult = { ok: true; id: string; mode } | { ok: false; error: string }`

### Email Templates (`src/lib/email-templates.ts`)
- **Functions**: `verificationEmailTemplate()`, `resetPasswordEmailTemplate()`, `welcomeEmailTemplate()`
- **Returns**: `{ html: string; text: string }` for both formats
- **Usage**: Call template function, then pass result to `sendEmail()`

### Better Auth Integration (`src/index.ts`)
- `sendVerificationEmail` callback → sends verification email
- `sendResetPassword` callback → sends password reset email
- `databaseHooks.user.create.after` → sends welcome email on sign-up

## Local Development

1. **Copy `.env.example` to `.env`**:
   ```bash
   cp .env.example .env
   ```

2. **Ensure `EMAIL_DRY_RUN` is not set or set to `false`** for local development
   ```bash
   # Leave unset (default dry-run in dev without API key)
   # OR explicitly enable dry-run to preview email payloads
   EMAIL_DRY_RUN=true
   ```

3. **View email logs** in the application console:
   ```
   [EMAIL DRY-RUN] {
     "from": "Control & Confidence <noreply@example.com>",
     "to": "user@example.com",
     "subject": "Verify your email address",
     "html": "...",
     "text": "..."
   }
   ```

## Production

1. **Set `RESEND_API_KEY`** in production environment
   ```bash
   RESEND_API_KEY=re_your_production_key
   ```

2. **Verify email domain** in Resend dashboard:
   - Go to https://resend.com/domains
   - Add your domain (e.g., `noreply@yourdomain.com`)
   - Verify DNS records
   - Update `EMAIL_FROM` to use verified domain

3. **Emails automatically send** via Resend when API key is set
   - Dry-run mode is disabled
   - Sent emails are logged to console with `[EMAIL SENT]` prefix

## Troubleshooting

### "Resend client not configured - no RESEND_API_KEY provided"
- **Cause**: In production with no API key set
- **Solution**: Set `RESEND_API_KEY` environment variable

### "Neither apiKey nor config.authenticator provided"
- **Cause**: Resend client initialized with empty API key
- **Solution**: Not applicable - lazy initialization prevents this

### Emails not being sent (but no errors)
- **Check**: Is `EMAIL_DRY_RUN=true` or no API key set?
- **Solution**: Set proper API key or disable dry-run

### "domain not verified"
- **Cause**: Email from address uses unverified Resend domain
- **Solution**: Verify domain in Resend dashboard, update `EMAIL_FROM`

## Testing

Email sending is tested through:
1. **Integration tests** - Full flow with real/mock Resend
2. **Manual testing** - Using dry-run mode to preview emails
3. **Production validation** - Monitoring email delivery metrics in Resend

No unit tests for email utility (Resend SDK is external dependency).

## Future Enhancements

- Resend webhooks for delivery tracking
- Email template versioning and A/B testing
- Localization support for multiple languages
- Custom email scheduling and queuing
- Unsubscribe link support for transactional emails
