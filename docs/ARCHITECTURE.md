# Daymark Architecture

## Frontend

Expo + React Native + React Native Web with TypeScript and Expo Router. Screens compose domain-aware reusable components. Styling uses `StyleSheet.create` and shared theme tokens. Zustand owns the prototype's in-memory mutable state.

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

`src/store/useDaymarkStore.ts` is the only mutable domain store. Screens call narrow actions such as `toggleTask`, `setTaskOnToday`, `addTimeBlock`, and `removeTimeBlock`. `selectedTodayDate` is view context for navigating completion history and creating a task on the displayed date; project-detail “add to Today” still targets the actual prototype date. Pure selectors in `src/domain/selectors.ts` derive day groups, completion counts, project progress, deadline urgency, calendar ranges, and Day Orbit data, plus (for the Today time-rail study) a day's combined event/TimeBlock agenda (`selectDayAgenda`), open free-time gaps (`selectFreeSlots`), and a Task's TimeBlocks on a given day (`selectTaskBlocksOnDay`).

The Today screen's time rail (`TodayTimeline`) and each Task row's "Reserve time" tray both create TimeBlocks through `addTimeBlock` — the same action Calendar Week scheduling uses — so a TimeBlock reserved from Today appears in Calendar Week automatically. Removing a block from the rail's caption calls `removeTimeBlock`. Neither action ever sets or touches `completedAt`.

`moveTaskToDate` changes the existing Task's `scheduledDate` and keeps its `projectId`. The V0 action ignores completed Tasks so moving a historical completion cannot silently rewrite completion history; reopening the Task makes it movable again.

`attentionDays` controls when an individual Project first receives a deadline tint. Missing values use seven days. The D−3 and D−1 urgency steps remain fixed in the prototype; changing the lead time does not change the underlying deadline.

There is exactly one Day Orbit calculation. It uses `completedAt` only; `scheduledDate` is never a completion fallback.

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
