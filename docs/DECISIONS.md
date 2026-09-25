# Daymark Decision Log

## Product

- **Today is home.** The primary question is what to do now.
- **The Day Orbit leads Today.** Completion context and the compact history calendar appear before deadlines and task rows, so accomplishment is part of orientation rather than an afterthought.
- **Today’s header is factual, not motivational.** It shows the selected date and concise weather context; prototype weather is mock data until a provider is explicitly scoped.
- **Today can revisit another date.** Selecting a day in the compact history calendar changes the visible tasks and completion record without changing the scheduling calendar's role.
- **The history calendar defaults to collapsed on phone, expanded on desktop.** Collapsed shows just the Sun–Sat week containing the selected date; expanded shows the full month. A quiet toggle in the card header switches between them, and the prev/next arrows move by week or month to match. The user's choice always wins over the width-based default once they toggle it.
- **Calendar is primary navigation, second to Today.** Scheduling is core, not a utility screen.
- **Projects are persistent.** They remain visible regardless of Today's selection.
- **Deadline work is the primary differentiator.** Project urgency, progress, and the next actionable steps take priority over becoming a general-purpose list manager.
- **Deadline previews stay compact.** Today shows the most urgent three and links to the rest.
- **Deadline urgency lives in the label, not the card.** Deadline cards stay neutral (`colors.paper` / `colors.line`) at every urgency step; only the `D−n` label darkens from muted, to soft ink, to full ink, to danger red as the due date approaches. This was a deliberate reversal of an earlier tinted/warm/rose card treatment, which the product owner found too loud for a calm surface.
- **Task is not CalendarEvent.** External commitments do not become todos.
- **TimeBlock links intent to time.** A Task can have zero, one, or many blocks.
- **Completion uses Day Orbit.** Category identity is preserved through stable ring segments.
- **Watercolor is concentrated in the Day Mark.** Its pale wash and restrained surface provide organic character; the rest of the app keeps a crisp black/white foundation instead of becoming full-screen glassmorphism.
- **No social or gamification in V1.** The emotional reward is the visible record of finished work.
- **Neutral black/white foundation.** Light mode is white, dark mode is near-black; category colors carry the visual energy instead of beige or warm neutrals.
- **Today includes contextual quick add.** A daily task can be created with a title and category without leaving Today.
- **Rescheduling matters more than arbitrary lists.** Daymark should support moving an unfinished Task to another day; broad user-defined list hierarchies are not required for the core loop.
- **Task actions live beside the Task.** The `…` menu moves unfinished work to tomorrow, a chosen date, or off the displayed day without duplicating it.
- **Day Mark directions are compared at equal states.** The study route shows four visual approaches at 0/25/50/100 percent; its existence does not select a final treatment.
- **Day Mark variants share one renderer.** `DayOrbit` draws Soft ribbon, Glass vessel, Watercolor wash, and the original baseline from the same `selectDayOrbit` segments. The study route (`/daymark-lab`) shows each at Today size, at 22px calendar size, and on a dark panel, and its "Use on Today" control switches the live Today, history, and month marks for the session, for reference and comparison. New variants use softened per-category `mark` tokens, and the wash bleeds inward from each category's own arc so colors touch but never mix or overlap.
- **Watercolor wash is the shipped default.** After reviewing the study route, the product owner chose Watercolor wash over the ribbon, glass, and original baseline treatments: a ribbon band in softened per-category `mark` tokens, with a pale wash bleeding inward from each category's own arc. Colors touch but never mix. Slow, near-imperceptible breathing is reserved for the large Today mark only; calendar-size and history marks stay static. The lab remains reachable from Today for reference, not as an active decision point.
- **Deadline attention begins per Project.** Seven days is the default; Project Detail offers 3/7/14/30 days for when the `D−n` label starts to darken. D−3 and D−1 still intensify the label further in this prototype.
- **Calendar integration stays explicit.** Calendar events provide time context; Tasks enter the calendar only when the user schedules a TimeBlock. Events do not silently become todos.
- **The Today time rail and "reserve time" tray were tried and parked.** A V0 study added a compact 8 AM–9 PM strip on Today plus a per-Task "Reserve time" tray, so a Task could pick up a TimeBlock without a trip to the Calendar tab. The product owner reviewed it and found the interaction didn't resonate; it has been removed (preserved in git history at commit `c673d1b`). Today scheduling goes through the Calendar tab's select-then-tap-slot flow for now; a different Today-native scheduling interaction may be revisited later.
- **Project detail remains focused on mobile.** V0 keeps full-screen project detail. A desktop side panel is preferred over an expanding card because it preserves the deadline overview while allowing quick edits; this is a later interaction refinement.

## Technical

- **Expo + React Native Web.** One TypeScript UI foundation across phone and web.
- **Expo Router.** Routes remain addressable on web and portable to native navigation.
- **Zustand for V0.** Small in-memory state with explicit domain actions.
- **Selectors own derivation.** Components render data; they do not duplicate domain math.
- **`completedAt` is the only completion-history source.** Scheduling never implies completion.
- **Mock calendar provider first.** Real integrations wait until product UX is validated.
- **Scheduling is select then tap.** Drag-and-drop is deferred until the grid and task model are validated.
