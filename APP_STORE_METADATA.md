# App Store Metadata — MAGIC

## Both stores

**App Name:** MAGIC
**Subtitle (iOS):** 13 Magical Nights of Art
**Short Description (Android):** A daily art community. Create courage, rank inspiration, win the day.

**Bundle ID / Package:** com.cejafi.magictracker
**Privacy Policy URL:** https://13magicalnights.com/privacy
**Terms of Service URL:** https://13magicalnights.com/terms
**Support URL:** https://13magicalnights.com
**Marketing URL:** https://13magicalnights.com
**Contact Email:** hello@13magicalnights.com

---

## Full Description (used on both stores, ~400 words)

**MAGIC — 13 Magical Nights of Art**

Every day is a new creative challenge.

MAGIC is a daily art community built on one simple idea: making art every day, even imperfectly, builds courage. Post a piece of writing, a sketch, a photo, or a voice note. See how others rank it alongside other submissions. Discover what moves you in the Inspire gallery. Watch your practice grow night by night.

**The Daily Loop**

• **Manifest** — set your creative intention for the day with a quote to anchor you
• **Art Studio** — write, sketch, or capture your daily courage. One post per day, for tomorrow's gallery
• **Grow** — track your streak, set a goal, celebrate milestones
• **Inspire** — rank yesterday's community artworks by today's criterion (originality, emotion, surprise…)
• **Connect** — see today's winner in the gold frame. Light a candle to save pieces that move you

**How winning works**

Each day's submissions are ranked anonymously by the community the following day. The lowest average score wins (1 = best). Winners appear in the gold Connect frame and earn a trophy in their Bookcase.

**Your private vault**

Everything you create lives in your Vault — fully private, only yours. Share what you choose.

**Pseudonym, not your name**

Your artwork appears under a pseudonym you choose. Your real identity is never shown to others.

**Build a tapestry**

Curate your favourite pieces from the community into your personal Tapestry — a scrolling gallery visible to other members.

**Premium**

Core MAGIC is free. Complete a 13-night streak to unlock a 13-day premium trial, or subscribe to keep premium features including an expanded Tapestry and Bookcase access.

---

## Keywords (iOS — 100 char max, comma-separated)

art,daily creative,drawing,sketch journal,art challenge,community art,creative habit,inspiration,writing

## Category

**Primary:** Lifestyle
**Secondary:** Education

## Age Rating

**iOS:** 17+ (Mature/Suggestive Themes — user-generated content)
**Android:** Teen (13+)

> Note: Because users can submit any artwork or writing, set 17+ on iOS to be safe for App Store review. You can argue down to 12+ if you enable content moderation.

## What to fill in manually

### Apple Developer (developer.apple.com)
- **Team ID** → Account → Membership → Team ID (10-character string)
- **Apple Sign In** → Identifiers → your App ID → enable "Sign In with Apple"
- **Push Notifications** → Identifiers → your App ID → enable "Push Notifications"

### App Store Connect (appstoreconnect.apple.com)
- Create new App → get the **ASC App ID** (10-digit number shown in App Information)
- Add to eas.json: `"ascAppId": "THAT_10_DIGIT_NUMBER"`
- Screenshots needed:
  - 6.7" iPhone (1290 × 2796) — at least 3
  - 12.9" iPad (2048 × 2732) — at least 3
  - Use simulator or device, or design in Figma/Canva

### Google Play Console (play.google.com/console)
- Create app → get service account key → save as `google-play-service-account.json` in project root
- Feature graphic: 1024 × 500 px
- Screenshots: 1080 × 1920 minimum, at least 2

## EAS Build commands (when ready)

```bash
# iOS production build (sends to TestFlight)
eas build --platform ios --profile production

# Android production build (.aab for Play Store)
eas build --platform android --profile production

# Submit to App Store (after build completes)
eas submit --platform ios --profile production

# Submit to Google Play
eas submit --platform android --profile production
```
