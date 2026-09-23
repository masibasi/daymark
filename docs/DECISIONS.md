# Daymark Decision Log

## Product

- **Today is home.** The primary question is what to do now.
- **Calendar is primary navigation, second to Today.** Scheduling is core, not a utility screen.
- **Projects are persistent.** They remain visible regardless of Today's selection.
- **Deadline previews stay compact.** Today shows the most urgent three and links to the rest.
- **Task is not CalendarEvent.** External commitments do not become todos.
- **TimeBlock links intent to time.** A Task can have zero, one, or many blocks.
- **Completion uses Day Orbit.** Category identity is preserved through stable ring segments.
- **No social or gamification in V1.** The emotional reward is the visible record of finished work.

## Technical

- **Expo + React Native Web.** One TypeScript UI foundation across phone and web.
- **Expo Router.** Routes remain addressable on web and portable to native navigation.
- **Zustand for V0.** Small in-memory state with explicit domain actions.
- **Selectors own derivation.** Components render data; they do not duplicate domain math.
- **`completedAt` is the only completion-history source.** Scheduling never implies completion.
- **Mock calendar provider first.** Real integrations wait until product UX is validated.
- **Scheduling is select then tap.** Drag-and-drop is deferred until the grid and task model are validated.

