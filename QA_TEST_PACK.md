# Control & Confidence — QA Test Pack v1.0

## Build Information
- Android APK: BLOCKED — see Android Build Blockers section
- iOS IPA: BLOCKED — see iOS Build Blockers section
- Backend: https://yt8rvpzc3a4km4e9x2umpgmuhs7cvhdm.app.specular.dev
- Entitlement ID: pro

## Supported OS Matrix
| Platform | Minimum | Recommended | Tested |
|----------|---------|-------------|--------|
| iOS | 16.0 | 17.0+ | Pending physical device |
| Android | 10 (API 29) | 13 (API 33)+ | Pending physical device |

## Sandbox Tester Requirements
- iOS: Add tester email to App Store Connect → TestFlight → Internal Testing
- Android: Add tester email to Play Console → Internal Testing track
- RevenueCat: Use sandbox Apple ID / Google test account for purchase flows
- Do NOT use real payment methods

## Install Instructions

### Android
1. Download APK from EAS artifact URL (or scan QR from EAS dashboard)
2. Enable "Install from unknown sources" in Android Settings → Security
3. Install APK directly
4. Minimum Android 10 required

### iOS
1. [If TestFlight]: Accept TestFlight invitation email → Install via TestFlight app
2. [If direct IPA]: Use Apple Configurator 2 or Xcode Devices window
3. Minimum iOS 16 required

## Step-by-Step Test Script

### T01 — Fresh Install & Auth
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Install app, cold launch | Splash screen → Auth screen | | |
| 2 | Tap "Create Account" | Signup form appears | | |
| 3 | Enter email + password, tap Create | Onboarding screen | | |
| 4 | Complete onboarding, tap "Start My Journey" | Today screen | | |
| 5 | Force-quit, relaunch | Today screen (stays logged in) | | |

### T02 — Google Sign-In
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Tap "Continue with Google" | Google OAuth sheet | | |
| 2 | Select Google account | Onboarding or Today (if returning) | | |
| 3 | Verify name/email shown in Profile | Correct user info | | |

### T03 — Day 1 Training
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Tap Day 1 on Today screen | Day 1 training screen | | |
| 2 | Read lesson, tap Continue | Drill step | | |
| 3 | Complete drill, tap Continue | Reflection step | | |
| 4 | Enter reflection, tap Complete | Completion screen with XP | | |
| 5 | Return to Today | Day 1 marked complete | | |

### T04 — Free Day 8 Paywall
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Complete Days 1-7 (or use test fixture) | Days 1-7 complete | | |
| 2 | Tap Day 8 | Premium Required screen | | |
| 3 | Tap "Upgrade to Premium" | Paywall screen | | |
| 4 | Tap X/back | Returns to Program | | |

### T05 — Progression Lock
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Try to access Day 3 without completing Day 2 | "Complete Day 2 first" message | | |
| 2 | Complete Day 2 | Day 3 now accessible | | |

### T06 — Purchase Flow (Sandbox)
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Open Paywall | Paywall screen loads, prices visible | | |
| 2 | Tap upgrade CTA | Purchase sheet appears | | |
| 3 | Cancel purchase | Returns to paywall, no error shown | | |
| 4 | Tap upgrade, complete sandbox purchase | "Verifying with server…" shown | | |
| 5 | Verification completes | "Welcome to Premium!" shown | | |
| 6 | Navigate to Day 8 | Day 8 accessible | | |

### T07 — Reminders
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Profile → Reminders | Reminders screen | | |
| 2 | Toggle Enable | Permission request (first time) | | |
| 3 | Allow notifications | Toggle ON, time/day selectors visible | | |
| 4 | Set time to 1 min from now | — | | |
| 5 | Wait 1 min | Notification appears on lock screen | | |
| 6 | Tap notification | App opens to Today screen | | |
| 7 | Toggle off | Notification cancelled | | |

### T08 — Account & Privacy
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Profile → Account & Privacy | Account settings screen | | |
| 2 | Edit display name | Name updates | | |
| 3 | Tap "Download My Data" | JSON file shared/downloaded | | |
| 4 | Toggle Analytics off | Confirmed off | | |
| 5 | Tap "Sign Out All Devices" | Signed out | | |

### T09 — Account Deletion (Fixture — do NOT use real account)
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Create a disposable test account | Account created | | |
| 2 | Profile → Account & Privacy → Delete Account | Confirmation modal | | |
| 3 | Type wrong text | Button stays disabled | | |
| 4 | Type "DELETE MY ACCOUNT" | Button enables | | |
| 5 | Confirm | Signed out, deletion scheduled | | |

### T10 — Offline Behavior
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Enable airplane mode | — | | |
| 2 | Open app | Cached content visible | | |
| 3 | Try to complete a day | Error shown gracefully | | |
| 4 | Restore network | App recovers | | |

### T11 — Accessibility
| Step | Action | Expected | Pass/Fail | Notes |
|------|--------|----------|-----------|-------|
| 1 | Enable VoiceOver/TalkBack | — | | |
| 2 | Navigate Today screen | All elements labeled | | |
| 3 | Navigate Paywall | CTA and prices announced | | |
| 4 | Enable large text (200%) | No clipped text | | |

## Severity Definitions
- **P0 (Blocker)**: App crash, data loss, purchase failure, auth failure, security issue
- **P1 (Critical)**: Core flow broken (onboarding, training, paywall), incorrect billing state
- **P2 (Major)**: Feature broken but workaround exists, UI defect on primary screens
- **P3 (Minor)**: Cosmetic, edge case, non-primary screen

## Evidence Fields
For each failed test, record:
- Device model and OS version
- Build number
- Steps to reproduce
- Expected vs actual behavior
- Screenshot or screen recording
- Severity (P0/P1/P2/P3)

## Physical Device Tests: PENDING
All tests above are documented for physical device execution.
Emulator/simulator results are noted separately in the release-readiness report.

## Android Build Blockers
`eas-cli` is not installed in the build environment (the `eas` package in package.json is a stub `^0.1.0`, not the real CLI). To trigger the build, the project owner must:
1. Install EAS CLI globally: `npm install -g eas-cli`
2. Log in: `eas login`
3. Run: `eas build --platform android --profile preview --non-interactive`

Additionally, `google-services.json` must be present at the project root before building (required by `android.googleServicesFile` in app.json). Obtain it from Firebase Console → Project Settings → Your Apps → Android.

## iOS Build Blockers
Same EAS CLI blocker as Android. Additionally:
1. `GoogleService-Info.plist` must be present at the project root (required by `ios.googleServicesFile` in app.json). Obtain from Firebase Console → Project Settings → Your Apps → iOS.
2. Apple Developer account with active membership required.
3. Distribution certificate and provisioning profile — EAS can auto-manage these if `EXPO_APPLE_ID` and `EXPO_APPLE_PASSWORD` (or App Store Connect API key) are configured.

## Known Limitations
- RevenueCat purchase flows require RC_WEBHOOK_SECRET to be configured for server-side verification
- Google sign-in requires google-services.json (Android) and GoogleService-Info.plist (iOS) from Firebase Console
- Days 8-90 content quality: 0% pass rate from Phase 2A audit — content revision pending
- Minor dependency updates deferred (regression risk): react-native-gesture-handler, react-native-safe-area-context, react-native-maps, react-native-webview, @react-native-community/datetimepicker
