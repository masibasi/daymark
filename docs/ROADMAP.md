# Daymark Roadmap

## V0 — interactive visual prototype

- Today, Calendar Week/Month, Projects, Project Detail.
- In-memory mock data and core interactions.
- Responsive layout and Day Orbit motion.
- Task-to-week-slot scheduling without drag-and-drop.
- Today Task action menu for moving unfinished work, Project attention lead-time control, and Day Mark concept comparisons.
- Day Mark shipped as Watercolor wash after the study route comparison; collapsible history calendar (week on phone, month on desktop) on Today.
- Today time-rail and "reserve time" interaction study was tried and parked after review — it didn't resonate; removed from the app (preserved in git history). Today scheduling stays on the Calendar tab for now.

## V0.2 — local reliability and polish

- Local persistence, refined add/edit flows, stronger accessibility.
- Refine the date move flow and evaluate direct drag between dates on desktop after the action model is stable.
- Revisit a Today-native scheduling interaction now that the V0 time-rail study has been parked; any new direction should be simpler before drag-and-drop is considered.
- Revisit whether the D−3 and D−1 escalation should also be personalized after testing the V0 per-Project lead-time control.
- Desktop project side panel for quick subtask management while mobile retains focused detail navigation.
- Calendar scrolling, collision layout, keyboard navigation, and richer empty states.
- Interaction and animation polish on native devices.

## V0.5 — account and sync foundation

- Supabase/PostgreSQL, authentication, multi-device sync.
- Offline queue, conflict rules, telemetry, and privacy controls.

## V1 — Google Calendar and public beta

- Google Calendar provider, duplicate protection, sync status, onboarding.
- Beta-ready reliability, accessibility, performance, and support surfaces.

## Later

Android-specific polish, Apple Calendar/EventKit, notifications, widgets, optional social features, and assistive AI scheduling. These are not V1 commitments.
