# Daymark Launch Plan

Drafted 2026-10-06 with the owner. Goal: a closed beta, then an iOS App Store release in English and Korean. Android follows iOS.

Principles for everything below:

- Deepen the core loop (folders → today → mark) rather than widening the feature list.
- Show what got done, never what was missed. No streaks, badges, scores or guilt nudges (the no-gamification rule stands).
- Local-first stays: the app works signed out and offline; the account only adds sync and backup.

## Phase A — on the web app, now

Everything here ships to the PWA immediately, so the owner can use it during the dogfooding weeks.

- **A1 Reflection (week and month).** *Built 2026-10-06 (`/reflect`).* A screen that adds up what got done:
  - the week's seven marks side by side;
  - a month of marks as a grid;
  - "n done this week";
  - where the effort went (done count per list, as list-colored bars);
  - folders finished this month;
  - the fullest day.
  
  Unfinished work is never counted or shown here. The Sunday-evening recap notification (C2) opens this screen.
- **A2 Data export and import.** A full JSON backup that can be imported back, plus a CSV of tasks for spreadsheets. Both live in Settings → Data, and both work signed out. **Built 2026-10-10:** `src/domain/backup.ts` (pure), `src/platform/files.ts` (web Blob/input; native expo-file-system, expo-sharing, expo-document-picker, untested until the iOS phase), store action `importBackup`, UI in `app/settings.tsx`.
- **A3 English and Korean.**
  - String dictionaries plus the date-fns `ko` locale.
  - Language follows the device by default, with an override in Settings.
  - Korean copy is written, not machine-translated; it should sound as calm as the English.
- **A4 Cleanup.**
  - Mock weather line removed (2026-10-06).
  - Hide the lab screens from production Settings.
  - Review the empty states.
  - Add contextual first-use tips.
- **A5 Quick add on the web.**
  - A global shortcut (`N`) opens a single add field.
  - Light parsing: "tomorrow"/"내일", "#list", "@folder".
  - Default target: today, in the last-used list.

## Phase B — accounts and privacy

- **B1 Email that actually sends.**
  - A custom SMTP provider (for example Resend), configured in the Supabase dashboard, which the owner sets up.
  - This enables password reset and turns email confirmation back on.
- **B2 Sign in with Google, then Apple** through Supabase OAuth. App Store guideline 4.8: an app that offers Google sign-in must also offer Sign in with Apple. The owner creates the Google Cloud OAuth client and the Apple Services ID.
- **B3 In-app account deletion**, required by App Store guideline 5.1.1(v).
  - An Edge Function deletes the auth user; rows cascade.
  - The device keeps its local copy unless the person also erases it.
- **B4 Privacy.**
  - Write the privacy policy and the App Store privacy label from the inventory under "What is stored today" below.
  - Calendar feed URLs stay synced so every device shows the same calendars (decided 2026-10-06); the policy names them as stored secrets, and Settings lets the person remove them.
  - No third-party analytics at first.

### What is stored today

- **Supabase Auth (`auth.users`).** Email and a password hash, managed by Supabase. The app never sees the password.
- **`public.daymark_items`.** One row per item: `user_id`, `kind`, `id`, `data` (JSON), `deleted` (tombstone), `client_updated_at` and `updated_at`.
  - Kinds: `category` (list), `project` (folder), `task`, `routine`, `timeBlock` (unused) and `preference`.
  - Preferences: Day Mark style, drawn mark, calendar feed URLs.
- **Row-level security.** Each signed-in person can read and write only their own rows.
  - Data is encrypted at rest by Supabase, but it is not end-to-end encrypted. Anyone with dashboard access to the project could read it, and the policy must say so.
- **Calendar events are not stored.** The `calendar-feed` function fetches and returns them on each request; only the feed URLs are synced.
  - Those URLs are secrets (they grant read access to a calendar), which is why they are a B4 decision.
- **Device storage.** The same data sits in AsyncStorage/localStorage on each device.

## Phase C — native iOS app (Expo EAS)

Notifications that work reliably, widgets, quick actions, native Apple sign-in and the App Store all require the native app. That makes it the trunk for the rest of the launch.

- **C1 Setup.**
  - The owner enrolls in the Apple Developer Program.
  - EAS Build and a TestFlight build.
  - The same codebase; the web app keeps deploying.
- **C2 Notifications.** Local notifications (`expo-notifications`); no push server is needed. Each item is opt-in and has a time setting:
  - **Morning plan** (default 8:30): today's task and event counts, plus folders due today or tomorrow, so deadline alerts are folded in rather than sent separately.
  - **Evening wrap** (default 21:00): only when something got done, as "n done today — see your mark". Never "you didn't finish".
  - **Weekly recap** (Sunday evening): opens Reflection (A1).
  - **Optional per-task "remind me at"** (approved 2026-10-06): the first time-of-day field on a Task. This is a reminder, not time-blocking.
  - **Not planned:** streak warnings, missed-task nudges, calendar event alerts (the calendar app already sends these).
  - **Technical note:** local notification text is fixed when it is scheduled. The app reschedules the next few days on every open and every change.
- **C3 Widgets.** Written in SwiftUI through an Expo config plugin (for example `expo-apple-targets`). The app writes a small snapshot to a shared App Group, and the widget reads it.
  - **Small:** today's mark and "n done".
  - **Medium:** the next few tasks and a + button.
  - **Lock screen:** the mark.
  - **Later:** checking tasks off from the widget (iOS 17 App Intents).
- **C4 Quick capture.**
  - A home-screen quick action ("New task", by long-pressing the icon).
  - The widget's + button, which deep-links to the add field.
  - Later: a share-sheet extension and a Shortcuts/Siri "Add to Daymark" intent.

## Phase D — launch kit

- **D1 Website** at a `jimin.blog` subdomain (for example `daymark.jimin.blog`).
  - Pages: landing, privacy policy, terms, support.
  - The App Store listing needs the privacy and support URLs.
  - It is a static site; the owner adds one DNS CNAME.
- **D2 App Store screenshots.**
  - Captured from the iOS Simulator using seeded demo data, then framed with English and Korean captions.
  - Sizes: the 6.9" set (1320×2868), plus iPad 13" if iPad is supported.
- **D3 Listing.** Name, subtitle, description, keywords (English and Korean), age rating and the privacy label.
- **D4 Closed beta.**
  - 5–10 people on TestFlight for two weeks.
  - Success signal: they are still opening the app in week two.
  - Then release.

## Order

1. Phase A, alongside two to four weeks of the owner's own daily use with a "friction log": one line every time something feels awkward.
2. Phase B. It can start on the web while Phase A finishes.
3. Phase C, after Apple Developer enrollment.
4. Phase D. The website can go up early, since the privacy policy is useful in Phase B anyway.

## Decided 2026-10-06

- Mock weather removed.
- Per-task "remind me at": yes (native app, C2).
- Calendar feed URLs: stay synced.
- iPad supported at launch.
- Apple Developer enrollment after Phase B. Sign in with Apple needs a Services ID from that membership, so B2 ships Google first, and Apple joins at the start of Phase C.

## Open owner decisions

- Website subdomain name.
- Monetization timing. Candidates are recorded in DECISIONS.md: the shape library, per-weekday shapes and themes.
