# Google Play Store Metadata — Control & Confidence

## Store Identity
| Field | Value | Status |
|-------|-------|--------|
| App Name (Title) | Control & Confidence | ✅ (20 chars) |
| Application ID | com.nextech.controlconfidence | ✅ |
| Version Name | 1.0.0 | ✅ |
| Version Code | [Set by EAS autoIncrement] | ✅ |
| Category | Health & Fitness | Recommended |
| Tags | Mental Health, Self-Improvement, Mindfulness | Recommended |
| Developer Name | [OWNER INPUT REQUIRED — legal entity or developer name] | ⚠️ Owner input |
| Developer Email | [OWNER INPUT REQUIRED] | ⚠️ Owner input |
| Developer Website | [OWNER INPUT REQUIRED] | ⚠️ Owner input |
| Privacy Policy URL | [OWNER INPUT REQUIRED — required] | ⚠️ Owner input |
| Account Deletion URL | [OWNER INPUT REQUIRED — required for apps with accounts] | ⚠️ Owner input |

## Title (≤30 chars)
`Control & Confidence`
Character count: 20 ✅

## Short Description (≤80 chars)
`Build emotional control and confidence with a structured 90-day daily program.`
Character count: 79 ✅

## Full Description (≤4000 chars)
```
Control & Confidence is a 90-day emotional control and confidence training program built around the ECCT framework.

Each day takes 5–10 minutes. You'll work through a structured sequence: read a short lesson, complete a guided practice drill, reflect on your experience, and rate your emotional control. Over 90 days, you build real, repeatable skills.

WHAT YOU'LL PRACTICE
• Emotional awareness and labeling
• Physiological regulation (breathing, grounding, body awareness)
• Trigger recognition and response flexibility
• Impulse control and the pause technique
• Confident communication and boundary-setting
• Self-compassion and recovery from setbacks
• Stress resilience and social confidence
• Habit consolidation and long-term maintenance

HOW IT WORKS
Days 1–7 are free. Complete each day in order — the program is designed as a progressive sequence. Each day builds on the last.

TRACK YOUR PROGRESS
See your streak, XP, and ECRS trend over time. Log emotional check-ins and journal entries to build a private record of your growth.

AI COACH (Premium)
Ask questions, get technique guidance, and receive personalised support at any point in your journey.

DAILY REMINDERS
Set a daily reminder at your preferred time. Notifications are opt-in and contain no sensitive information.

PRIVACY FIRST
Your journal and reflection entries are stored securely and never shared. Export or delete all your data at any time from Account & Privacy settings.

PREMIUM
Unlock the full 90-day program, unlimited AI Coach, and all tracking features. Start with a 7-day free trial. Cancel anytime from Google Play subscriptions.

This app is for personal skill-building only. It is not a medical device, therapy service, crisis resource, or substitute for professional mental health care.
```
Character count: ~1,450 ✅

## Release Notes (first release)
`Initial release. 90-day emotional control and confidence training program with daily guided exercises, progress tracking, journal, and AI Coach.`

## Category
Health & Fitness

## Content Rating
Everyone (see GOOGLE_DATA_SAFETY_DRAFT.md for IARC questionnaire)

## Target API Level
⚠️ **TECHNICAL BLOCKER**: Current minimum SDK is API 29. Google Play requires new apps and updates to target Android 16 (API 36) from August 31, 2026. The `targetSdkVersion` must be set to 36 in app.json before submission.
**Fix**: Add `"targetSdkVersion": 36` to `android` section of app.json.

## Account Deletion
Google Play requires an in-app account deletion flow AND an external web URL for account deletion requests.
- In-app: ✅ Implemented (POST /api/account/delete with 30-day grace)
- Web URL: ⚠️ [OWNER INPUT REQUIRED — e.g. https://controlconfidence.app/delete-account]
