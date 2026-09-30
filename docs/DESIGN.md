# Daymark Design System

## Personality

Daymark is quiet, crisp, and personal: true black/white foundations, rounded but not bubbly forms, and color used with intent. It should feel personal rather than corporate, cute through proportion and motion rather than decorative warmth.

## Information hierarchy

- Today: date and concise weather context → Day Orbit and compact history calendar → upcoming deadlines → selected day's tasks grouped by list, each list ending in an inline "+ Add" row.
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

The Orbit is drawn as Watercolor wash, the shipped default after comparing four treatments on the `/daymark-lab` study route. Each category keeps its own ribbon-band arc in a softened `mark` tone, sized by share and filled by completion; a pale wash bleeds inward from each arc's own segment, so colors touch at their boundaries but never mix or overlap into a blended mass. The large Today mark breathes almost imperceptibly; calendar-size and history marks stay static for clarity and performance. Completion history is derived from `completedAt` only. The other three studies (Soft ribbon, Glass vessel, and the original baseline) remain on the lab route for reference and comparison, not as live alternatives.

## Deadline urgency

Deadline cards are neutral surfaces (`colors.paper` on `colors.line`) at every urgency step — the card itself never tints. Urgency is carried only by the `D−n` label color: muted gray for distant work, soft ink inside the attention window, full ink at D−3, and danger red at D−1/due-today. Urgency increases through label color alone, not surface tint, size, flashing, or an all-red screen.

Each Project can choose when the label starts to darken: 3, 7, 14, or 30 days before its deadline. This preference is shown in Project Detail ("Emphasize this deadline from") and updates the Today preview immediately.

## Task interaction

Task rows use a tactile circular check, title, optional project context, and a quiet schedule action. On completion: check scales and fills, text softens, and the Orbit updates in 300–450ms. The persistent Day Mark motion is slow and ambient, never celebratory. No strike-through or celebration effects.

## Calendar interaction

Week view prioritizes geometry: fixed time gutter, clear day columns, faint half-hour rules, and tinted blocks. External events use a neutral edge; task blocks use category color and a small task glyph. Scheduling is explicit: press Schedule, select one Task, then tap a free slot.

Month cells show date, a small Day Orbit, up to three compact lines, then a `+N` disclosure. Deadlines use a small flag treatment, not an alarm-red card.

Today also includes a quieter completion-history calendar. Its cells favor the Day Orbit over event density; selecting a date moves the Today context to that day's tasks and completion record. This is navigation and reflection, not a second scheduling calendar. It defaults to collapsed (just the Sun–Sat week containing the selected date) on phone, and expanded (the full month) on desktop, where it sits beside the Day Mark card; a quiet chevron toggle in its header switches between them, and the prev/next arrows step by week or month to match the current state.

Unfinished Today rows expose a compact `…` menu for moving to the next day, choosing a day, or removing the Task from that day. The Task remains in its Project. A separate Day Mark study route compares visual treatments at four completion levels; it is reachable from the Today mark heading during V0 design review.

A Today time rail and per-Task "Reserve time" tray were tried as a V0 interaction study and removed after review — the interaction didn't resonate with the product owner. Today scheduling goes through the Calendar tab's select-then-tap-slot flow; a different Today-native scheduling interaction may be explored later. The header's weather line stays labeled "sample weather" so it reads honestly as mock data.

## Responsive rules

- Phone: one-column Today, three visible days in Week with horizontal paging implied, compact Month labels, bottom nav.
- Tablet: Day Orbit and history calendar may sit side by side; seven-day Week; side rail where space allows.
- Desktop: persistent 80px rail, Today content capped around 1040px with the Day Orbit and history calendar paired above the work list; full seven-day Calendar.

## Components

`AppShell`, `Navigation`, `ScreenHeader`, `DeadlineStrip`, `TaskSection`, `TaskRow`, `CheckControl`, `DayOrbit`, `HistoryCalendar`, `ProjectProgress`, `WeekGrid`, `CalendarBlock`, `MonthGrid`, `SchedulePanel`, and `QuickAdd`.

## Lists, inline add, routines

Each list section on Today ends with a muted "+ Add" row aligned with task titles, its circle slot holding a small plus. Tapping it becomes an inline input (font 16, no border box) with an empty check-circle in the list's colour; while open, a tray below shows routine chips soft-tinted in the list colour (a routine already added that day is a muted, disabled "added" chip) and a "Save as routine" text action. The opened input scrolls into comfortable view above the keyboard. The List management screen mirrors Settings: spacious cards with colour dot (swatch picker), editable name, up/down controls, routines with × and a quiet Remove. On phones the bottom bar hides while typing.
