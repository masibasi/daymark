# Daymark Reference Analysis

## TodoMate

### Take
- Tasks sit directly on the page instead of inside repeated cards. This keeps a daily list calm and quick to scan.
- Category color is used as identity, while most of the interface stays neutral.
- Generous spacing and large tap targets make lightweight interactions feel approachable.
- Completion leaves a visible trace on the calendar. This is the strongest product idea in the reference.
- Adding an item happens in context, close to the list being edited.

### Do not take
- Do not copy the four-petal completion flower, overlapping color treatment, or follower/profile rail.
- Do not reproduce the social feed, visibility controls, reactions, or public-list concepts.
- Do not use a five-item social bottom bar or make every section header a large pill.
- Do not use bright category color for entire rows; color should guide, not dominate.

## Apple Calendar

### Take
- Month cells retain useful event density instead of reducing every day to a dot.
- Week view makes free and occupied time immediately legible through a stable hour grid.
- Timed events use position and height to communicate start time and duration before text is read.
- All-day items, timed items, current day, and current time each have distinct visual treatments.
- Navigation is predictable: period title, previous/next controls, Today, and view switcher.

### Do not take
- Do not copy Apple system chrome, exact colors, typography, popovers, or event editor.
- Do not surface calendar-provider complexity in the first prototype.
- Do not make Calendar the parent model for tasks.
- Do not inherit calendar density on the Today screen.

## Daymark's differentiation

Daymark starts with intent, not appointments. Today answers what matters now; Projects keep deadline work persistent; Calendar answers when work can happen. A Task may be scheduled through a TimeBlock but remains a Task before and after that block.

The original completion visualization is the **Day Orbit**: a thin circular track split by category. Each category owns one stable segment; that segment fills according to completed tasks in the category. It never creates one tiny arc per task and never blends colors. Historical marks are calculated from `completedAt` only.

## Resulting principles

1. Calm lists, dense calendars.
2. Color carries category meaning.
3. Deadlines appear before ordinary daily work without taking over the page.
4. Completion should feel visible and gentle, not gamified.
5. External events remain events; scheduled work remains linked to its Task.

