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

## V0 scope

- Responsive Today, Calendar Week, Calendar Month, Projects, and Project Detail.
- Mock data and in-memory state.
- Task completion, project progress, add-to-Today, and mock scheduling.
- Contextual creation of a daily Task from Today with title and category.
- Original Day Orbit on Today and Month.
- Compact completion-history calendar on Today with date navigation.
- Visual study route comparing Day Mark directions at 0, 25, 50, and 100 percent completion.
- Desktop sidebar and mobile bottom navigation.

## V1 scope

- Account and multi-device sync.
- Google Calendar read/write through a provider boundary.
- Production-grade local persistence and conflict handling.
- Public beta quality, accessibility, onboarding, and empty states.

## Product boundary

Daymark is not intended to match the arbitrary list hierarchy of a general todo manager. It should make deadline-driven work persist, make unfinished work easy to reschedule, and use the calendar to answer “when will I work on this?” External calendar events remain context rather than automatically becoming Tasks.

## Non-goals

No authentication, backend, real provider integration, social features, teams, AI scheduling, notifications, analytics, streaks, points, or drag-and-drop in V0.

## V0 acceptance criteria

- The app runs on Expo Web with no TypeScript errors.
- Today, Week, Month, Projects, and Project Detail are reachable on mobile and desktop.
- Completing a task updates its state and the Day Orbit.
- Selecting a date in Today's history calendar shows that date's tasks and completion mark.
- Project subtasks are shared Task records; adding one to Today does not duplicate it.
- A task can be scheduled by selecting it and tapping a week slot.
- External events never appear in Today unless separately represented as Tasks.
- Calendar layouts remain usable at phone, tablet, and desktop widths.
