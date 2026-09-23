# Architecture — Daymark

## Frontend architecture

- **Expo (SDK 54+) + TypeScript + expo-router**, targeting native (iOS/Android, unverified in this build but structurally supported) and web (react-native-web) from one codebase. File-based routing gives web-friendly URLs (`/`, `/calendar`, `/projects`, `/projects/[id]`, `/settings`) for free.
- **State:** a single Zustand store (`src/store/useStore.ts`) holds all in-memory app state (tasks, projects, categories, calendar events, time blocks, current calendar view/date). It is intentionally the *only* state layer in V0 — no React Query, no server cache, no persistence middleware — because there is no backend yet. It is written as a thin **repository-shaped** API (`toggleTask`, `setTaskOnToday`, `addTask`, `addTimeBlock`, `setCalendarView`, `setCalendarDate`, plus category/project accessors) so screens never mutate domain objects directly, which keeps the door open to swapping the store's internals for a real backend-backed repository later without touching screen code.
- **Derived data lives in selectors** (`src/domain/selectors.ts`), not in components or inline in the store. Screens call selectors with the store's raw slices; selectors are pure functions, independently testable, and are the single place completion/progress/urgency math is allowed to happen. Examples: `selectTodayTasks`, `selectProjectProgress`, `selectDayMark(date)`, `selectUpcomingProjects`, `selectDeadlineUrgencyTier`.
- **Styling:** `StyleSheet.create` per component, values pulled from `src/theme/tokens.ts` (colors, spacing, radii, type scale, shadows, motion durations) and `src/theme/categoryColors.ts` (category → {solid, soft, text}). No NativeWind/Tailwind, no CSS-in-JS beyond RN's own StyleSheet — keeps styling explicit, typed, and portable to native.
- **Animation:** `react-native-reanimated` shared values for checkbox pulse, row fade, and Day Mark segment sweep. `react-native-svg` renders the Day Mark ring and calendar rail/segment shapes.
- **Dates:** `date-fns` for all date arithmetic/formatting; a thin `src/domain/dateUtils.ts` wraps the handful of operations screens/selectors need (start/end of week, ISO day key, D-day diff) so call sites don't scatter raw date-fns imports and format choices.

## Domain model

```
Category   { id, name, color: CategoryColorKey, order }
Project    { id, title, categoryId, deadline: ISODate, status: 'active'|'done'|'archived', notes? }
Task       { id, title, categoryId, projectId?: string,        // subtask if set
             scheduledDate?: ISODate,   // "on Today list for this date"
             completedAt?: ISODateTime, order, recurrence?: 'daily' }
TimeBlock  { id, taskId, start: ISODateTime, end: ISODateTime, externalRef?: { provider, eventId } }
CalendarEvent { id, title, start, end, allDay, source: { provider: 'google' | 'mock', calendarId, eventId }, color }
```

### Relationships and invariants

