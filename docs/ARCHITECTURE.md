# Daymark Architecture

## Frontend

Expo + React Native + React Native Web with TypeScript and Expo Router. Screens compose domain-aware reusable components. Styling uses `StyleSheet.create` and shared theme tokens. Zustand owns the prototype's in-memory mutable state.

## Domain model

```ts
Category { id, name, colorKey, order }
Project { id, title, categoryId, deadline, status, notes? }
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

`src/store/useDaymarkStore.ts` is the only mutable domain store. Screens call narrow actions such as `toggleTask`, `setTaskOnToday`, and `addTimeBlock`. `selectedTodayDate` is view context for navigating completion history and creating a task on the displayed date; project-detail “add to Today” still targets the actual prototype date. Pure selectors in `src/domain/selectors.ts` derive day groups, completion counts, project progress, deadline urgency, calendar ranges, and Day Orbit data.

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
