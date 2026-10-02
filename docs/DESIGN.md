# Daymark Design System

## Personality

Daymark is quiet, crisp, and personal: true black/white foundations, rounded but not bubbly forms, and color used with intent. It should feel personal rather than corporate, cute through proportion and motion rather than decorative warmth.

## Information hierarchy

- Today: date and concise weather context → Day Orbit and compact history calendar → the folder strip (pinned folders and every folder with a deadline; tap a card to expand its next steps in a panel below the strip; each step has a ☀︎ Today toggle; a quiet "All folders" link ends the strip) → selected day's tasks grouped by list, each list ending in an inline "+ Add" row.
- Week: period controls → day headers/all-day row → hour grid and blocks (no scheduling affordance; events are tappable to import).
- Month: period controls → seven-column information grid with events, deadlines, and Day Orbits.
- Folder Detail: editable title, list dot, deadline row ("No deadline · Add" / "Due Sun, Oct 5 · Change · Remove"), pin toggle → progress → steps (open first, done below) → Archive / Delete.

## Navigation

Today, Calendar, and Folders (code: Project; icon `folder-outline`) are primary. Mobile uses a bottom bar of three equal-width tabs (icon and label centred, active shown by ink colour and a bolder label). Tablet and desktop use a compact left rail. Settings lives behind the small profile control.

## Typography

Task titles use `type.task` (16/22, semibold) everywhere: display row, inline title edit, inline add input, and ghost routine rows share identical size, weight, line height, padding and color, so entering or leaving edit mode never shifts the text (16px also stops iOS from zooming on focus). Task rows are a fixed 52px tall in every state.


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

Lists choose from twelve distinct hues (`categoryPalette`): blue, rose, green, violet, amber, teal, orange, lime, yellow, magenta, brown, graphite. Each has solid, soft, ink and Day Mark `mark` tones for light and dark; marks stay clearly separable at the 22px history size. Light fills (yellow, lime) use dark ink for check marks. The first six keys are the original defaults, so stored colorKeys stay valid. Brown and graphite are list colors only; the theme itself stays neutral.

