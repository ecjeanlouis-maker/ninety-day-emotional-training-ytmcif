# Privacy Data Inventory — Control & Confidence

Last updated: 2026-08-24
Verified against: source code audit (Phases 1A–3)

## Data Collected

### 1. Account / Identity
| Data | Collected | Linked to User | Shared | Purpose | Retention | Deletion |
|------|-----------|----------------|--------|---------|-----------|----------|
| Email address | Yes | Yes | No | Authentication, account recovery | Until deletion | Deleted on account deletion |
| Display name | Yes (optional) | Yes | No | Personalization | Until deletion | Deleted |
| Profile photo | No | — | — | — | — | — |
| Google account ID | Yes (if Google sign-in used) | Yes | No (stored server-side only) | Authentication | Until deletion | Deleted |
| Password (hashed) | Yes (email accounts) | Yes | No | Authentication | Until deletion | Deleted |

### 2. App Activity / Usage
| Data | Collected | Linked to User | Shared | Purpose | Retention | Deletion |
|------|-----------|----------------|--------|---------|-----------|----------|
| Day completion events | Yes | Yes | No | Progress tracking, analytics | Indefinite (anonymized on deletion) | Anonymized |
| Exercise start/complete events | Yes | Yes | No | Analytics | Indefinite (anonymized) | Anonymized |
| Paywall view/purchase events | Yes | Yes | No | Analytics | Indefinite (anonymized) | Anonymized |
| Onboarding completion | Yes | Yes | No | Analytics | Indefinite (anonymized) | Anonymized |
| Reminder enabled/opened | Yes | Yes | No | Analytics | Indefinite (anonymized) | Anonymized |

### 3. User-Generated Content
| Data | Collected | Linked to User | Shared | Purpose | Retention | Deletion |
|------|-----------|----------------|--------|---------|-----------|----------|
| Journal entries (text) | Yes | Yes | No | User feature | Until deletion | Immediately deleted on account deletion |
| Emotional check-ins (emotion label, intensity) | Yes | Yes | No | User feature, progress | Until deletion | Immediately deleted |
| Reflection text (in-session) | No — NOT stored server-side | — | — | — | — | — |
| ECRS ratings (numeric 0–10) | Yes | Yes | No | Progress tracking | Until deletion | Immediately deleted |
| Onboarding answers (goals, age range) | Yes | Yes | No | Personalization | Until deletion | Immediately deleted |

### 4. Health & Fitness
| Data | Collected | Linked to User | Shared | Purpose | Retention | Deletion |
|------|-----------|----------------|--------|---------|-----------|----------|
| Emotional state ratings (ECRS) | Yes | Yes | No | Progress tracking | Until deletion | Immediately deleted |
| Mental wellness self-assessments | Yes (onboarding confidence/control levels) | Yes | No | Personalization | Until deletion | Immediately deleted |
| Health conditions / diagnoses | No | — | — | — | — | — |

### 5. Financial / Purchase
| Data | Collected | Linked to User | Shared | Purpose | Retention | Deletion |
|------|-----------|----------------|--------|---------|-----------|----------|
| Purchase events (via RevenueCat) | Yes | Yes | RevenueCat (processor) | Subscription management | Per RevenueCat policy | Not deleted (billing audit) |
| Payment card details | No — handled entirely by App Store / Google Play | — | — | — | — | — |
| Subscription status | Yes | Yes | No | Entitlement enforcement | Until deletion (profile marked deleted) | Profile anonymized |

### 6. Device / Technical
| Data | Collected | Linked to User | Shared | Purpose | Retention | Deletion |
|------|-----------|----------------|--------|---------|-----------|----------|
| Platform (iOS/Android/web) | Yes | Yes | No | Analytics | Anonymized on deletion | Anonymized |
| App version | Yes | Yes | No | Analytics | Anonymized on deletion | Anonymized |
| Session ID (random, per-session) | Yes | Yes | No | Analytics batching | Anonymized on deletion | Anonymized |
| Device model / OS version | No — not collected | — | — | — | — | — |
| Precise location | No | — | — | — | — | — |
| Advertising ID (IDFA/GAID) | No | — | — | — | — | — |
| Contacts | No | — | — | — | — | — |
| Crash reports | No third-party crash SDK configured | — | — | — | — | — |

### 7. Notifications
| Data | Collected | Linked to User | Shared | Purpose | Retention | Deletion |
|------|-----------|----------------|--------|---------|-----------|----------|
| Notification preferences (time, days, timezone) | Yes | Yes | No | Reminder scheduling | Until deletion | Immediately deleted |
| Notification content | Not stored — local only | — | — | — | — | — |

## Third-Party SDKs and Data Sharing

| SDK | Purpose | Data shared | Privacy policy |
|-----|---------|-------------|----------------|
| RevenueCat (react-native-purchases) | Subscription management | App User ID (Better Auth user.id), purchase events | https://www.revenuecat.com/privacy |
| Google Sign-In (via Better Auth) | Authentication | Google account ID, email, name | https://policies.google.com/privacy |
| Expo / React Native | App framework | None (no telemetry in production builds) | https://expo.dev/privacy |

## Data NOT Collected
- Journal text is NOT sent to analytics
- Reflection text is NOT stored server-side
- Emotion/trigger free text is NOT sent to analytics
- No advertising IDs
- No precise location
- No contacts
- No health app integrations (HealthKit/Google Fit not connected)
- No third-party analytics vendor (Mixpanel, Amplitude, Firebase Analytics, etc.)
- No crash reporting SDK (Sentry, Bugsnag, etc.) — **owner should add one before launch**

## Encryption
- All data transmitted over HTTPS (TLS 1.2+)
- `ITSAppUsesNonExemptEncryption: false` declared in app.json (no custom encryption)
- Passwords hashed server-side (Better Auth)
- No local encryption of on-device storage beyond OS-level

## Analytics Consent
- Users can disable usage analytics via Account & Privacy → Analytics toggle
- Essential security/account events are always logged regardless of consent
- Analytics events are anonymized (userId replaced) on account deletion
