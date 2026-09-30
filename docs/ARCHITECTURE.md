# Daymark Architecture

## Frontend

Expo + React Native + React Native Web with TypeScript and Expo Router. Screens compose domain-aware reusable components. Styling uses `StyleSheet.create` and shared theme tokens. Zustand owns the app's mutable state and persists it locally so the app survives a reload.

## Domain model

```ts
Category { id, name, colorKey, order }
Project { id, title, categoryId, deadline, status, notes?, attentionDays? }
Task { id, title, categoryId, projectId?, scheduledDate?, completedAt? }
TimeBlock { id, taskId, startAt, endAt, externalCalendarEventId? }
CalendarEvent { id, provider, externalId, title, startAt, endAt, allDay, colorKey? }
```

Relationships:

- Project 1 → many Tasks.
- Task 1 → zero or many TimeBlocks.
- TimeBlock always references a Task.
- CalendarEvent is independent from Task and TimeBlock.
- `scheduledDate` places the same Task on Today; it never creates a copy.

## State boundaries

`src/store/useDaymarkStore.ts` is the only mutable domain store. Screens call narrow actions such as `toggleTask`, `setTaskOnToday`, `addTimeBlock`, `addProject`, `deleteProject`, `addProjectTask`, and `deleteTask`. `selectedTodayDate` is view context for navigating completion history and creating a task on the displayed date; project-detail "add to Today" targets the real current date via `src/domain/clock.ts`. Pure selectors in `src/domain/selectors.ts` derive day groups, completion counts, project progress, deadline urgency, calendar ranges, and Day Orbit data.

## Local persistence

The store is wrapped with zustand's `persist` middleware, backed by `@react-native-async-storage/async-storage` (which reads/writes `localStorage` on web) under the key `daymark-v0`, schema `version: 1`. `partialize` persists only `categories`, `projects`, `tasks`, `timeBlocks`, and `dayMarkVariant` — durable user data and preferences. Mock calendar `events`, `calendarView`, `calendarDate`, `scheduleTaskId`, and `selectedTodayDate` are session/view state and are never persisted. An unrecognized stored version is replaced by a safe empty state via `migrate` rather than crashing. `app/_layout.tsx` reads a `hasHydrated` flag (set from `onRehydrateStorage`) and renders only a blank canvas until hydration completes, so the first paint never flashes stale or wrong data.

On first run (nothing in storage yet), the store starts with the four fixed categories and empty `projects`/`tasks`/`timeBlocks`. Mock `events` still load from `mockData` as fixed sample calendar context. Settings offers `loadSampleData()` (replaces projects/tasks/timeBlocks with the `mockData` samples) and `eraseAllData()` (clears them back to empty), both used from `app/settings.tsx` behind a confirmation.

## Real clock

`src/domain/clock.ts` exports `now()` and `todayKey()`, backed by the real system clock. Every screen and store action that means "today" (Today's header, Projects' next-deadline summary, `setTaskOnToday`, `toggleTask`'s completion timestamp, the Calendar "Today" button, `selectedTodayDate`'s initial value) uses this helper instead of the fixed `prototypeDate`. `prototypeDate` in `src/store/mockData.ts` remains only to anchor sample/mock data (the mock events and the `/daymark-lab` study route), which stays fixed around September 2026.

Calendar Week scheduling (`WeekGrid` + `SchedulePanel`, select-a-task-then-tap-a-slot) is the only place a TimeBlock is created, via `addTimeBlock`; it never touches `completedAt`. A V0 study briefly added a Today time rail and per-Task "Reserve time" tray that also called `addTimeBlock`/`removeTimeBlock`; both were removed after review (see `docs/DECISIONS.md`), along with the `removeTimeBlock` store action and the `selectDayAgenda`/`selectFreeSlots`/`selectTaskBlocksOnDay`/`selectSuggestedStarts` selectors that only it used.

`moveTaskToDate` changes the existing Task's `scheduledDate` and keeps its `projectId`. The V0 action ignores completed Tasks so moving a historical completion cannot silently rewrite completion history; reopening the Task makes it movable again.

`attentionDays` controls when an individual Project first receives a deadline tint. Missing values use seven days. The D−3 and D−1 urgency steps remain fixed in the prototype; changing the lead time does not change the underlying deadline. A Project whose deadline has passed keeps appearing (it is excluded only from the Today "Upcoming" strip, via `selectUpcomingProjects`); `ProjectCard` and Project Detail show it as "Overdue · D+n" in the danger label color instead of a negative `D−n`, with the card itself staying neutral.

There is exactly one Day Orbit calculation. It uses `completedAt` only; `scheduledDate` is never a completion fallback.

`addProject` creates a Project with `status: 'active'`. `deleteProject` also removes that Project's Tasks and those Tasks' TimeBlocks. `addProjectTask` creates a Task on that Project with no `scheduledDate` (it does not appear on Today until explicitly added). `deleteTask` also removes that Task's TimeBlocks. `TaskRow` accepts an optional `onDelete`; when passed (Today and Project Detail both pass it), its `…` menu gets a confirmed "Delete" action, still hidden for completed Tasks to protect completion history. A shared `DatePickerModal` component (used by `TaskRow`'s "Choose date" action and the Projects screen's new-project composer) is the one month-grid date picker implementation.

## Calendar provider abstraction

Calendar access is represented by a `CalendarProvider` interface. V0 uses `MockCalendarProvider`. A future Google provider will map provider events to `CalendarEvent` and preserve `externalCalendarEventId` on Daymark-created TimeBlocks to prevent duplicates.

## Future backend

Supabase/PostgreSQL can later store users, categories, projects, tasks, time blocks, provider connections, and sync cursors. The client repository boundary should replace mock persistence without changing domain semantics.

## Important edge cases

- A TimeBlock ending does not complete its Task.
- Removing a Task from Today does not remove it from its Project or Calendar.
- Reopening a Task clears `completedAt` and updates completion history.
- Archived projects remain historical but do not appear as upcoming.
- Deleted provider events must not delete Tasks.
- Time zones and all-day event boundaries need explicit provider normalization before real sync.

## Web deployment

Pushing `codex/v0-rebuild` runs `.github/workflows/deploy-web.yml`, which typechecks, exports the web build with `EXPO_BASE_URL=/daymark` (read by `app.config.js`), adds a `404.html` SPA fallback and home-screen tags, and publishes to GitHub Pages at https://masibasi.github.io/daymark/. Local development keeps serving from the site root. Data stays in each browser's storage; the deployed site has no backend.
