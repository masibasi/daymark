# Daymark Roadmap

## V0 — interactive visual prototype

- Today, Calendar Week/Month, Projects, Project Detail.
- In-memory mock data and core interactions.
- Responsive layout and Day Orbit motion.
- Calendar view + event import to Tasks (task-to-week-slot time-blocking was built, then paused 2026-10-01).
- Today Task action menu for moving unfinished work, Project attention lead-time control, and Day Mark concept comparisons.
- Day Mark shipped as Watercolor wash after the study route comparison; collapsible history calendar (week on phone, month on desktop) on Today.
- Today time-rail and "reserve time" interaction study was tried and parked after review — it didn't resonate; removed from the app (preserved in git history). Time-blocking is paused until calendar write-back exists.
- Local persistence (zustand `persist` + AsyncStorage), the real system clock in place of the fixed prototype date, project/step creation and deletion, and a Settings screen with sample-data/erase actions — done, so the owner can use Daymark day to day on their own device.
- User-managed flat lists, per-list inline add on Today (replacing the bottom composer), tap-to-add routines, and mobile web fixes (no focus zoom, bottom bar hides while typing) — done after real phone use.
- Folders (2026-10-01): optional deadlines, pinning, manual order, archive/restore, completion prompt, source labels, carry-over banner with `missedOn` history, move-to-folder (menu and drag), faster desktop drag — done.
- Routine schedules (every day, weekdays, N times a week; owner request 2026-10-01) and an installable web app (manifest, icons, network-first service worker) on the GitHub Pages deploy.

## V0.2 — local reliability and polish

- Refined add/edit flows (renaming, richer editing), stronger accessibility.
- Refine the date move flow and evaluate direct drag between dates on desktop after the action model is stable.
- Revisit a Today-native scheduling interaction now that the V0 time-rail study has been parked; any new direction should be simpler before drag-and-drop is considered.
- Revisit whether the D−3 and D−1 escalation should also be personalized after testing the V0 per-Project lead-time control.
- Desktop folder side panel for quick step management while mobile retains focused detail navigation.
- Calendar scrolling, collision layout, keyboard navigation, and richer empty states.
- Interaction and animation polish on native devices.

## V0.5 — account and sync foundation

- Done (2026-09-30, awaiting owner's real-device test): Supabase email/password auth, multi-device item sync, offline dirty queue, last-writer-wins conflict rule. See `docs/ARCHITECTURE.md` "Sync".
- Still open: password reset, field-level conflict handling, realtime push instead of polling, telemetry, privacy controls.

## V1 — Google Calendar and public beta

- Done early (2026-10-01, awaiting the owner's real-feed test): read-only Google/Apple/Outlook calendars via secret iCal feeds and the `calendar-feed` Edge Function.
- Still open: Google OAuth provider and write-back (only if needed), duplicate protection for scheduled blocks, onboarding.
- Beta-ready reliability, accessibility, performance, and support surfaces.

## Later

Android-specific polish, Apple Calendar/EventKit, notifications, widgets, optional social features, and assistive AI scheduling. These are not V1 commitments.

## Not planned yet

- Nested lists, un-archiving lists, and reordering routines.
