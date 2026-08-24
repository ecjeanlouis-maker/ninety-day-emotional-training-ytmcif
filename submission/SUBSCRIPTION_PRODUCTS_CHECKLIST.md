# Subscription Products Checklist — Control & Confidence

## Entitlement
- Entitlement ID: `pro`
- Verified in code: `contexts/SubscriptionContext.tsx` line 8, `extra.entitlementId` in app.json

## Subscription Group
- Suggested group name: "Control & Confidence Premium"
- All subscription products must belong to this group

## Product IDs (OWNER INPUT REQUIRED — create in App Store Connect / Play Console)

| Product | Suggested ID | Billing Period | Price | Trial | Status |
|---------|-------------|----------------|-------|-------|--------|
| Monthly | `com.nextech.controlconfidence.premium.monthly` | 1 month | [OWNER INPUT] | 7 days | ⚠️ Owner must create |
| Yearly | `com.nextech.controlconfidence.premium.yearly` | 1 year | [OWNER INPUT] | 7 days | ⚠️ Owner must create |
| Lifetime | `com.nextech.controlconfidence.premium.lifetime` | One-time | [OWNER INPUT] | N/A | ⚠️ Owner must create |

**Note**: The app UI shows plan options fetched from RevenueCat offerings. Prices displayed to users come from the store, not hardcoded. Verify the paywall UI correctly displays store prices before submission.

## Apple App Store — IAP Setup Checklist
- [ ] Create subscription group "Control & Confidence Premium" in App Store Connect
- [ ] Create monthly, yearly, and lifetime products with correct IDs
- [ ] Set prices in App Store Connect (prices shown in app come from store)
- [ ] Configure 7-day free trial for monthly and yearly
- [ ] Add subscription description and display name for each product
- [ ] **Upload IAP review screenshot** (required for first submission with subscription)
  - Screenshot must show the paywall/upgrade screen with pricing visible
  - Must be from the actual app, not a mockup
  - Capture from the paywall screen: `app/paywall.tsx`
- [ ] Link products to RevenueCat entitlement `pro`
- [ ] Submit subscription with the app version (first submission requirement)

## Google Play — Subscription Setup Checklist
- [ ] Create subscription product in Play Console → Monetization → Subscriptions
- [ ] Create base plans (monthly, yearly) and offers (7-day free trial)
- [ ] Set prices per region
- [ ] Link to RevenueCat entitlement `pro`
- [ ] Verify `react-native-purchases` Google billing integration

## Auto-Renewal Disclosure (required in paywall UI)
✅ Paywall includes: subscription auto-renews, cancel anytime, manage in device Settings
⚠️ Verify exact legal text matches current App Store / Play Store requirements

## Restore Purchases
✅ Implemented — "Restore Purchases" button in paywall
✅ Backend verification polling after restore (3×2s attempts)
✅ "No active subscription found" shown if nothing to restore

## Manage Subscription
✅ Account & Privacy shows "To cancel, go to Settings → Subscriptions on your device"
⚠️ Consider adding direct deep link: `itms-apps://apps.apple.com/account/subscriptions` (iOS)

## Server-Side Verification
✅ Backend webhook handler: POST /api/webhooks/revenuecat
⚠️ RC_WEBHOOK_SECRET must be set in backend env before production
⚠️ RevenueCat webhook URL must be configured in RC dashboard

## Premium Access Behavior
- Days 1–7: Always free ✅
- Days 8–90: Require verified server-side premium entitlement ✅
- Sequential progression: Premium does NOT bypass day order ✅
- Trial: 7-day free trial grants full premium access ✅
- Grace period: Cancelled subscriptions retain access until expiry ✅
- Expiration: Access revoked immediately on expiry ✅
- Refund/revocation: Access revoked immediately ✅
