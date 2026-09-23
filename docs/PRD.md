# Product Requirements — Daymark

## Vision

Daymark is a personal productivity app for people juggling coursework, job hunting, and life admin at once — the app should feel like a calm daily companion, not a project-management tool ported down to a phone. Its signature idea is the **Day Mark**: a small, segmented ring that shows, at a glance, how a day went across your life's categories (Study, Career, Personal, Routine) — without ever blending them into mush or reducing your life to a single percentage.

## Target user

A graduate student (modeled on Jimin Lee, USC MS CS) with:
- Recurring class/lab commitments on a real calendar (lectures, office hours, team meetings).
- A handful of active deadline-driven projects (assignments, job applications) that span days-to-weeks.
- A daily todo list that mixes coursework, job search tasks, personal errands, and routine habits (gym, QT/devotional).
- A need to see "what do I owe today" and "what's coming due soon" without digging through five different apps.

More generally: anyone who wants one place for *daily tasks*, *deadline-driven projects*, and *calendar scheduling*, with a light, encouraging sense of "did I show up across the parts of my life that matter" — not gamified, not social.

## Problems Daymark solves

1. **Todo apps lose the deadline.** A flat todo list treats "reply to email" and "submit CS 599 assignment due Friday" the same. Daymark separates ongoing **Projects** (with a deadline and subtasks) from the daily **Today** list, and surfaces urgency explicitly (D-day).
2. **Calendars don't know about tasks.** Apple/Google Calendar shows meetings and classes but has no concept of "I should work on X for an hour today." Daymark's **TimeBlocks** let you schedule a *task* onto the week grid alongside your real events.
3. **Completion tracking is single-dimensional or absent.** Most apps show one streak number or nothing. Daymark's **Day Mark** shows completion *per category* for a day, so "I crushed Study but skipped Routine today" is visible instantly, without judgment (empty ≠ failure, it's a calm neutral state).
4. **Category-blended completion marks are illegible.** (See REFERENCE_ANALYSIS.md — TodoMate's flower mark.) Daymark's ring keeps categories visually distinct even when several are active the same day.

## Core concepts

- **Category** — a small, fixed set of life areas (Study, Career, Personal, Routine in V0), each with a stable color, used to color-code tasks, projects, and Day Mark segments.
- **Task** — the only completable unit. Belongs to a category. Optionally belongs to a Project (making it a subtask) and/or is flagged onto "Today" via `scheduledDate`. Completion is recorded as a timestamp (`completedAt`), not a boolean, so history can be reconstructed.
- **Project** — a deadline-bearing container of Tasks (e.g., "CSCI 599 Final Project," "SWE Internship — NVIDIA"). Progress is always derived from its Tasks, never stored separately.
- **TimeBlock** — a task placed onto the calendar at a specific start/end time. Distinct from a **CalendarEvent** (an external/mock calendar item like a lecture or meeting) — a TimeBlock always traces back to a Task; a CalendarEvent never does.
- **Day Mark** — for any given date, one segmented ring: one arc per category that had activity that day, each arc filled proportionally to that category's completed/total tasks for the day, using `completedAt` only.

## User stories (V0)

- As a user, I open the app and immediately see today's date, my Day Mark for today, and my tasks grouped by category, so I know what's left.
- As a user, I see my most urgent projects (by deadline) at a glance on Today, so nothing sneaks up on me.
- As a user, I check off a task and see it animate, sink to the bottom of its category, and update today's Day Mark immediately.
- As a user, I open a project and see all its subtasks with progress, and can flag any subtask onto today's list without duplicating it.
- As a user, I look at my week to see real events (classes, meetings) alongside any tasks I've scheduled as time blocks.
- As a user, I pick an unscheduled task and place it into an open slot on the week grid to turn it into a TimeBlock.
- As a user, I look at the month to see deadline density and completion history at a glance, and tapping a day takes me to that week.
- As a user, I see a settings entry point (header avatar) even though it's a stub in V0, so the information architecture reads as complete.

## V0 scope (this build)

- Screens: Today, Calendar (Week + Month, toggle), Projects (list + detail), Settings stub.
- Mock data only, in-memory Zustand store, no persistence across reloads required (nice-to-have, not required).
- Interactions: toggle task complete/incomplete, flag/unflag subtask onto Today, add a task (minimal inline "quick add" in Today), select-task-then-tap-slot scheduling (no drag-and-drop), switch Week/Month, navigate prev/next/Today, tap a month day to jump to that week in Week view, tap a project from Upcoming or Projects list to open Project Detail.
- Responsive: phone (bottom tabs, single column, 3-day week), tablet (left rail, 7-day week), desktop (left rail, two-column Today, 7-day week).

## V1 scope (near-term, not this build)

- Persistence (local storage or a lightweight backend) so data survives reloads.
- Drag-and-drop rescheduling of TimeBlocks; resizing by drag.
- Editing/deleting tasks, projects, time blocks (V0 supports create + complete + flag, not full CRUD).
- A real "Add project" flow (V0 seeds projects via mock data only).
- Recurrence beyond a single daily-routine flag.
- Category management (add/rename/recolor a category).

## Non-goals (explicit, all versions unless revisited)

- No Supabase/auth/real backend, no real Google Calendar API integration, no production database.
- No push notifications.
- No social features (feeds, followers, sharing, visibility settings) — see REFERENCE_ANALYSIS.md.
- No gamification: no confetti, XP, streak counters, or badges. The Day Mark communicates completion calmly, not as a score to chase.
- No auto-converting external calendar events into Tasks.

## Acceptance criteria (V0)

- `npx tsc --noEmit` passes with no errors.
- App builds and runs via `npx expo start --web` with no red-box runtime errors on any of the four priority screens.
- Day Mark on Today and on Month cells is computed from `completedAt` only (verified in `src/domain/selectors.ts` and by manual check: completing a task updates today's mark; a task with only a `scheduledDate` and no `completedAt` never contributes to a mark).
- Day Mark renders as distinct per-category segments (never one arc per task, never blended colors), legible at both 20px (month cell) and 64px (Today header) sizes.
- Scheduling a task requires an explicit "select task → tap slot" flow; no drag gesture exists anywhere in the calendar in V0.
- Responsive behavior matches spec at ~390px (phone), ~820px (tablet), ~1280px (desktop) widths, verified visually.
- Checking a task off animates (not an instant snap), updates the relevant Day Mark(s) and project progress synchronously.
