# Apple App Privacy Answers — Control & Confidence

## App Privacy Nutrition Label

### Data Used to Track You
**No** — the app does not use data to track users across apps or websites owned by other companies, and does not share data with data brokers.

### Data Linked to You
| Category | Type | Linked | Purpose |
|----------|------|--------|---------|
| Contact Info | Email Address | Yes | Account, App Functionality |
| Contact Info | Name | Yes | App Functionality |
| Identifiers | User ID | Yes | App Functionality, Analytics |
| Usage Data | Product Interaction | Yes | Analytics, App Functionality |
| Health & Fitness | Other Health Data (ECRS ratings, emotional check-ins) | Yes | App Functionality |
| User Content | Other User Content (journal entries) | Yes | App Functionality |
| Purchases | Purchase History | Yes | App Functionality |

### Data Not Linked to You
None — all collected data is linked to the authenticated user account.

### Data Not Collected
- Location
- Contacts
- Browsing history
- Search history
- Sensitive info (financial, health conditions, precise location)
- Advertising data
- Crash data (no crash SDK — **add before submission**)

## Age Rating Questionnaire
| Question | Answer |
|----------|--------|
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Sexual content or nudity | None |
| Profanity or crude humor | None |
| Mature/suggestive themes | None |
| Simulated gambling | None |
| Horror/fear themes | None |
| Medical/treatment information | Mild — app discusses emotional regulation techniques |
| Alcohol, tobacco, or drug use | None |

**Recommended rating: 4+**

## Sign in with Apple
⚠️ **REQUIRED ACTION**: The app offers Google Sign-In (a third-party social login). Apple requires Sign in with Apple when any third-party social login is offered to iOS users. Email/password is also offered.

Apple's guideline 4.8: "If your app uses a third-party or social login service (such as Facebook Login, Google Sign-In, Sign in with Twitter, Sign in with LinkedIn, Login with Amazon, or WeChat Login) to set up or authenticate the user's primary account with your app, you must also offer Sign in with Apple as an equivalent option."

**Owner must implement Sign in with Apple before App Store submission.**
Implementation: Add `@better-auth/apple` or use Expo's `expo-apple-authentication` package.

## Encryption Export Compliance
- `ITSAppUsesNonExemptEncryption: false` declared in app.json ✅
- The app uses standard HTTPS/TLS only
- No custom encryption algorithms
- **Compliance**: Qualifies for exemption under EAR 740.17(b)(1) — standard encryption only

## Medical Device Status
This app is **not a medical device**. It is a personal skill-building and wellness application. It does not:
- Diagnose, treat, cure, or prevent any disease or condition
- Provide clinical mental health treatment
- Claim to be a substitute for professional care
- Collect or process clinical health data

The app description explicitly states: "This app is for personal skill-building only. It is not a medical device, therapy service, crisis resource, or substitute for professional mental health care."

## Account Deletion
✅ In-app account deletion implemented (Account & Privacy → Delete Account)
- Requires typed confirmation "DELETE MY ACCOUNT"
- 30-day grace period
- Immediately deletes journal, check-ins, progress, onboarding, reminders
- Shows subscription cancellation instructions (external)

## Advertising Identifier (IDFA)
**Not used.** The app does not use IDFA or any advertising tracking.
ATT prompt: **Not required.**

## Accessibility Nutrition Label
⚠️ Not yet evaluated. Recommend completing VoiceOver audit before submission.
