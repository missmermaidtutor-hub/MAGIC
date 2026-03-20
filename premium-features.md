# MAGIC Tracker — Premium Features Implementation

## Overview

Freemium model with three access tiers:
1. **New User Grace** — first 13 "Magical Nights" (account days) = all features free
2. **Streak Trial** — reaching a streak ending in 13 (13, 113, 213, 1013…) grants a free 13-day premium trial
3. **Paid Premium** — `isPremium = true` on Firestore profile (future IAP integration)

## Free vs Premium Features

| Feature | Free | Premium |
|---------|------|---------|
| Current streak + longest streak | Yes | Yes |
| Basic curated gallery | 10 slots | 25 slots |
| Write today's manifest | Yes | Yes |
| Set today's goal | Yes | Yes |
| Vote on courages | Yes | Yes |
| Share courage | Yes | Yes |
| Join discussion pods | Yes | Yes |
| **Advanced stats** (per-MAGIC-category days, goal rate) | No | Yes |
| **Inspiration impact** (how many times your art inspired others) | No | Yes |
| **Past diary entries** (view previous manifest entries) | No | Yes |
| **Favorite quote archive** (review hearted quotes) | No | Yes |
| **Goal history & stats** (completion rate, history list) | No | Yes |
| **Expanded curated gallery** (25 slots vs 10) | No | Yes |
| **Early gallery access** (before 13-day membership mark) | No | Yes |

## Files Created/Modified

### New Files
- `utils/premiumUtils.js` — Single source of truth for all premium logic
- `components/premium/PremiumGate.js` — Conditional render wrapper
- `components/premium/PremiumPaywall.js` — Paywall UI (full card + compact banner)

### Modified Files
- `services/firestoreService.js` — Added `grantPremiumTrial()`, `setPremium()`, premium fields in `createUserProfile()`
- `context/AuthContext.js` — Added `checkStreakTrial()` function, exposed in context
- `screens/HomeScreen.js` — Streak trial milestone detection + alert
- `screens/StreakScreen.js` — Advanced stats gated behind `PremiumGate`
- `screens/ManifestScreen.js` — Past entries + favorite quotes gated
- `screens/GoalScreen.js` — Goal stats + history gated
- `screens/CommunityScreen.js` — Dynamic curated limit (10/25), early gallery access, inspiring works tab gated

## Firestore Fields (users/{uid})

```
isPremium: boolean (default: false)
premiumStartDate: timestamp (set when paid)
premiumExpiry: timestamp (paid subscription expiry)
premiumTrialExpiry: timestamp (streak-based trial expiry)
```

## Analytics Events

- `premium_paywall_shown` — user sees a paywall
- `premium_upgrade_tapped` — user taps upgrade button
- `premium_trial_granted` — streak milestone triggered a trial

## Future Work

- In-App Purchase integration (Apple/Google)
- Premium status badge in profile
- Boutique access gating
- Pod creation as premium feature
- Data export as premium feature
