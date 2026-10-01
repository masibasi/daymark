# Daymark Project Guide

Read `AGENTS.md` and all files in `docs/` before major changes.

Daymark is a calm consumer productivity app combining daily tasks, deadline projects, calendar scheduling, and category-colored completion history. Keep task screens spacious and calendar screens information-dense. Do not turn it into a SaaS dashboard.

Hard rules:

- Task, TimeBlock, and CalendarEvent are distinct entities.
- External events never automatically become Tasks.
- Adding a project subtask to Today updates the same Task.
- Day Orbit completion is based on `completedAt` only and is calculated in one selector.
- Category colors remain distinct; never blend them into new colors.
- Supabase email/password auth and item sync are allowed (owner request 2026-09-30); the app stays local-first and works signed out. Read-only iCal feeds fetched through a Supabase Edge Function are allowed (owner request 2026-10-01); still no calendar write-back, OAuth calendar API, social layer, or gamification. Drag-and-drop is allowed only for ordering/moving Tasks within Today's lists (owner request 2026-09-30); Calendar is view + import; no time-blocking for now; no other drag-and-drop.
- Use TypeScript strict mode, function components, shared theme tokens, and `StyleSheet.create`.

Run `npx expo start --web` and `npx tsc --noEmit` after meaningful changes. Visually verify mobile and desktop layouts before considering UI work complete.

