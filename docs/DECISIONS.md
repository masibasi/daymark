# Decisions — Daymark

Each entry: decision, and the reasoning behind it. Ordered roughly product → technical.

## Product decisions

**Today is home, not a calendar.**
The user's actual pain point is "what do I need to do today," not "what's on my schedule" — a calendar-first app (like Apple Calendar) makes you reconstruct your todo list from meeting titles. Today answers the real first question.

**Nav order: Today, Calendar, Projects. Settings via header avatar, not a tab.**
Settings is low-frequency; giving it a tab wastes the scarcest nav real estate (3–4 slots) on something opened rarely. An avatar/menu entry point is a well-understood pattern and keeps the tab bar focused on the three things used daily.

**Projects are persistent and separate from daily todos.**
A deadline-driven project (an assignment, a job application) needs to exist independent of any single day — collapsing it into "just another todo" loses the deadline/progress framing that's the whole point of tracking it. Keeping Project as its own entity lets Projects list show deadline-sorted urgency and lets Project Detail show subtask progress, neither of which a flat todo list can do well.

**Subtask "add to Today" is a flag on the same Task, never a duplicate.**
Considered creating a separate lightweight "Today entry" that references a subtask. Rejected: two records for one piece of work invites drift (complete one, forget the other) and doubles the surface area for bugs. A single `scheduledDate` field on Task is simpler, and it's exactly the kind of derived-state trap ARCHITECTURE.md's "state boundaries" section is meant to prevent.

**External calendar events never auto-convert into Tasks.**
A meeting appearing on your calendar is not automatically "work I need to do" — conflating the two would mean Daymark starts asking you to "complete" things you didn't create as tasks (a lecture isn't a checkbox). Keeping CalendarEvent and Task/TimeBlock as separate concepts (see ARCHITECTURE.md) preserves that distinction structurally, not just by convention.

**D-day urgency tiers: 14+/7/3/1, color-graduated (grey → ink → amber → coral).**
A single "overdue" red state doesn't help you triage a week out. Four tiers give enough runway to notice a deadline approaching without every deadline screaming red at once (only D-1/overdue gets the alarm color — see DESIGN.md's "text-only, no filled backgrounds" rule, which keeps even the urgent tier calm rather than alarming).

**Day Mark = segmented ring, category colors preserved, never blended.**
This is the central original idea (see REFERENCE_ANALYSIS.md for what it replaces — TodoMate's blended flower mark). A blended mark can tell you "something happened" but not "what" or "how much of it." A segmented ring — one arc per category, sized by share, filled by completion — answers both at a glance and stays legible even as the number of active categories/tasks grows, which a color-mixing approach fundamentally cannot (colors converge toward mud as more are blended).

**No social or gamification features, ever (not just deferred).**
Daymark's stated purpose is a calm personal tool. Streaks/XP/confetti optimize for engagement/dopamine, which is a different (and here, undesired) product goal; social features (followers, visibility, feeds) are a different product entirely. This is called out as a hard scope limit, not a "later" item, precisely so a future session doesn't casually add a streak counter as a "nice enhancement."

**Mock categories are Study/Career/Personal/Routine, not the user's literal real-life categories.**
The user's actual life sorts closer to Study/Career/Faith/Daily, but the brief specified these four category names explicitly for the mock data. Flagged as an assumption to revisit: renaming categories is a config change (see ROADMAP V1 "category management"), not a structural one, so this costs nothing to fix later.

## Technical decisions

**Expo SDK (latest stable) + TypeScript + expo-router.**
File-based routing gives real web URLs (`/calendar`, `/projects/[id]`) for free, which matters for a react-native-web target, and keeps native (iOS/Android) viable later without a rewrite — the brief's toolchain (Node 20, npm 10, no pnpm/yarn/bun) and "web bundler metro, output single" requirement both point at Expo's own tooling rather than a bespoke RN+webpack setup.

**Zustand, single in-memory store, no persistence in V0.**
The brief is explicit: mock data + local zustand state only, no backend. A single store (rather than several disconnected ones) keeps derived cross-entity data (Day Mark spans tasks; project progress spans tasks; Today spans tasks+projects) consistent by construction — one source of truth to select from. Written with a small, repository-shaped action API specifically so swapping in real persistence/backend later (see ROADMAP V0.2/V1) touches the store's internals, not every screen that calls `toggleTask()`.

**Selectors live in `src/domain/selectors.ts`, not inside components.**
Derived math (progress, Day Mark, urgency tier, today's task list) used from multiple screens must have exactly one implementation, or the mandatory `completedAt`-only Day Mark rule could quietly get reimplemented incorrectly (e.g., falling back to `scheduledDate`) in a second place. Centralizing also makes selectors independently testable without rendering a component tree.

**react-native-reanimated for micro-interactions, react-native-svg for the Day Mark ring and calendar rails.**
Both are the standard, well-supported choice for this class of animation/vector-drawing in Expo, work across native and web, and are explicitly named in the brief.

**date-fns for date math.**
Avoids hand-rolled date arithmetic bugs (week boundaries, day-of-week, ISO formatting) which the Day Mark/Upcoming/Week-grid logic all depend on being correct; small, tree-shakeable, no timezone-database bloat needed for a purely local mock-data app.

**No Tailwind/NativeWind — `StyleSheet.create` + a small `theme/tokens.ts` module.**
Keeps styling explicit, typed, and portable to native (Tailwind/NativeWind adds a build-time layer and a different mental model for values that this project wants centralized in one token file anyway per the coding standards). A token module is simpler to reason about for a project this size and matches the "no inline magic numbers where a token exists" coding standard directly.

**`CalendarProvider` interface with only `MockCalendarProvider` implemented in V0.**
Costs almost nothing to define now (four methods, one mock implementation) and removes an entire future refactor: when real Google Calendar integration arrives (ROADMAP "Later"), it drops in behind the same interface instead of requiring every screen/selector that reads events to be rewritten.

**No drag-and-drop scheduling in V0; select-task-then-tap-slot instead.**
Drag-and-drop across a scrollable, possibly-paginated (mobile 3-day) time grid is a substantial interaction-design and gesture-handling investment (handling drag-while-scroll, cross-platform gesture parity, snap feedback) that isn't necessary to prove the core idea (tasks can become calendar time). The simpler two-step flow (pick task from a sheet, tap a slot) validates the same "TimeBlock creation" concept with far less risk, and is called out in the brief as the V0-mandated interaction. Drag-and-drop is explicitly the first V0.5 enhancement (ROADMAP.md), not abandoned.

**Genuine blockers: none.** The one assumption worth flagging is the category-naming one above; everything else in the brief was directly actionable.
