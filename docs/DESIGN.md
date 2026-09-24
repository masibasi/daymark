# Daymark Design System

## Personality

Daymark is quiet, crisp, and personal: true black/white foundations, rounded but not bubbly forms, and color used with intent. It should feel personal rather than corporate, cute through proportion and motion rather than decorative warmth.

## Information hierarchy

- Today: date and greeting → Day Orbit and compact history calendar → upcoming deadlines → selected day's category-grouped tasks.
- Week: period controls → day headers/all-day row → hour grid and blocks → scheduling affordance.
- Month: period controls → seven-column information grid with events, deadlines, and Day Orbits.
- Project Detail: identity/deadline → progress → subtasks.

## Navigation

Today, Calendar, and Projects are primary. Mobile uses a bottom bar. Tablet and desktop use a compact left rail. Settings lives behind the small profile control.

## Typography

Use the platform sans-serif. Display 34/40 semibold; title 26/32 semibold; section 17/22 semibold; body 15/21 regular; meta 12/16 medium. Prefer sentence case and short labels.

## Spacing and shape

Base spacing steps: 4, 8, 12, 16, 24, 32, 48. Task rows are mostly borderless. Radii: 10 for small controls, 16 for grouped surfaces, 24 for feature surfaces. Shadows are rare and reserved for floating overlays.

## Color

- Light canvas: white with neutral gray surfaces.
- Dark canvas: near-black with charcoal surfaces.
- Ink reverses cleanly between near-black and near-white.
- Study: clear blue.
- Career: vivid rose.
- Personal: fresh green.
- Routine: violet.

The app follows the device color scheme. Theme colors must remain neutral; category color provides the personality. Do not reintroduce beige, cream, brown, or an overall warm cast.

Category colors appear in checks, small rails, project accents, TimeBlocks, and Day Orbit segments. External events use cool neutral blue-gray.

## Day Orbit

The Orbit is a thin ring with one stable segment per category that has work for the represented day. Segment length reflects that category's share of the day's work. A pale track shows the full segment and a saturated overlay shows category completion. Completion history is derived from `completedAt` only. At small sizes the mark may omit gaps but must keep category colors distinct.

## Task interaction

Task rows use a tactile circular check, title, optional project context, and a quiet schedule action. On completion: check scales and fills, text softens, and the Orbit updates in 300–450ms. No strike-through or celebration effects.

## Calendar interaction

Week view prioritizes geometry: fixed time gutter, clear day columns, faint half-hour rules, and tinted blocks. External events use a neutral edge; task blocks use category color and a small task glyph. Scheduling is explicit: press Schedule, select one Task, then tap a free slot.

Month cells show date, a small Day Orbit, up to three compact lines, then a `+N` disclosure. Deadlines use a small flag treatment, not an alarm-red card.

Today also includes a quieter completion-history calendar. Its cells favor the Day Orbit over event density; selecting a date moves the Today context to that day's tasks and completion record. This is navigation and reflection, not a second scheduling calendar.

## Responsive rules

- Phone: one-column Today, three visible days in Week with horizontal paging implied, compact Month labels, bottom nav.
- Tablet: Day Orbit and history calendar may sit side by side; seven-day Week; side rail where space allows.
- Desktop: persistent 80px rail, Today content capped around 1040px with the Day Orbit and history calendar paired above the work list; full seven-day Calendar.

## Components

`AppShell`, `Navigation`, `ScreenHeader`, `DeadlineStrip`, `TaskSection`, `TaskRow`, `CheckControl`, `DayOrbit`, `HistoryCalendar`, `ProjectProgress`, `WeekGrid`, `CalendarBlock`, `MonthGrid`, `SchedulePanel`, and `QuickAdd`.
