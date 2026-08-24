# Google Play Data Safety — Control & Confidence

## Does your app collect or share any of the required user data types?
**Yes** — the app collects account, activity, and user-generated content data.

## Is all of the user data collected by your app encrypted in transit?
**Yes** — all data is transmitted over HTTPS/TLS.

## Do you provide a way for users to request that their data is deleted?
**Yes** — in-app deletion (Account & Privacy → Delete Account) and web URL [OWNER INPUT REQUIRED].

## Data Types

### Personal Info
| Type | Collected | Shared | Required/Optional | Purpose | Processed ephemerally |
|------|-----------|--------|-------------------|---------|----------------------|
| Email address | Yes | No | Required | Account management | No |
| Name | Yes | No | Optional | Personalization | No |
| User IDs | Yes | RevenueCat (processor) | Required | App functionality | No |

### Financial Info
| Type | Collected | Shared | Required/Optional | Purpose |
|------|-----------|--------|-------------------|---------|
| Purchase history | Yes (via RevenueCat) | RevenueCat | Required for Premium | Subscription management |

### Health and Fitness
| Type | Collected | Shared | Required/Optional | Purpose |
|------|-----------|--------|-------------------|---------|
| Other health info (ECRS ratings, emotional check-ins) | Yes | No | Optional (user-generated) | App functionality, progress tracking |

### App Activity
| Type | Collected | Shared | Required/Optional | Purpose |
|------|-----------|--------|-------------------|---------|
| App interactions | Yes | No | Required | Analytics, app improvement |
| In-app search history | No | — | — | — |
| Installed apps | No | — | — | — |
| Other user-generated content (journal) | Yes | No | Optional | App functionality |

### App Info and Performance
| Type | Collected | Shared | Required/Optional | Purpose |
|------|-----------|--------|-------------------|---------|
| Crash logs | No (no crash SDK) | — | — | — |
| Diagnostics | No | — | — | — |

## Health Apps Declaration
The app collects emotional state ratings and self-assessments. This is **not** a medical app and does not connect to HealthKit or Google Fit. The app should **not** be declared as a health app under Google Play's health apps policy. It is a personal wellness/self-improvement app.

**Owner must verify**: Does Google Play's current health apps policy require declaration for apps collecting emotional wellness data? Review https://support.google.com/googleplay/android-developer/answer/10787469 before submission.

## Target Audience
- Primary: Adults 18+
- The app does not target children
- Content rating: Everyone (IARC)
- No child-directed advertising

## Permissions Declarations
| Permission | Why needed | Shown to user |
|------------|------------|---------------|
| POST_NOTIFICATIONS | Daily practice reminders (opt-in) | Yes — permission dialog |
| RECEIVE_BOOT_COMPLETED | Reschedule reminders after device restart | No dialog (background) |
| VIBRATE | Notification vibration | No dialog |
| INTERNET | API calls to backend | No dialog (standard) |

## Account Deletion
- In-app: ✅ Account & Privacy → Delete Account
- Web URL: ⚠️ [OWNER INPUT REQUIRED — required by Google Play policy]

## Ads
**No ads.** The app does not display advertisements.

## Financial Features
The app offers in-app subscriptions (Premium). This is standard IAP, not a financial service, lending, or investment product.

## Target API Level
⚠️ Must be API 36 (Android 16) for submissions after August 31, 2026.
Current app.json does not specify targetSdkVersion. **Add `"targetSdkVersion": 36` to android section.**
