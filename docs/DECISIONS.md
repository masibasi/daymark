# Daymark Decision Log

## Product

- **Today is home.** The primary question is what to do now.
- **The Day Orbit leads Today.** Completion context and the compact history calendar appear before deadlines and task rows, so accomplishment is part of orientation rather than an afterthought.
- **Today’s header is factual, not motivational.** It shows the selected date and concise weather context; prototype weather is mock data until a provider is explicitly scoped.
- **Today can revisit another date.** Selecting a day in the compact history calendar changes the visible tasks and completion record without changing the scheduling calendar's role.
- **Calendar is primary navigation, second to Today.** Scheduling is core, not a utility screen.
- **Projects are persistent.** They remain visible regardless of Today's selection.
- **Deadline work is the primary differentiator.** Project urgency, progress, and the next actionable steps take priority over becoming a general-purpose list manager.
- **Deadline previews stay compact.** Today shows the most urgent three and links to the rest.
- **Deadline urgency is visible in the surface.** Cards move from neutral to category tint, warm tint, then restrained rose as the due date approaches.
- **Task is not CalendarEvent.** External commitments do not become todos.
- **TimeBlock links intent to time.** A Task can have zero, one, or many blocks.
- **Completion uses Day Orbit.** Category identity is preserved through stable ring segments.
- **Watercolor is concentrated in the Day Mark.** Its liquid center and restrained glass-like surface provide organic character; the rest of the app keeps a crisp black/white foundation instead of becoming full-screen glassmorphism.
- **No social or gamification in V1.** The emotional reward is the visible record of finished work.
- **Neutral black/white foundation.** Light mode is white, dark mode is near-black; category colors carry the visual energy instead of beige or warm neutrals.
- **Today includes contextual quick add.** A daily task can be created with a title and category without leaving Today.
- **Rescheduling matters more than arbitrary lists.** Daymark should support moving an unfinished Task to another day; broad user-defined list hierarchies are not required for the core loop.
- **Task actions live beside the Task.** The `…` menu moves unfinished work to tomorrow, a chosen date, or off the displayed day without duplicating it.
- **Day Mark directions are compared at equal states.** The study route shows four visual approaches at 0/25/50/100 percent; its existence does not select a final treatment.
- **Deadline attention begins per Project.** Seven days is the default; Project Detail offers 3/7/14/30 days for the first color tint. D−3 and D−1 still intensify the card in this prototype.
- **Calendar integration stays explicit.** Calendar events provide time context; Tasks enter the calendar only when the user schedules a TimeBlock. Events do not silently become todos.
- **Today scheduling needs an interaction study.** Test a small free-time preview on Today with a direct “reserve time” action on a Task before building drag-and-drop. Avoid requiring a trip to the Calendar tab for every TimeBlock.
- **Project detail remains focused on mobile.** V0 keeps full-screen project detail. A desktop side panel is preferred over an expanding card because it preserves the deadline overview while allowing quick edits; this is a later interaction refinement.

## Technical

- **Expo + React Native Web.** One TypeScript UI foundation across phone and web.
- **Expo Router.** Routes remain addressable on web and portable to native navigation.
- **Zustand for V0.** Small in-memory state with explicit domain actions.
- **Selectors own derivation.** Components render data; they do not duplicate domain math.
- **`completedAt` is the only completion-history source.** Scheduling never implies completion.
- **Mock calendar provider first.** Real integrations wait until product UX is validated.
- **Scheduling is select then tap.** Drag-and-drop is deferred until the grid and task model are validated.
