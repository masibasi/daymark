# Daymark Architecture

## Frontend

Expo + React Native + React Native Web with TypeScript and Expo Router. Screens compose domain-aware reusable components. Styling uses `StyleSheet.create` and shared theme tokens. Zustand owns the app's mutable state and persists it locally so the app survives a reload.

## Domain model

```ts
Category { id: string, name, colorKey, order, archived? }   // UI name: "List"
Routine { id, title, categoryId, order }
Project { id, title, categoryId, deadline, status, notes?, attentionDays? }
Task { id, title, categoryId, projectId?, scheduledDate?, completedAt?, routineId? }
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

The store is wrapped with zustand's `persist` middleware, backed by `@react-native-async-storage/async-storage` (which reads/writes `localStorage` on web) under the key `daymark-v0`, schema `version: 2` (v1 → v2 keeps data, guarantees every category has `order`, and adds `routines`). `partialize` persists only `categories`, `routines`, `projects`, `tasks`, `timeBlocks`, and `dayMarkVariant` — durable user data and preferences. Mock calendar `events`, `calendarView`, `calendarDate`, `scheduleTaskId`, and `selectedTodayDate` are session/view state and are never persisted. An unrecognized stored version is replaced by a safe empty state via `migrate` rather than crashing. `app/_layout.tsx` reads a `hasHydrated` flag (set from `onRehydrateStorage`) and renders only a blank canvas until hydration completes, so the first paint never flashes stale or wrong data.

On first run (nothing in storage yet), the store starts with four default lists (Study, Career, Personal, Health; the Health list keeps id `routine`) and empty `projects`/`tasks`/`timeBlocks`. Mock `events` still load from `mockData` as fixed sample calendar context. Settings offers `loadSampleData()` (replaces projects/tasks/timeBlocks with the `mockData` samples) and `eraseAllData()` (clears them back to empty), both used from `app/settings.tsx` behind a confirmation.

## Real clock

`src/domain/clock.ts` exports `now()` and `todayKey()`, backed by the real system clock. Every screen and store action that means "today" (Today's header, Projects' next-deadline summary, `setTaskOnToday`, `toggleTask`'s completion timestamp, the Calendar "Today" button, `selectedTodayDate`'s initial value) uses this helper instead of the fixed `prototypeDate`. `prototypeDate` in `src/store/mockData.ts` remains only to anchor sample/mock data (the mock events and the `/daymark-lab` study route), which stays fixed around September 2026.

Calendar Week scheduling (`WeekGrid` + `SchedulePanel`, select-a-task-then-tap-a-slot) is the only place a TimeBlock is created, via `addTimeBlock`; it never touches `completedAt`. A V0 study briefly added a Today time rail and per-Task "Reserve time" tray that also called `addTimeBlock`/`removeTimeBlock`; both were removed after review (see `docs/DECISIONS.md`), along with the `removeTimeBlock` store action and the `selectDayAgenda`/`selectFreeSlots`/`selectTaskBlocksOnDay`/`selectSuggestedStarts` selectors that only it used.

`moveTaskToDate` changes the existing Task's `scheduledDate` and keeps its `projectId`. The V0 action ignores completed Tasks so moving a historical completion cannot silently rewrite completion history; reopening the Task makes it movable again.

`attentionDays` controls when an individual Project first receives a deadline tint. Missing values use seven days. The D−3 and D−1 urgency steps remain fixed in the prototype; changing the lead time does not change the underlying deadline. A Project whose deadline has passed keeps appearing (it is excluded only from the Today "Upcoming" strip, via `selectUpcomingProjects`); `ProjectCard` and Project Detail show it as "Overdue · D+n" in the danger label color instead of a negative `D−n`, with the card itself staying neutral.

There is exactly one Day Orbit calculation. It uses `completedAt` only; `scheduledDate` is never a completion fallback.

`addProject` creates a Project with `status: 'active'`. `deleteProject` also removes that Project's Tasks and those Tasks' TimeBlocks. `addProjectTask` creates a Task on that Project with no `scheduledDate` (it does not appear on Today until explicitly added). `deleteTask` also removes that Task's TimeBlocks. `TaskRow` accepts an optional `onDelete`; when passed (Today and Project Detail both pass it), its `…` menu gets a confirmed "Delete" action, still hidden for completed Tasks to protect completion history. A shared `DatePickerModal` component (used by `TaskRow`'s "Choose date" action and the Projects screen's new-project composer) is the one month-grid date picker implementation.

## Calendar provider abstraction

Calendar access is represented by a `CalendarProvider` interface. V0 uses `MockCalendarProvider`. A future Google provider will map provider events to `CalendarEvent` and preserve `externalCalendarEventId` on Daymark-created TimeBlocks to prevent duplicates.

## Sync

Owner-requested (2026-09-30). Supabase Auth (email + password) and one Postgres table, `daymark_items` (`supabase/schema.sql`), hold each synced entity as a row `(user_id, kind, id, data jsonb, deleted, client_updated_at, updated_at)`; RLS limits rows to their owner and there is no delete policy, so deletes are tombstones (`deleted = true`). Synced kinds: `category`, `project`, `task`, `timeBlock`, `routine`, and a `preference` row for `dayMarkVariant`. Mock events, view state, and toasts are never synced. The app is local-first: the zustand store is the source of truth and everything works signed out.

Code is in `src/sync/`. `merge.ts` holds the pure rules (diffing, `decideRemote`, applying rows); `engine.ts` runs the cycle; `syncStore.ts` exposes status to the UI.

- **Change tracking.** The engine subscribes to the store and diffs collections by item reference; each added/changed/removed item becomes a dirty entry `{kind, id, clientUpdatedAt, deleted}` kept in AsyncStorage (`daymark-sync-v1`, with `userId` and `lastPulledAt`), so offline edits survive reloads. Removal entries keep the last copy so the tombstone can be pushed later. Applying remote rows sets an `applyingRemote` flag so they are not re-recorded.
- **Cycle = pull, then push.** Pull fetches rows with `updated_at > lastPulledAt` (server clock cursor). A row is skipped only if a local dirty entry has a newer `clientUpdatedAt`; otherwise it is applied through `applyRemoteItems` and the dirty entry dropped. Push upserts dirty items in batches and drops an entry only if it was not edited again meanwhile. Failures keep all dirty entries; network errors show "Offline".
- **Triggers.** Sign-in, app start with a session, web focus/visibility/online, native AppState active, every 60 s, and 1.5 s after a local change.
- **First sign-in on a device.** Every local item is marked dirty at epoch time, so any server copy of the same id wins and only local-only items are uploaded. Default lists share ids across devices and merge. A different user signing in resets this state.
- **Ids** are `prefix-<time36>-<random>` so two devices never collide. Conflict rule is last-writer-wins per item by client timestamp (device clock skew is accepted).

## Important edge cases

- A TimeBlock ending does not complete its Task.
- Removing a Task from Today does not remove it from its Project or Calendar.
- Reopening a Task clears `completedAt` and updates completion history.
- Archived projects remain historical but do not appear as upcoming.
- Deleted provider events must not delete Tasks.
- Time zones and all-day event boundaries need explicit provider normalization before real sync.

## Web deployment

Pushing `codex/v0-rebuild` runs `.github/workflows/deploy-web.yml`, which typechecks, exports the web build with `EXPO_BASE_URL=/daymark` (read by `app.config.js`), adds a `404.html` SPA fallback and home-screen tags, and publishes to GitHub Pages at https://masibasi.github.io/daymark/. Local development keeps serving from the site root. Data stays in each browser's storage unless the owner signs in, in which case it syncs through Supabase (see Sync). The publishable Supabase key in `src/sync/config.ts` is public by design.

## Lists and routines

`CategoryId` is a plain string; a list's colour comes from its `colorKey` into `categoryPalette` (six distinct keys), never from its id. Components resolve colours through `selectCategoryColorKey` (via the `useCategoryPalette` hook) and `DayOrbitSegment` carries its own `colorKey`. `selectDayOrbit(tasks, day, categories)` iterates every list in `order`, archived ones included, so history still renders. Store actions: `addCategory`, `updateCategory`, `moveCategory` (swaps `order` with the neighbouring active list), `archiveCategory` (hides the list from Today inputs, list management and composers; blocked for the last active list; never hard-deletes). Routines: `addRoutine`, `removeRoutine`, `addTaskFromRoutine(routineId, date)`, which creates a normal Task carrying `routineId`. `selectRoutinesForList` and `selectRoutineAddedOnDay` feed `selectGhostRoutines`, which drives Today's ghost rows. `Task.order` plus `sortTasksByOrder` and the `moveTaskInDay` action back drag reordering (persist version 3; migration from v2 is a pass-through). `lastDeleted` and `toast` are non-persisted; `deleteTask` / `removeRoutine` fill them and `undoDelete` restores.

Today renders `selectTodaySections`: all active lists (even when empty) plus archived lists that have tasks that day. Only one list's inline add input is open at a time (state lives in `app/index.tsx`). The List management screen is `app/lists.tsx`.

## Mobile web

`useKeyboardVisible` (`src/theme`) hides the phone bottom bar while a text input is focused (web `focusin`/`focusout`) or the keyboard is showing (native). All TextInputs use font size 16 so iOS Safari does not zoom on focus, and the deploy workflow rewrites the viewport meta to `maximum-scale=1, viewport-fit=cover`.
