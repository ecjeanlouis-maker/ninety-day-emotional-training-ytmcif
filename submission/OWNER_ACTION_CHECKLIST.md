# Owner Action Checklist — Control & Confidence
## Required Before Any Store Submission

### IMMEDIATE (blocks everything)

- [ ] **Supply app icon**: 1024×1024 PNG, no alpha channel, no rounded corners (OS applies mask). Replace `assets/images/natively-dark.png` with real icon. Also update `assets/images/adaptive-icon.png` for Android.
- [ ] **Supply splash screen**: 1284×2778 PNG. Add as `assets/images/splash.png` and update app.json `splash.image`.
- [ ] **Publish Privacy Policy**: Host a privacy policy at a stable URL. Add URL to app.json `extra.privacyPolicyUrl` and to both store listings.
- [ ] **Provide legal entity name**: For App Store copyright field (e.g., "© 2026 Nextech Ltd").
- [ ] **Provide developer contact**: Email and website for both store listings.

### APPLE APP STORE

- [ ] **Enroll in Apple Developer Program** ($99/year): https://developer.apple.com/programs/
- [ ] **Implement Sign in with Apple**: Required because Google Sign-In is offered. Use `expo-apple-authentication` or `@better-auth/apple`.
- [ ] **Get GoogleService-Info.plist**: Firebase Console → iOS app → Download config file → place at project root.
- [ ] **Create subscription products** in App Store Connect → My Apps → [app] → In-App Purchases:
  - Monthly: `com.nextech.controlconfidence.premium.monthly`
  - Yearly: `com.nextech.controlconfidence.premium.yearly`
  - Lifetime: `com.nextech.controlconfidence.premium.lifetime`
- [ ] **Set prices** for each product in all relevant territories.
- [ ] **Configure 7-day free trial** for monthly and yearly products.
- [ ] **Capture IAP review screenshot** from the paywall screen showing pricing.
- [ ] **Create reviewer account** and provide credentials in App Store Connect Review Notes (not in source code).
- [ ] **Run iOS EAS build**: `eas build --platform ios --profile preview --non-interactive`
- [ ] **Capture screenshots** from signed build (6.9", 6.7", 6.5" iPhone; iPad Pro 13" if tablet support kept).

### GOOGLE PLAY

- [ ] **Enroll in Google Play Developer Program** ($25 one-time): https://play.google.com/console
- [ ] **Get google-services.json**: Firebase Console → Android app → Download config file → place at project root.
- [ ] **Add targetSdkVersion: 36** to android section of app.json (required from Aug 31, 2026).
- [ ] **Create subscription products** in Play Console → Monetization → Subscriptions.
- [ ] **Publish account deletion web URL**: Required by Google Play. Host a page at e.g. `https://[yourdomain]/delete-account` and add to Play Console Data Safety form.
- [ ] **Create feature graphic**: 1024×500 PNG/JPG for Play Store listing.
- [ ] **Run Android EAS build**: `eas build --platform android --profile preview --non-interactive`
- [ ] **Capture screenshots** from signed APK on Android device.

### REVENUECAT

- [ ] **Set RC_WEBHOOK_SECRET** in Specular backend env dashboard.
- [ ] **Configure webhook** in RevenueCat dashboard: URL = `https://yt8rvpzc3a4km4e9x2umpgmuhs7cvhdm.app.specular.dev/api/webhooks/revenuecat`, Authorization = same secret.
- [ ] **Set EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY** in EAS Secrets (iOS public SDK key from RC dashboard).
- [ ] **Set EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY** in EAS Secrets (Android public SDK key from RC dashboard).
- [ ] **Link products** to entitlement `pro` in RevenueCat dashboard.
- [ ] **Test sandbox purchase** end-to-end: purchase → webhook fires → GET /api/entitlement returns is_premium: true.

### CONTENT

- [ ] **Write Days 73–90 content**: 18 days of real training content required. Current placeholder ("Day N Practice") will cause rejection or poor reviews.
- [ ] **Review Days 1–72 content**: Phase 2A audit found 72/72 days below quality threshold. Address P0 safety/evidence issues before submission (see Phase 2A report).

### LEGAL

- [ ] **Publish Terms of Service / EULA** (recommended for subscription apps).
- [ ] **Confirm privacy policy** accurately reflects all data collection (see PRIVACY_DATA_INVENTORY.md).
- [ ] **Confirm subscription auto-renewal disclosure** in paywall meets current App Store / Play Store requirements.
- [ ] **Confirm account deletion** meets Google Play policy (in-app + web URL).

### FINAL STEPS

- [ ] Run `eas build --platform android --profile production` for AAB (Play Store).
- [ ] Run `eas build --platform ios --profile production` for IPA (App Store).
- [ ] Complete App Store Connect submission form.
- [ ] Complete Google Play Console submission form including Data Safety.
- [ ] Submit for review.
