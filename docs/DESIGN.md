# Design System — Daymark

## Personality

Calm, warm, editorial — closer to a well-typeset paper planner than a SaaS dashboard. Confident use of whitespace, restrained color (color is meaningful — category identity — never decorative), almost no shadows or borders, no gradients, no glassmorphism, very few icons (checkbox, chevron, plus, avatar — that's close to the full icon vocabulary). Nothing celebrates or gamifies; completion is communicated through fill and fade, never confetti or badges.

## Hierarchy

1. **Today is home.** It answers "what do I need to do" before anything else.
2. **Calendar is second** — where things happen in time.
3. **Projects is third** — the slower-moving, deadline-driven layer.
4. **Settings is an escape hatch**, not a primary destination — reached via a header avatar/menu, never a tab.

Within a screen: the most time-sensitive information (today's date, urgent deadlines) sits highest and largest; category-grouped content follows; secondary chrome (nav, segmented controls) stays visually quiet.

## Navigation

- **Phone (<600px):** bottom tab bar — Today, Calendar, Projects. Settings via header avatar on every screen.
- **Tablet (600–899px) and Desktop (≥900px):** compact left rail replacing the bottom tabs, same three destinations, icon + label.
- **Desktop Today (≥900px):** two-column layout — tasks/CategorySections on the left (wider), Upcoming deadlines + Day Mark card on the right (narrower, sticky).
- Calendar's Week/Month toggle is a segmented control in the screen header, not separate nav destinations.
- Tapping a month-day cell switches to Week view centered on that date (V0 behavior, no separate "Day" view).

## Typography

- System font stack (SF Pro on iOS/web-Apple, Inter fallback elsewhere via web font stack `-apple-system, Inter, system-ui`).
- Scale (px): **12** (micro/meta), **13** (secondary/labels), **15** (body/task text), **17** (section headers/screen subheads), **22** (screen titles), **28** (Today's big date).
- Weight: headings semibold (600), body regular (400), emphasis medium (500) — never bold(700)+ except the Today date.
- Completed task text: fades to 55% ink opacity. No strikethrough — fading reads calmer and avoids a "crossed off, failed-then-fixed" visual.

## Spacing & shape

- 4pt base unit. Common values: 8, 12, 16, 24, 32.
- Radii: 8px (blocks — event chips, time blocks, buttons), 12px (sheets, section containers), pill (999px, for chips/segmented controls/category tags).
- Shadows: essentially none. One soft, low-opacity elevation reserved for the `ScheduleTaskSheet` (bottom sheet) — everything else is separated by whitespace and hairlines, not shadow.
- Borders: hairline (1px, `hairline` color token) only where two dense regions truly need separation (e.g., all-day row vs. timeline in Week view). No card borders around task rows.

## Color

Light mode only in V0 (dark tokens exist in `theme/tokens.ts` as stubs for V1, unused).

- Background: `#FBFAF8` (warm off-white)
- Surface: `#FFFFFF`
- Ink (primary text): `#1C1B1A`
- Ink secondary: `#6E6B66`
- Hairline: `#ECE9E4`

Category colors (`solid` / `soft` tint / `text`), stable and never reused for anything else:
- **Study** — blue `#5B8DEF` / soft `#E7EDFC` / text `#3A5FC4`
- **Career** — orange `#F0985A` / soft `#FCEBDD` / text `#C46A2E`
- **Personal** — green `#5FBF8A` / soft `#E4F5EC` / text `#3C8F63`
- **Routine** — pink `#E88BB0` / soft `#FBE9F0` / text `#C15E86`
- Reserve slots (for future user-added categories, not used in V0 mock data): violet `#8B7FE8`, teal `#4FB8B0`, yellow `#E0B84A`.

Deadline urgency tiers (text-only color, never a filled/alarming background):
- D-14+ → secondary grey (`ink secondary`)
- D-7 → ink (primary text color, i.e. "pay attention")
- D-3 → warm amber `#D98A2B`
- D-1 / due today / overdue → coral `#D9534F`

Event/block states in Calendar:
- External `CalendarEvent` = soft category-neutral tint (per source calendar color) + solid left rail.
- `TimeBlock` (task scheduled onto calendar) = category soft tint + **dashed** rounded rail + a small task-dot glyph, so it reads as "task time," distinct from a real external event at a glance.
- Completed `TimeBlock` = desaturated (reduced opacity/saturation of its fill).

## The Day Mark system

The Day Mark is a **segmented ring**, never a single blended shape and never one tiny arc per individual task.

- **Construction:** for a given date, gather all Tasks relevant to that date (Today: tasks with `scheduledDate === date`; history/month cells: tasks with `completedAt` on that date — see ARCHITECTURE.md "Day Mark data rule"), group by category. The ring circumference is divided into one **segment per category present**, sized proportionally to that category's share of tasks that day (minimum arc width enforced so a 1-task category is still visible at small sizes). Each segment is drawn as a soft-tint **track** (the category's `soft` color) with a solid-color **fill** (`solid` color) sweeping in proportional to that category's done/total ratio. Small fixed-angle gaps separate segments — colors never touch or blend.
- **Sizes:** 20–28px diameter in calendar cells (Month grid, Week all-day summaries), 64px in the Today header. Stroke width scales with diameter (thin at 20px, ~6px at 64px) but segment/gap geometry stays proportionally consistent so category identity remains readable at the smallest size even with 10+ tasks across categories.
- **Empty state:** no tasks that day → a plain hairline-colored ring (full circle, uncolored) — reads as neutral/no-data, not "you failed."
- **Full state:** every category segment fully filled → ring reads as visually "closed," each segment shown with a soft inner fill wash behind the same-color stroke for a subtle sense of completeness (no checkmark glyph, no burst/celebration effect).
- **Never:** overlapping/blended petal shapes (rejected explicitly, see REFERENCE_ANALYSIS.md), single-color rings that hide category, or one micro-arc per individual task (illegible past ~4 tasks and defeats the category-oriented design goal).

## Task interaction

- Checkbox is the primary, large tap target on the left of a `TaskRow`. Tapping toggles completion.
- On complete: checkbox scale animates 1 → 1.15 → 1 while filling with the category solid color (200–350ms ease-out); row text fades to 55% ink opacity; the row then re-sorts to the bottom of its `CategorySection` (completed tasks sink, incomplete stay in original order at top).
- Uncompleting reverses the animation and `completedAt` is cleared.
- A subtask viewed inside Project Detail has a small "Today" pill/toggle that sets or clears `scheduledDate` — this is the *only* way a subtask enters/leaves the Today list; it is never duplicated as a second Task.
- Quick-add in Today is a minimal always-visible inline text input at the end of the relevant `CategorySection` (or a single add row if no category chosen) — press enter/submit to create a Task with `scheduledDate = today`.

## Calendar interaction

- **V0 scheduling flow (mandatory, no drag-and-drop):** user taps "Schedule a task" → `ScheduleTaskSheet` opens listing unscheduled Today/Project tasks → user selects one → sheet dismisses, grid enters a "placement" mode (visually indicated, e.g. header hint + highighted available slot on hover/press) → user taps an open slot in the week grid → taps snap to the nearest 30-minute increment → a `TimeBlock` is created (default 1-hour duration) and immediately rendered.
- No dragging, resizing-by-drag, or long-press-to-move exists anywhere in V0. (Reserved for V1 — see ROADMAP.md.)
- Tapping an existing TimeBlock or CalendarEvent in V0 has no detail modal (out of scope) — visual only.
- Month → Week: tapping a day cell switches the Calendar screen to Week view, scrolled/centered on that date.

## Responsive rules

- Breakpoints: phone `<600px`, tablet `600–899px`, desktop `≥900px` (see `src/hooks/useResponsive.ts`).
- Phone: bottom tabs, single-column Today, Week view shows a 3-day horizontally-pageable window.
- Tablet: left rail, single-column Today (wider), Week view shows full 7 days.
- Desktop: left rail, two-column Today, Week view shows full 7 days, more breathing room (wider gutters, larger max-width content column so text lines don't over-stretch).
- Nothing reflows abruptly — column/tab-bar swap happens at the breakpoint; internal spacing scales smoothly via the same token scale at all sizes (no separate "mobile spacing scale").

## Animation principles

- Duration 200–350ms, easing ease-out (fast start, settle at end) for all micro-interactions — feels responsive, not slow.
- Checkbox complete/uncomplete: scale pulse + color fill, driven by `react-native-reanimated` shared values.
- Row completion: text opacity fade + list re-sort (re-sort can be an instant layout change following the fade, not itself animated with spring physics, to avoid jitter).
- Day Mark segment fill: animates its sweep (0 → target fraction) via reanimated on data change, not just on mount.
- No confetti, no bounce/spring overshoot beyond the checkbox's single 1.15 pulse, no screen transitions beyond the platform/router default.

## Component system

Small, single-purpose, composable — no monolithic screen-specific components duplicating logic. Core set (see ARCHITECTURE.md for file layout): `Checkbox`, `TaskRow`, `CategorySection`, `DayMark`, `DeadlinePreview`, `ProjectProgress`, `CalendarEventBlock`, `TaskTimeBlock`, `CalendarDayCell`, `MonthGrid`, `WeekTimeGrid`, `ScheduleTaskSheet`, `QuickAdd`, `ScreenHeader`, `Nav`. Every component consumes theme tokens (`src/theme`) — no inline magic numbers where a token exists, no ad hoc colors.