List colors go beyond the twelve presets. The picker (`ListColorPicker`, in the Today quick editor and on Lists) has two tabs. Presets: 12 hues (rose, peach, amber, yellow, lime, green, teal, sky, blue, indigo, lavender, pink) x 3 tones (soft / mid / deep, in `src/theme/presetColors.ts`; the mid tones for rose, peach, lavender and blue are the owner's icon colors), a row of neutrals (warm grey, graphite, brown) and the twelve classic keys. Custom: Hue, Saturation and Lightness sliders, clamped to saturation 25-95% and lightness 38-78% so marks and ink stay legible, with live light and dark previews (Day Mark, check circles, list name) and a muted note when the color is within a small Lab distance (dE < 12) of another active list. A custom color is stored as `Category.color` (hex); the soft, ink and mark tones are derived from it (`paletteFromHex`: soft = pale tint / deep tint, ink pushed until it reads 4.5:1, mark = lifted and softened solid), while classic keys keep their hand-tuned tokens. Colors are never blended; each list keeps one color.

The app follows the device color scheme. Theme colors must remain neutral; category color provides the personality. Do not reintroduce beige, cream, brown, or an overall warm cast.

Category colors appear in checks, small rails, project accents, TimeBlocks, and Day Orbit segments. External events use cool neutral blue-gray.

## Day Orbit

The Orbit's default style is Doodle (owner decision 2026-10-02, matching the app icon); Watercolor wash was the first shipped default after comparing treatments on the `/daymark-lab` study route. Each category keeps its own ribbon-band arc in a softened `mark` tone, sized by share and filled by completion; a pale wash bleeds inward from each arc's own segment, so colors touch at their boundaries but never mix or overlap into a blended mass. The large Today mark breathes almost imperceptibly; calendar-size and history marks stay static for clarity and performance. Completion history is derived from `completedAt` only. The other studies Soft ribbon, Glass vessel, and Doodle (a slightly squashed, hand-drawn ring echoing the app icon: organic polar-curve loop, thicker stroke, round caps only at the ends of the filled run, flat joins between colors, closed seamless loop when complete, soft blurred glow on the large web mark only) are live alternatives chosen in Settings → Appearance. The original baseline (Classic) was retired from Settings (stored `current` maps to Watercolor wash); its rendering stays only for the `/daymark-lab` comparison study.

## Appearance (Settings)

A section after Calendars titled Appearance, with a row of four option tiles (Watercolor wash, Soft ribbon, Glass vessel, Doodle). Each tile shows the style name, a 72px live Day Mark in a realistic partly-done day, and a 22px calendar-size sample. The selected tile has an accent ring and a small check, and only its preview breathes (not under reduce-motion). Tapping selects immediately; the choice is the persisted, synced `dayMarkVariant` preference and applies to Today and every history/week mark. A quiet line reads "More themes coming later." No paywall UI.

## Folders tab

A single spacious column (max 760px). Sections: "Pinned" (if any), "Folders" (dated by deadline, then undated by manual order), and a collapsed "Archive (n)" disclosure with Restore and Delete per row. A card has the list-colour rail and dot, a deadline label ("Due Oct 3 · D−2", "Overdue · 4 days") or "No deadline", a title (pin glyph before it when pinned), and a progress bar with "3 of 7" ("Empty" for a folder without steps). The card `…` menu: Pin/Unpin, Move up/down (pinned and undated groups), Archive, Delete. Pinned and undated folders reorder by drag (mouse: lifts after ~120 ms or 4 px of movement; touch: ~300 ms long-press; `cursor: grab` on web); dated folders order by deadline and do not drag. Only the card body opens the folder; the `…` menu and the completion row never do.

## Folder completion prompt

A folder with a deadline whose steps are all done (at least one step) shows one calm inline row, in the Today panel and on its Folders card: "All steps done · Archive · Keep". No modal, no celebration. Archive moves it to the Archive section with an Undo toast; Keep stores `completionAcknowledged` so it does not ask again until a new step is added. Folders without a deadline never prompt; with nothing open they show "Nothing left · Add" in the panel and "Empty" on the card when they have no steps.

## Source label on task rows

A task that belongs to a folder shows, under its title, a muted 12px meta line: a tiny `folder-outline` icon plus the folder name.

## Carry-over banner and past days

On the real today, a slim inline note at the top of the task area says "2 unfinished from yesterday" (or "from Tue") for the most recent past day (within 7 days) that has incomplete tasks, plain and folder tasks alike. Actions: "Bring to today", "Back to folder" (only when some are folder tasks; clears their `scheduledDate`), and "Leave" (dismisses that day). Calm surface, no red. A past day lists tasks that were left undone on it and have since moved as muted, inert rows ("→ moved to Oct 3", "→ back in <folder>"); they count as planned, not completed, in that day's mark and "x of y".

## Deadline urgency

Folder cards with a deadline are neutral surfaces (`colors.paper` on `colors.line`) at every urgency step — the card itself never tints. Urgency is carried only by the `D−n` label color: muted gray for distant work, soft ink inside the attention window, full ink at D−3, and danger red at D−1/due-today. Urgency increases through label color alone, not surface tint, size, flashing, or an all-red screen.

Each Project can choose when the label starts to darken: 3, 7, 14, or 30 days before its deadline. This preference is shown in Folder Detail ("Emphasize this deadline from", only when the folder has a deadline) and updates the Today preview immediately. A folder without a deadline shows no urgency label at all.

## Task interaction

Task rows use a tactile circular check, title, optional project context, and a quiet schedule action. On completion: check scales and fills, text softens, and the Orbit updates in 300–450ms. The persistent Day Mark motion is slow and ambient, never celebratory. No strike-through or celebration effects.

## Motion

Calm, ease-out, never celebratory (no confetti, bounce, or badges). Shared tokens live in `motion` (`src/theme/tokens.ts`): press 110, quick 160, base 260, exit 200, crossfade 200, page 300, ring 650 (first draw 800), wash 700 after a 250 delay, settle 900; easing `easeOut` = bezier(0.22, 1, 0.36, 1); spring friction 9 / tension 180; press scale 0.97; lift 1.02.

- Day Mark (large Today mark only; calendar marks never animate): arcs tween from old to new length (contiguous, growth draws forward, uncompleting retracts), draw in from 0 on mount, watercolor bands fade in after the arc settles, one faint ripple (dominant mark colour, <= 0.25 opacity, +12% radius, 900 ms) when the day becomes fully complete.
- Check control: spring settle 0.86 -> 1, fill and tick ease in, title colour eases to muted. Reverses on uncomplete.
- Task rows fade and rise 6 px on entering (add, routine, undo, Add to Today) and collapse height + fade before deletion or move-away; the store action runs after the exit. Ghost routines crossfade dashed -> solid and muted -> ink before becoming a task.
- Undo toast slides 12 px and fades. Phone summary expands with measured height + opacity and a rotating chevron. Tasks | Schedule pages follow the finger, snap with ease-out, and the underline slides between labels. Changing the day crossfades the list.
- Drag: the lifted row springs to 1.02 with a soft shadow and settles with a spring; other rows slide to open a gap at the insertion point (and close the hole left behind), with a thin insertion line.
- Pressables on primary buttons, chips and nav items scale to 0.97.

Reduce motion (OS setting via `AccessibilityInfo`, or `prefers-reduced-motion` on web): no tweens, ripple, slides, lifts or springs; state changes are instant, with only short fades for deletion and the day crossfade.

## Calendar interaction

Week view prioritizes geometry: fixed time gutter, clear day columns, faint half-hour rules, and tinted blocks. External events use a neutral edge; task blocks use category color and a small task glyph. The Calendar tab is for viewing and importing: tapping an event (week block, all-day chip, month line) opens a bottom sheet on phones (a centred card on desktop) with the event title/time and the same "Add to <Today | Tue, Oct 6>" pill and "or in" chips as Today's Schedule, adding a Task for the event's date. Existing TimeBlocks are legacy: tapping one shows its task, time and a quiet "Remove". There is no way to create TimeBlocks for now.

Month cells show date, a small Day Orbit, up to three compact lines, then a `+N` disclosure. Deadlines use a small flag treatment, not an alarm-red card.

List headers on Today have two separate targets. Tapping the dot and name opens the quick editor (color, rename, "More list settings"). The chevron at the right is its own button ("Collapse <List>" / "Expand <List>") that folds the whole list body (tasks, missed rows, ghost routines, "+ Add") with the `Collapsible` height/opacity animation and a rotating chevron (instant under reduce-motion). A collapsed header keeps its done/total count and adds a muted "· n left". Collapsed list ids persist per device in the store (`collapsedListIds`, not synced) and apply to every displayed day; collapsing closes that list's open add input, and opening the editor never changes collapse state. A collapsed list header is still a drag target: dropping a Task there appends it to that list without expanding it.

Today also includes a quieter completion-history calendar. Its cells favor the Day Orbit over event density; selecting a date moves the Today context to that day's tasks and completion record. This is navigation and reflection, not a second scheduling calendar. It defaults to collapsed (just the Sun–Sat week containing the selected date) on phone, and expanded (the full month) on desktop, where it sits beside the Day Mark card; a quiet chevron toggle in its header switches between them, and the prev/next arrows step by week or month to match the current state.

Unfinished Today rows expose a compact `…` menu for moving to the next day, choosing a day, or removing the Task from that day. The Task remains in its Project. A separate Day Mark study route compares visual treatments at four completion levels; it is reachable from the Today mark heading during V0 design review.

A Today time rail and per-Task "Reserve time" tray were tried as a V0 interaction study and removed after review — the interaction didn't resonate with the product owner. Time-blocking is paused (see `docs/DECISIONS.md`). The header's weather line stays labeled "sample weather" so it reads honestly as mock data.

## Today on phone (width < 760)

Order: date header, one compact summary row, compact Upcoming strip, then a two-page "Tasks | Schedule" pager.

- Summary row (collapsed by default, state kept for the session): small 44px Day Mark, "4 of 10", and this week's seven 22px day marks (tap one to change the displayed day). Tapping the left side or the chevron expands to the full Day Mark card plus history calendar; tap again to collapse.
- Upcoming deadline cards are compact: one-line title with `D−n`, then a progress bar, so tasks appear on the first screen.
- Tasks | Schedule is a quiet underlined segmented header (Schedule shows the day's event count; Tasks shows "n left"). Tap to switch, or swipe horizontally. The swipe only claims clearly horizontal gestures (|dx| > 24 and > 2·|dy|), so vertical scroll and long-press row drag are untouched. Only the active page is mounted and the main ScrollView is the only vertical scroller.
- Schedule page: the displayed day's CalendarEvents, all-day first, then timed events (time range under the title) with a neutral event rail (events are never list-colored). Empty state: "No events on this day." with a quiet "Connect a calendar in Settings" link.
- Tapping an event expands it inline: an "Add to Today" pill for the default list (a list named Schedule/Calendar, else the list last used for an event import; with neither, the pill reads "Schedule (new)" and creates an active Schedule list in the next free colour as it adds) and "or in" chips for the other lists; one tap adds. Once added the row reads "Added" and is disabled.

From 760px up (tablet and desktop) Today uses the column layout: a context column on the left (300px below 1024, 360px above) and the tasks column on the right, with a compact Schedule block at the top of the tasks column (no third column).

## Today on desktop (width ≥ 1024)

Today splits into independent, viewport-height columns inside a layout capped at 1440px and centred, so tasks are on screen without scrolling. Each column is its own ScrollView.

- Left column (360px): date header with the weather line; the Day Mark area; then Folders as a vertical list of compact cards (same order, drop-target ring and "All folders" link as the strip). Tapping a card opens its panel inline directly under that card (one open at a time).
- Day Mark area: collapsible like the phone summary. Collapsed is the compact row (44px mark, "x of y", this week's seven marks, chevron); expanded is the Day Mark card (120px mark beside "x of y", copy and legend) plus the history calendar, which opens as a full month at viewport height ≥ 900px and as the selected week below that. The choice persists per device (`dayMarkCollapsedDesktop`, not synced), default expanded; animation uses the `Collapsible` and chevron motion tokens and is instant under reduce-motion.
- Main column (flex, max 720px): carry-over banner, "Today's tasks" header with "n left", and the list sections.
- Schedule block (top of the tasks column, above the carry-over note and "Today's tasks"): a "Schedule" header with a chevron that collapses the block to one line ("Schedule · 3 events"; device-local `scheduleCollapsed`, not synced). Rows are one line each: time (or "All day") and title beside a neutral event rail. At most 3 rows show; a quiet "+N more" expands the rest. Tapping a row opens the same Add-to-day sheet as the Calendar tab. Empty day: "No events · Connect a calendar" (link only when no feed is enabled), else "No events today".
- Drag and drop uses the main column's ScrollView for edge auto-scroll and list geometry; folder cards in the left column are measured in window coordinates (`foldersFixed`), since that column does not scroll with the tasks.

## Responsive rules

- Phone: one-column Today, three visible days in Week with horizontal paging implied, compact Month labels, bottom nav.
- Tablet: Day Orbit and history calendar may sit side by side; seven-day Week; side rail where space allows.
- Desktop: persistent rail; at ≥ 1024px Today is two columns (context left, schedule + tasks main), capped at 1440px, each scrolling independently; full seven-day Calendar.

## Components

`AppShell`, `Navigation`, `ScreenHeader`, `DeadlineStrip`, `TaskSection`, `TaskRow`, `CheckControl`, `DayOrbit`, `HistoryCalendar`, `ProjectProgress`, `WeekGrid`, `CalendarBlock`, `MonthGrid`, `EventActions`, `EventSheet`, and `QuickAdd`.

## Lists, inline add, routines

Each list section on Today ends with a muted "+ Add" row aligned with task titles, its circle slot holding a small plus. Tapping it becomes an inline input (font 16, no border box) with an empty check-circle in the list's colour; while open, a "Save as routine" text action sits below. Routines not yet added for a today/future day appear above the "+ Add" row as ghost rows: same height as a task, dashed faint circle in the list colour, muted title, a tiny repeat icon, and a `…` with "Remove routine". Tap the row to add it, tap the circle to add it done. The opened input scrolls into comfortable view above the keyboard. The List management screen mirrors Settings: spacious cards with colour dot (swatch picker), editable name, up/down controls, routines with × and a quiet Remove. On phones the bottom bar hides while typing.


## Drag and drop

On Today, long-press (~300 ms; with a mouse, hold ~120 ms or move 4 px) a task row (not its circle or `…`) to lift it: slight 1.02 scale, faint ink shadow, paper background, following the pointer vertically. A 2px line in the target list's colour shows the drop position, including empty lists (drop on the list body or its "+ Add" area appends). Scrolling is locked while dragging and auto-scrolls near the viewport's top/bottom edges. Completed and project tasks stay in their list: an invalid drop snaps back with a toast. Ghost routine rows and "+ Add" rows are not draggable. Deleting a task or routine shows a bottom-centre ink toast ("Deleted …" + Undo, 5 s). While a task is dragged, the folder cards in Today's strip become drop targets: the card under the pointer gets a ring in its list colour, and dropping moves the task into that folder (it leaves the day; Undo toast "Moved to <folder>"); a completed task snaps back. The task `…` menu offers the same as "Move to folder…" (a sheet of active folders plus "New folder…"). Drag-and-drop is allowed here by owner request (2026-09-30, 2026-10-01); Calendar scheduling remains select-then-tap. On web, a plain click still edits the title or toggles the check: a mouse press-and-release in place is never treated as a drag.
