# App Review Notes — Control & Confidence

## App Description for Reviewer
Control & Confidence is a 90-day emotional control and confidence training program. Users complete one structured daily session (5–10 minutes) consisting of a lesson, guided practice drill, reflection, and emotional rating. Days 1–7 are free; Days 8–90 require a Premium subscription.

## Reviewer Account Setup

### Option A: Use the 7-day free trial (recommended)
1. Install the app
2. Create a new account with any email address
3. Complete onboarding (5 questions, ~2 minutes)
4. On the Today screen, tap "Start Free Trial" or navigate to Profile → Upgrade
5. The 7-day trial grants full Premium access without payment

### Option B: Use a pre-configured reviewer account
⚠️ **OWNER ACTION REQUIRED**: Create a dedicated reviewer account before submission.
- Create account at the app's auth screen
- Activate the 7-day trial via `POST /api/profile/trial/start`
- Provide credentials in the App Review Notes field in App Store Connect (NOT in this file)
- Do not use a personal account

## Navigation Guide for Reviewer

### Core Flow
1. **Auth screen** → Create Account or Sign In
2. **Onboarding** → 5 questions about goals and current levels → "Start My Journey"
3. **Today screen** → Shows current day card, streak, quick stats
4. **Day training** → Tap day card → Lesson → Drill → Reflection → Complete
5. **Program tab** → 90-day roadmap with week groupings
6. **Track tab** → Progress overview, emotional check-ins
7. **Journal tab** → Create and view journal entries
8. **Profile tab** → Settings, Reminders, Account & Privacy, Upgrade

### Premium Features (Days 8–90)
- Complete Days 1–7 first (sequential progression required)
- OR activate the 7-day free trial from Profile → Upgrade
- Day 8 will then be accessible

### Account Deletion (for review)
1. Profile → Account & Privacy → Delete Account
2. Type "DELETE MY ACCOUNT" in the confirmation field
3. Tap Delete — account data is deleted, 30-day grace period begins
4. **Use a disposable test account for this test — do not delete the reviewer account**

### Reminders
1. Profile → Reminders
2. Toggle Enable Daily Reminders
3. Grant notification permission when prompted
4. Set a time and select active days

### Data Export
1. Profile → Account & Privacy → Download My Data
2. A JSON file is shared/downloaded containing all user data

## Known Limitations for Reviewer
- Days 73–90 contain placeholder content ("Day N Practice") — **this is a known P0 issue being addressed before launch**
- RevenueCat purchase flows require production RC configuration — sandbox purchases work in TestFlight
- Google Sign-In requires Firebase configuration (google-services.json / GoogleService-Info.plist)

## Subscription Review
- The app uses RevenueCat for subscription management
- Server-side entitlement verification is implemented
- Purchases are verified via webhook before granting access
- The 7-day free trial does not require payment information

## Deep Links
- App scheme: `controlconfidence://`
- Reminders deep-link to: `controlconfidence://` (Today screen)
- No other deep links are used in notifications
