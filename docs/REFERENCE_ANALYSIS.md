# Reference Analysis

Two reference apps were studied: **Apple Calendar** (4 screenshots: day, week, month, new-event) and **TodoMate** (12 screenshots: home/list views, add item, lists, colors, menu, routines, visibility, month view). This document records what Daymark takes from each, what it explicitly rejects, and why — grounding the decisions in `DECISIONS.md` and the visual system in `DESIGN.md`.

## Apple Calendar

### Take
- **Month grid**: strict 6 rows × 7 columns, each day cell lists events as compact lines — a thin color bar (`▎`) + title, truncating to `+N more` when a day is dense (real screenshot: Sep 10, 2026 shows 5 lines then "+5 more"). Out-of-month days are dimmed; today gets a filled circle around the day number.
- **Week view**: hour gutter on the left, 7 day columns, all-day row separated above the timeline by a hairline, events rendered as tinted rounded blocks with a solid left rail, title, and time range inside. A red current-time line with a small time chip crosses the grid at the true "now" position. Faint alternating hour lines keep the grid readable without a heavy table look.
- **Header pattern**: big month/date title top-left, Day/Week/Month/Year segmented control top-center, prev/Today/next controls top-right. "Today" always returns to the current date without changing zoom level.
- **Density handling**: real class schedules (CSCI 599 recurring blocks, recruiting events, meetings) show that a grad student's week is busy — many short blocks colored by calendar, several same-day overlaps (e.g., two "순장모임" blocks side-by-side on the same evening). Overlap layout (blocks placed in side-by-side columns within a day) is essential, not decorative.

### Leave out
- iOS system chrome (status bar, nav bar materials), Apple's exact blue/red hues (Daymark uses its own warm neutral + category palette instead), invitee/location/video-call fields in event detail, Year view, the calendar-list sidebar (deferred — V0 has no source-calendar switcher), and holiday/subscribed-calendar clutter (Rosh Hashanah, 추석, etc. — Daymark's mock data uses a curated, readable event set instead of a real messy calendar feed).

## TodoMate

### Take
- **Category-colored section headers** with tasks listed flat beneath — no per-task card chrome, just a checkbox, label, and generous row height. This directly informs `CategorySection` + `TaskRow`.
- **Very generous vertical rhythm** between sections and rows — nothing feels cramped even with many tasks on screen.
- **Soft pastel category palette** — each list/category gets one identifying color used consistently (section pill background + small accents), never mixed within a row.
- **Tap-target checkbox on the left**, add/expand affordance on the right — a familiar, low-friction interaction shape Daymark reuses for `TaskRow`.
- **Completion marks on a mini month calendar** — each day in TodoMate's week/month strip shows a small colored "flower" mark summarizing that day's completions. This is the direct ancestor of Daymark's **Day Mark**: a compact, at-a-glance per-day completion summary rendered small enough to sit inside a calendar cell or a week strip.
- **Grey "empty" marks read as neutral, not failing** — an incomplete or no-data day is a calm hairline/grey shape, never a red or alarming state. Daymark's Day Mark empty state (hairline ring) follows this directly.
- **Minimal top chrome** — no heavy app bar, just a profile row and the current view label.

### Explicitly reject
- **The four-leaf "flower" blob mark itself.** TodoMate's mark blends up to 4 category colors into one overlapping four-petal shape (visible in `todomate-app.PNG`, `todomate-app2.PNG`: pink/yellow/blue/green petals fused together). At a glance it reads as "some activity happened" but not *which* category or *how complete*. Daymark's Day Mark is a **segmented ring** instead — one arc per category, sized by that category's share of the day and filled by that category's completion — so category identity and completion fraction are both legible without color-blending.
- **Overlapping/blended color petals in general** — any place two category colors would visually merge is rejected; Daymark keeps hard edges and small gaps between segments.
- **The entire social layer**: follower avatar rail across the top (`todomate-app.PNG` top strip of profile bubbles), per-list visibility settings ("Selected Followers", `todomate-visibility.PNG`/`todomate-color.PNG`), a feed/explore tab, a "send" tab. Daymark is single-player; none of this exists.
- **Black-pill "current user" chip** in the avatar rail — an artifact of the social rail, dropped along with it.
- **Bottom nav with 5 social-oriented tabs** (home, explore/compass, notifications/bell, send, profile) — Daymark's nav is task/calendar/project oriented (see ARCHITECTURE navigation), not social.
- **Routines/reminders UI complexity** (`todomate-new-routine.PNG`, `todomate-routine.PNG` — recurrence rule builders, list-level routine config) — V0 models recurrence as a single boolean `recurrence: 'daily'` flag on a Task, not a rule engine.

## Differentiators (Daymark vs. both references)

- **Today is the home screen**, not a calendar — neither reference leads with a "today" dashboard combining tasks + urgency + a completion mark in one view.
- **Upcoming deadlines strip with D-day countdowns** surfaces project urgency without opening a calendar.
- **Projects as a first-class, persistent, separate concept** from daily todos, with subtasks and derived progress — TodoMate's "lists" are flat todo containers, not deadline-bearing projects.
- **TimeBlocks as explicit task-scheduling** — placing a *task* onto the calendar (vs. Apple Calendar's generic events, which know nothing about tasks).
- **The segmented Day Mark itself** is original: not TodoMate's blended flower, not Apple's plain colored dot.
- **External calendar events are shown but never auto-converted into Tasks** — Daymark keeps "things on my calendar" and "things I need to do" as related but distinct, unlike either reference which conflates or ignores one side.
