# Roadmap — Daymark

## V0 (this build) — coherent interactive prototype

- Docs (this set) + Expo/TS/expo-router scaffold on react-native-web.
- Today, Calendar (Week/Month), Projects (list + detail), Settings stub.
- Mock data only, single in-memory Zustand store, no persistence across reloads.
- Day Mark (segmented ring), category-colored TaskRows/CategorySections, D-day Upcoming strip.
- Select-task-then-tap-slot scheduling only (no drag-and-drop).
- Responsive: phone bottom tabs / tablet+desktop left rail, desktop two-column Today, 3-day/7-day week.

## V0.2 — persistence + full task CRUD

- Local persistence (AsyncStorage or equivalent) so the store survives a reload — still no backend.
- Edit and delete for Task, Project, TimeBlock (V0 only supports create + complete/flag).
- Real "New Project" and "New Category" flows (V0 seeds both via mock data only).
- Undo for destructive actions (delete task/project/time block).

## V0.5 — richer scheduling + calendar polish

- Drag-and-drop to reschedule/move a TimeBlock; drag-to-resize duration.
- Tap an event/time block for a detail view (currently visual-only in V0).
- Day view (currently Week/Month only).
- Recurrence beyond the single `daily` flag (e.g., weekly on specific days, matching real class schedules).
- Sidebar mini-month (explicitly deferred from Apple Calendar reference in V0).

## V1 — accounts + real backend

- Authentication and a real backend/database (the plan explicitly excludes Supabase by name as an implementation choice to revisit, not a permanent ban) replacing the in-memory store's data ownership.
- Category management: add/rename/recolor/reorder categories beyond the fixed four.
- Multi-device sync of Daymark's own data (Task/Project/TimeBlock), independent of calendar sync.
- Dark mode (tokens are stubbed in V0, not wired to a toggle).

## Later — external calendar integration

- Real Google Calendar (or similar) read integration via the existing `CalendarProvider` interface — swap `MockCalendarProvider` for a `GoogleCalendarProvider`.
- Two-way sync: pushing Daymark TimeBlocks out as real calendar events, using `TimeBlock.externalRef` for dedup.
- Push notifications for upcoming deadlines/time blocks (explicitly out of scope through V1).
- Any further polish (widgets, native share, etc.) evaluated only after the above is solid — no social or gamification features are planned at any horizon.