- **Task is the only completable thing.** Projects and TimeBlocks never carry their own "done" flag — everything derives from Task.
- **Task ↔ Project:** a Task with `projectId` set *is* a subtask of that project; there is no separate Subtask type. A project's **progress** is always `selectProjectProgress(project)` computed live from its tasks' `completedAt` presence — never stored on the Project.
- **Task ↔ "Today":** `scheduledDate` is the sole mechanism by which a Task (top-level or a project's subtask) appears on the Today list for a given date. Flagging a subtask onto Today = setting `scheduledDate`; unflagging = clearing it. This is why the plan explicitly rejects a separate "add to Today" duplication mechanism — one Task, one row, referenced from two views.
- **Task ↔ TimeBlock:** a TimeBlock always has a `taskId` — it represents *this task, scheduled at this time*. Multiple TimeBlocks could reference the same Task (e.g., two work sessions) — V0 mock data does not exercise this but the model allows it. Deleting/uncompleting the Task does not cascade-delete the TimeBlock in V0 (no delete UI exists yet).
- **TimeBlock ↔ CalendarEvent:** distinct types, deliberately not unified. A CalendarEvent represents something external (a lecture, a meeting) that Daymark did not create and does not own; a TimeBlock represents Daymark's own "I'm working on task X now." They are rendered together in Week/Month views but are never merged into one record, so an external event can never accidentally be marked "complete" and a task-block never masquerades as a real calendar commitment. `TimeBlock.externalRef` exists so a *future* two-way sync (writing a TimeBlock out to a real calendar) can dedupe against the event it created, without collapsing the two concepts.
- **Category:** referenced by id from Task and Project; owns color identity. No task/project stores a denormalized color — always look up via `categoryId` so recoloring a category (V1) updates everywhere for free.

### Day Mark data rule (mandatory, see PRD/DESIGN)

`selectDayMark(date)` groups by category **only** Tasks whose `completedAt` falls on `date`. `scheduledDate` is never read as a fallback for completion history — a task scheduled for today that hasn't been completed contributes zero to today's Day Mark fill (it still contributes to segment sizing methodology for the *live* Today ring, see below), and a task completed on a different day than it was scheduled shows up on the day it was actually completed, not the day it was planned. This is the one rule every selector and screen touching the Day Mark must respect; it is enforced by having exactly one selector implementation (`selectDayMark`) that all Day Mark call sites use — no screen computes it inline.

Two related but distinct Day Mark uses:
- **Today's live ring** (Today header, 64px): denominator = tasks with `scheduledDate === today` grouped by category (what *should* happen today); numerator = of those, how many have `completedAt` today. This is "today's plan vs. today's actual," still `completedAt`-gated for the numerator.
- **History rings** (Month cells, past dates): no forward-looking "plan" exists for a past date in V0's mock data model, so both segment sizing and fill are derived from Tasks whose `completedAt` is on that date, grouped by category — i.e., "what got done that day," which is exactly the `completedAt`-only rule stated above.

## State boundaries

- **Store (Zustand):** raw entity collections + current UI-position state that must survive navigation (selected calendar view, selected calendar date, in-progress "placement mode" task selection for scheduling). This is the only place mutation happens.
- **Selectors (`src/domain/selectors.ts`):** pure, derived, no side effects, take store slices as arguments (not the store itself) so they're trivially unit-testable and reusable outside components.
- **Component-local state (`useState`):** ephemeral, presentation-only concerns that never need to survive a re-render from elsewhere — text input drafts (QuickAdd, add-subtask input), open/closed state of local disclosure UI. Never domain data.
- **Route params (expo-router):** identify *which* entity a screen shows (`projects/[id]`) — the screen reads the id and pulls the entity from the store; params never carry entity payloads themselves.

## Calendar provider abstraction

```
interface CalendarProvider {
  listEvents(range: { start: ISODateTime; end: ISODateTime }): CalendarEvent[];
  createEvent(block: TimeBlock): CalendarEvent;   // called when a TimeBlock should also exist externally (future)
  updateEvent(eventId: string, patch: Partial<CalendarEvent>): void;
  deleteEvent(eventId: string): void;
}
```

V0 ships exactly one implementation, `MockCalendarProvider` (`src/calendar/MockCalendarProvider.ts`), backed by the same in-memory mock event array the store seeds from. The interface exists now specifically so a `GoogleCalendarProvider` (V1+, real OAuth + Calendar API) can be dropped in later behind the same four methods without screens or selectors changing — screens/selectors only ever talk to `CalendarProvider`, never to a concrete provider class. `TimeBlock.externalRef: { provider, eventId }` is the dedup key a real sync would use to avoid double-importing an event Daymark itself created.

## Future backend

Not built in V0. When it arrives, the intended shape is: the Zustand store's mutating actions (`toggleTask`, `addTask`, etc.) become thin wrappers that optimistically update local state *and* call a repository/API client; selectors are untouched since they only consume shape, not source. A real backend would own Category/Project/Task/TimeBlock persistence per-user; CalendarEvent stays provider-sourced (see below) rather than backend-owned.

## Future sync

Two independent sync concerns, kept separate on purpose:
1. **Data persistence sync** (local device ↔ backend) — for Task/Project/TimeBlock the user creates. Out of scope until a backend exists.
2. **Calendar sync** (external provider ↔ Daymark's view of CalendarEvents) — handled entirely through the `CalendarProvider` abstraction above; swapping `MockCalendarProvider` for a real provider is the whole migration for read access, plus wiring `createEvent`/`updateEvent`/`deleteEvent` if Daymark should ever push TimeBlocks out to a real calendar (V1+ decision, not committed).

## Edge cases considered

- **Task with no category:** not permitted by the type (`categoryId` required) — mock data and any future "add task" UI must always assign a category; this keeps Day Mark segmentation total (every task lands in exactly one segment).
- **Day with only one category active:** Day Mark renders a single full-circumference segment (minus gap-to-self, i.e., effectively a full ring in that category's color) rather than special-casing "1 category" differently from "N categories" — the general segment-sizing algorithm naturally produces this.
- **Day with zero tasks:** empty hairline ring (see DESIGN.md), not hidden — a day is never rendered with no Day Mark at all in a context where one is expected, so the UI never has an unexplained gap.
- **Task completed then uncompleted on a different day than scheduled:** `completedAt` is cleared entirely on uncomplete (not moved), so it stops contributing to any day's Day Mark; if re-completed later it contributes to *that* later day, not the original scheduled day.
- **Overlapping TimeBlocks/CalendarEvents in Week view:** laid out in side-by-side sub-columns within the day column (matching Apple Calendar's real overlap behavior observed in references), not stacked/hidden.
- **Project with zero subtasks:** progress is 0/0 → rendered as 0% (empty progress bar), not NaN or hidden; `selectProjectProgress` guards the division.
- **Task flagged onto Today from a project, then completed:** counts toward both today's Day Mark (via `completedAt`) and its project's progress simultaneously — both are pure derivations from the same Task, so there is no dual-write/consistency risk by construction.
