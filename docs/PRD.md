# Daymark Product Requirements

## Vision

Daymark is a personal productivity app that joins daily tasks, persistent deadline-driven projects, and calendar scheduling into one calm loop: decide what matters, reserve time, do the work, and see the day take shape.

## Target user

The first user is an individual balancing study, career, personal, and routine work. The product should later support a public consumer audience without introducing team or enterprise metaphors.

## User problems

- Daily todo apps hide long-running deadlines.
- Project tools make a personal day feel administrative.
- Calendars show commitments but not the work behind them.
- Checking a box provides little sense of accumulated progress.

## Core concepts

- **Task:** something to accomplish. It may stand alone or belong to a Project.
- **Project:** persistent deadline-driven work with progress and subtasks.
- **TimeBlock:** time reserved to work on a Task. It does not imply completion.
- **CalendarEvent:** an external commitment. It is not automatically a Task.
- **Day Orbit:** a category-segmented completion mark based only on `completedAt`.

## User stories

- I can see urgent projects before today's ordinary tasks.
- I can complete and reopen a task and see today's Orbit update.
- I can scan a compact month of completion marks and open any day to review its tasks.
- I can open a project, complete subtasks, and place a subtask on Today without duplication.
- I can switch between week and month calendars.
- I can distinguish external events from task work blocks.
- I can select a task, then tap an open week slot to schedule it.
- I can move unfinished work to another day without recreating it.
- I can decide how early each Project starts appearing visually urgent.
- I can open a Task's actions from Today and move it to tomorrow, choose a date, or remove it from the displayed day.
- On my phone, Today shows a compact summary and a swipeable Tasks | Schedule pager; I can add a calendar event to my day as a Task in a list I choose, and it is marked as added.
- I can collapse Today's history calendar to just the current week on my phone, or expand it to the full month, without losing my place.

## V0 scope

- Responsive Today, Calendar Week, Calendar Month, Projects, and Project Detail.
- Local persistence (zustand `persist` + AsyncStorage): the app survives a reload and is genuinely usable day to day, still with no backend or account.
- The real system clock, not a fixed prototype date, drives "today" everywhere except the mock calendar events and the Day Mark study route.
- Task completion, project progress, add-to-Today, and mock scheduling.
- User-managed lists (the UI name for categories): add, rename, recolor (six distinct palette colors), reorder with up/down controls, and remove (archived, never hard-deleted, so history keeps its name and color). Lists are flat; the first-run defaults are Study, Career, Personal, and Health.
- Per-list inline add on Today: every active list is a section ending in a quiet "+ Add" row that opens an inline input for the displayed day; Enter adds and keeps the input open for rapid entry.
- Routines: one-tap templates for things done often. They appear as faint ghost rows at the end of a list on today and future days; tapping one creates a normal Task for that day (tapping its circle creates it already done). Nothing is auto-generated.
- Mobile web polish: inputs are 16px so iOS Safari does not zoom, and the phone bottom bar hides while typing.
- Creating a Project (title, category, deadline) and adding/deleting its steps from Project Detail; deleting a Project or a Task from Today or Project Detail, with confirmation.
- A Settings screen to load sample data or erase all data, with confirmation, plus an optional Account section: sign in with email and password to sync lists, projects, tasks, time blocks, and routines across devices (Supabase; owner request 2026-09-30). The app is fully usable signed out.
- Original Day Orbit on Today and Month.
- Compact completion-history calendar on Today with date navigation, collapsible to one week (default on phone) or expanded to the full month (default on desktop).
- Visual study route comparing Day Mark directions at 0, 25, 50, and 100 percent completion; Watercolor wash is the shipped default, chosen after that comparison.
- Desktop sidebar and mobile bottom navigation.

## V1 scope

- Account management beyond email/password (password reset, multiple profiles).
- Real calendars (Google, Apple, Outlook) shown read-only via secret iCal feeds (done 2026-10-01, see ARCHITECTURE "Calendar feeds"); Google OAuth and write-back through the provider boundary if needed later.
- Production-grade local persistence and conflict handling.
- Public beta quality, accessibility, onboarding, and empty states.

## Product boundary

Daymark is not intended to match the arbitrary list hierarchy of a general todo manager. It should make deadline-driven work persist, make unfinished work easy to reschedule, and use the calendar to answer “when will I work on this?” External calendar events remain context rather than automatically becoming Tasks.

## Non-goals

No OAuth calendar provider or calendar write-back (auth and item sync via Supabase are allowed since 2026-09-30, and read-only iCal feeds through a Supabase Edge Function since 2026-10-01), social features, teams, AI scheduling, notifications, analytics, streaks, or points in V0. Drag-and-drop is limited to ordering and moving Tasks within Today's lists (owner request 2026-09-30); Calendar scheduling remains select-then-tap.

## V0 acceptance criteria

- The app runs on Expo Web with no TypeScript errors.
- Today, Week, Month, Projects, and Project Detail are reachable on mobile and desktop.
- Completing a task updates its state and the Day Orbit.
- Selecting a date in Today's history calendar shows that date's tasks and completion mark.
- Project subtasks are shared Task records; adding one to Today does not duplicate it.
- A task can be scheduled by selecting it and tapping a week slot.
- External events never appear in Today unless separately represented as Tasks.
- Calendar layouts remain usable at phone, tablet, and desktop widths.
