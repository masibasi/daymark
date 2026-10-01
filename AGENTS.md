# AGENTS.md — Daymark

Guidance for Codex (and future engineers) working in this repo. Read `docs/PRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/ROADMAP.md` before any change that isn't a trivial fix — they are the source of truth, this file is the quick-reference summary.

## Goals

Daymark is a calm, personal productivity app: daily todos + folders (optional deadlines) + calendar scheduling, unified by the **Day Mark** — a list-segmented completion ring. It is not a SaaS project-management tool, not social, not gamified. See `docs/PRD.md` for full product context.

## Design principles (see docs/DESIGN.md for detail)

- Calm and editorial, not "generic SaaS": minimal shadows, no gradients/glassmorphism, restrained icons, whitespace over borders.
- Color is meaningful (list identity; lists are user-managed and resolved through `colorKey`, never through id), not decorative. Never invent a new color outside `src/theme`.
- Completed tasks fade, they don't strike through. No confetti, streaks, XP, or badges — ever.
- The Day Mark is always a **segmented ring** (one arc per list, sized by share, filled by completion), never a blended shape, never one micro-arc per task.

## Architecture rules (see docs/ARCHITECTURE.md for detail — do not violate without updating that doc first)

1. **Day Mark completion history uses `completedAt` ONLY.** Never fall back to `scheduledDate` for any completion/history computation. This is enforced by having exactly one implementation, `selectDayMark` in `src/domain/selectors.ts` — do not reimplement Day Mark math inline in a component.
2. **All derived data (progress, Day Mark, urgency tiers, today's task list) lives in `src/domain/selectors.ts`** as pure functions taking store slices as arguments. Components call selectors; they do not compute derived state inline.
3. **Zustand store (`src/store/useStore.ts`) is the only mutable state for domain data.** It exposes a small repository-shaped action API (`toggleTask`, `setTaskOnToday`, `addTask`, `removeTimeBlock`, `setCalendarView`, `setCalendarDate`, ...). Screens/components never mutate entities directly.
4. **A subtask's "on Today" status is the `scheduledDate` field on its Task — never a duplicate record.** One Task, one row.
5. **CalendarEvent and TimeBlock stay distinct types.** A CalendarEvent is external and never becomes a Task. A TimeBlock always has a `taskId`. Do not merge these types even for convenience.
6. **Calendar reads go through the `CalendarProvider` interface** (`src/calendar/CalendarProvider.ts`); `IcsCalendarProvider` (real feeds, read-only) and `MockCalendarProvider` (sample data only) implement it. Screens/selectors never import a concrete provider class directly.
7. **Styling uses `StyleSheet.create` + tokens from `src/theme`.** No inline magic numbers where a token exists, no ad hoc hex colors, no Tailwind/NativeWind.

## Scope boundaries (hard limits — do not add without explicit user request)

Supabase email/password auth and item sync are allowed (owner request 2026-09-30; local-first, the app must keep working signed out, see `docs/ARCHITECTURE.md` "Sync"). Read-only iCal feeds (Google/iCloud/Outlook secret links) fetched by the `calendar-feed` Supabase Edge Function are allowed (owner request 2026-10-01); still no OAuth calendar API, no calendar write-back, no other backend, no push notifications, no social features (feeds/followers/sharing), no gamification (confetti/XP/streaks/badges). Drag-and-drop is allowed only to reorder Tasks within Today's lists and move them between lists (owner request 2026-09-30; completed and project tasks may reorder but never change list), to drop a Task onto a folder card in Today's folder strip, and to reorder folders on the Folders tab (owner requests 2026-10-01). Calendar is view + import (tap an event to add it to a day as a Task); no time-blocking for now; no other drag-and-drop (see `docs/DECISIONS.md`). See `docs/ROADMAP.md` for what's deferred vs. permanently out of scope — read it before assuming something is "just not built yet."

## Folders (code: `Project`)

The UI says "Folders"; the entity stays `Project` (route `/projects`). A folder may or may not have a `deadline`. Folder order comes from one selector, `selectFolders` / `selectFolderGroups` (pinned by `order`, then dated by deadline, then undated by `order`); never sort folders inline. A step is still one Task with `projectId` (placed on a day only via `scheduledDate`). Past days keep what was left undone through `Task.missedOn`; nothing auto-clears dates (see `docs/DECISIONS.md`).

## Coding standards

- TypeScript strict mode. No `any`.
- Function components only.
- `StyleSheet.create` per component; values from `src/theme/tokens.ts` and `src/theme/categoryColors.ts`.
- Small, single-purpose, reusable components (see `docs/DESIGN.md` "component system" for the expected set) — avoid monolithic screen-specific components that duplicate logic already in a shared component.
- Selectors, not components, own derived-data math (`src/domain/selectors.ts`).
- Keep it un-overengineered: this is a V0 prototype on mock data — don't add abstraction layers (e.g., a generic data-fetching layer, a plugin system) that aren't earned yet by real requirements in `docs/ROADMAP.md`.

## Before major changes

Inspect the relevant doc(s) first — `docs/PRD.md` for product scope questions, `docs/DESIGN.md` for visual/interaction questions, `docs/ARCHITECTURE.md` for data-model/state questions, `docs/DECISIONS.md` for "why was it built this way," `docs/ROADMAP.md` for "is this in scope yet." If a change would contradict one of these docs, update the doc in the same change rather than silently drifting from it.

## Running the app

```
npx expo start --web
```

Then `npx tsc --noEmit` to typecheck. See `docs/PRD.md` "Acceptance criteria" for what a working V0 build must satisfy.
