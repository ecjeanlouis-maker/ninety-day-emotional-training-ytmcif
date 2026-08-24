# Submission Preflight Checklist — Control & Confidence

## P0 BLOCKERS (must fix before any submission)

| # | Issue | Platform | Fix Required |
|---|-------|----------|-------------|
| P0-1 | Days 73–90 are placeholder content ("Day N Practice") | Both | Write real content for 18 days |
| P0-2 | App icon is placeholder (natively-dark.png) | Both | Owner must supply 1024×1024 PNG |
| P0-3 | Splash screen is placeholder | iOS | Owner must supply 1284×2778 PNG |
| P0-4 | google-services.json missing | Android | Owner must supply from Firebase Console |
| P0-5 | GoogleService-Info.plist missing | iOS | Owner must supply from Firebase Console |
| P0-6 | Sign in with Apple not implemented | iOS | Required when Google Sign-In is offered |
| P0-7 | targetSdkVersion not set to 36 | Android | Add to app.json before Aug 31, 2026 |
| P0-8 | Privacy Policy URL missing | Both | Owner must publish and provide URL |
| P0-9 | Account deletion web URL missing | Android | Required by Google Play policy |
| P0-10 | RC_WEBHOOK_SECRET not configured | Both | Set in backend env before production |
| P0-11 | RevenueCat products not created | Both | Owner must create in App Store Connect / Play Console |
| P0-12 | EAS builds not triggered | Both | Owner must run eas build commands |
| P0-13 | Screenshots not captured | Both | Requires signed build |
| P0-14 | IAP review screenshot missing | iOS | Required for first subscription submission |

## P1 RISKS (likely rejection if not addressed)

| # | Issue | Platform | Fix Required |
|---|-------|----------|-------------|
| P1-1 | No crash reporting SDK | Both | Add Sentry or similar before launch |
| P1-2 | Reviewer account not created | Both | Owner must create before submission |
| P1-3 | Legal entity name missing from copyright | iOS | Owner must provide |
| P1-4 | Developer contact info missing | Both | Owner must provide |
| P1-5 | Terms/EULA URL missing | Both | Recommended for subscription apps |
| P1-6 | Adaptive icon uses placeholder image | Android | Owner must supply proper adaptive icon |
| P1-7 | Feature graphic missing | Android | Required for Play Store listing |
| P1-8 | No VoiceOver/TalkBack audit completed | Both | Accessibility review needed |

## P2 ITEMS (should fix, lower rejection risk)

| # | Issue | Platform | Notes |
|---|-------|----------|-------|
| P2-1 | Minor dependency version mismatches | Both | Deferred — regression risk |
| P2-2 | Pre-existing TypeScript errors | Both | Not blocking builds |
| P2-3 | No crash reporting | Both | Add before launch |
| P2-4 | AI Coach feature listed in paywall but not audited | Both | Verify AI Coach is functional |
| P2-5 | Manage Subscription deep link not implemented | iOS | Nice to have |

## Technical Validation

| Check | Status |
|-------|--------|
| android.package valid | ✅ com.nextech.controlconfidence |
| ios.bundleIdentifier valid | ✅ com.nextech.controlconfidence |
| scheme valid | ✅ controlconfidence |
| expo-notifications plugin configured | ✅ |
| iOS privacy strings present | ✅ |
| Android permissions declared | ✅ |
| ITSAppUsesNonExemptEncryption declared | ✅ false |
| runtimeVersion policy set | ✅ appVersion |
| Build-time env validation | ✅ validateBuildConfig() |
| Server secrets not bundled | ✅ assertNoServerSecrets() |
| In-app account deletion | ✅ |
| Restore purchases | ✅ |
| Auto-renewal disclosure in paywall | ✅ |
| targetSdkVersion = 36 | ❌ Not set |
| App icon (non-placeholder) | ❌ Missing |
| Splash screen (non-placeholder) | ❌ Missing |
| google-services.json | ❌ Missing |
| GoogleService-Info.plist | ❌ Missing |
| Sign in with Apple | ❌ Not implemented |
| Privacy Policy URL | ❌ Not provided |
| EAS builds | ❌ Not triggered |
