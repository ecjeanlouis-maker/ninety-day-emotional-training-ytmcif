# Store Asset Manifest — Control & Confidence

## Current Asset Status

| Asset | Required | Status | Notes |
|-------|----------|--------|-------|
| App icon (1024×1024 PNG, no alpha) | Both stores | ❌ MISSING | Current: natively-dark.png (placeholder) |
| Splash screen (1284×2778 PNG) | iOS | ❌ MISSING | Current: natively-dark.png (placeholder) |
| Adaptive icon foreground (1024×1024 PNG) | Android | ❌ MISSING | Current: natively-dark.png (placeholder) |
| Adaptive icon background color | Android | ✅ | #000000 |
| Feature graphic (1024×500 PNG/JPG) | Google Play | ❌ MISSING | Required for Play Store listing |
| Screenshots — iPhone 6.9" (1320×2868) | App Store | ❌ PENDING | Requires signed build |
| Screenshots — iPhone 6.7" (1290×2796) | App Store | ❌ PENDING | Requires signed build |
| Screenshots — iPhone 6.5" (1242×2688) | App Store | ❌ PENDING | Requires signed build |
| Screenshots — iPad Pro 13" (2064×2752) | App Store (if tablet) | ❌ PENDING | supportsTablet: true |
| Screenshots — Android phone (min 320dp) | Google Play | ❌ PENDING | Requires signed build |

## Screenshot Shot List (capture from actual app — no debug data, no personal info)

### Shot 1 — Today Screen
- Screen: `app/(tabs)/(home)/index.tsx`
- Show: Day card, streak counter, quick stats
- Caption: "Your daily practice, ready when you are"

### Shot 2 — Day Training — Lesson Step
- Screen: `app/day/[dayNumber].tsx` — lesson step
- Show: Day title, lesson content, step indicator, Continue button
- Caption: "5-minute structured daily sessions"

### Shot 3 — Day Training — Drill Step
- Screen: `app/day/[dayNumber].tsx` — drill step
- Show: Practice instructions, step-by-step guidance
- Caption: "Guided practice drills for real-world skills"

### Shot 4 — Program — 90-Day Roadmap
- Screen: `app/(tabs)/program.tsx`
- Show: Week groupings, completed/current/locked days
- Caption: "A clear 90-day path to emotional mastery"

### Shot 5 — Track — Progress Overview
- Screen: `app/(tabs)/track.tsx`
- Show: Streak, XP, ECRS trend (use sample data — no real user data)
- Caption: "Track your growth with every session"

### Shot 6 — Premium / Paywall
- Screen: `app/paywall.tsx`
- Show: Feature list, pricing, CTA — must show actual prices from store
- Caption: "Unlock the full program"
- **Required for IAP review screenshot (Apple)**

### Shot 7 — Journal
- Screen: `app/(tabs)/journal.tsx` or `app/journal/[id].tsx`
- Show: Entry list or editor — NO real personal data
- Caption: "Private journal for your reflections"

### Shot 8 — Reminders
- Screen: `app/reminders.tsx`
- Show: Toggle, time picker, day selector
- Caption: "Daily reminders that respect your schedule"

## Asset Production Notes
- All screenshots must be from the actual signed build (no simulator chrome on iOS)
- No debug overlays, no personal information, no placeholder content visible
- Use sample/fixture data for progress stats
- Paywall screenshot must show real prices (requires RC production configuration)
- Feature graphic (Google): 1024×500, no text required but brand-consistent
- App icon: Must be provided by owner — current placeholder is unacceptable for submission
