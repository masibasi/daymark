import type {
  Category,
  CalendarEvent,
  Project,
  Task,
  TimeBlock,
} from '../domain/types';

// "Today" for this prototype is fixed at 2026-09-18 (a Friday), matching the
// reference screenshots' week (Sun 13 - Sat 19) and the session's real date.
export const TODAY_KEY = '2026-09-18';

export const categories: Category[] = [
  { id: 'study', name: 'Study', color: 'study', order: 0 },
  { id: 'career', name: 'Career', color: 'career', order: 1 },
  { id: 'personal', name: 'Personal', color: 'personal', order: 2 },
  { id: 'routine', name: 'Routine', color: 'routine', order: 3 },
];

export const projects: Project[] = [
  {
    id: 'proj-csci599',
    title: 'CSCI 599 Final Project',
    categoryId: 'study',
    deadline: '2026-10-02',
    status: 'active',
    notes: 'Interactive & Ubiquitous UI final — team of 3, topic: adaptive calendars.',
  },
  {
    id: 'proj-nvidia',
    title: 'NVIDIA SWE Internship Application',
    categoryId: 'career',
    deadline: '2026-09-21',
    status: 'active',
    notes: 'Referral from alumni meetup on the 9th — aim to submit before the weekend.',
  },
  {
    id: 'proj-move',
    title: 'Apartment Move Prep',
    categoryId: 'personal',
    deadline: '2026-09-25',
    status: 'active',
  },
  {
    id: 'proj-marathon',
    title: 'Half Marathon Training Block',
    categoryId: 'routine',
    deadline: '2026-11-01',
    status: 'active',
    notes: '12-week plan targeting the November half marathon.',
  },
];

let taskOrder = 0;
const nextOrder = () => taskOrder++;

export const tasks: Task[] = [
  // --- CSCI 599 subtasks ---
  {
    id: 't-csci-1',
    title: 'Form team & pick topic',
    categoryId: 'study',
    projectId: 'proj-csci599',
    completedAt: '2026-09-05T10:00:00',
    order: nextOrder(),
  },
  {
    id: 't-csci-2',
    title: 'Literature review',
    categoryId: 'study',
    projectId: 'proj-csci599',
    completedAt: '2026-09-10T16:30:00',
    order: nextOrder(),
  },
  {
    id: 't-csci-3',
    title: 'Draft project proposal',
    categoryId: 'study',
    projectId: 'proj-csci599',
    order: nextOrder(),
  },
  {
    id: 't-csci-4',
    title: 'Implement baseline model',
    categoryId: 'study',
    projectId: 'proj-csci599',
    order: nextOrder(),
  },
  {
    id: 't-csci-5',
    title: 'Write evaluation section',
    categoryId: 'study',
    projectId: 'proj-csci599',
    order: nextOrder(),
  },
  {
    id: 't-csci-6',
    title: 'Prepare slides for presentation',
    categoryId: 'study',
    projectId: 'proj-csci599',
    order: nextOrder(),
  },

  // --- NVIDIA application subtasks ---
  {
    id: 't-nvidia-1',
    title: 'Update resume',
    categoryId: 'career',
    projectId: 'proj-nvidia',
    completedAt: '2026-09-16T18:00:00',
    order: nextOrder(),
  },
  {
    id: 't-nvidia-2',
    title: 'Write cover letter',
    categoryId: 'career',
    projectId: 'proj-nvidia',
    scheduledDate: TODAY_KEY,
    order: nextOrder(),
  },
  {
    id: 't-nvidia-3',
    title: 'Request referral from alum',
    categoryId: 'career',
    projectId: 'proj-nvidia',
    completedAt: '2026-09-12T09:00:00',
    order: nextOrder(),
  },
  {
    id: 't-nvidia-4',
    title: 'Submit application',
    categoryId: 'career',
    projectId: 'proj-nvidia',
    order: nextOrder(),
  },
  {
    id: 't-nvidia-5',
    title: 'Prep for interview questions',
    categoryId: 'career',
    projectId: 'proj-nvidia',
    order: nextOrder(),
  },

  // --- Apartment move subtasks ---
  {
    id: 't-move-1',
    title: 'Book moving truck',
    categoryId: 'personal',
    projectId: 'proj-move',
    completedAt: '2026-09-10T12:00:00',
    order: nextOrder(),
  },
  {
    id: 't-move-2',
    title: 'Notify landlord',
    categoryId: 'personal',
    projectId: 'proj-move',
    completedAt: '2026-09-12T12:00:00',
    order: nextOrder(),
  },
  {
    id: 't-move-3',
    title: 'Pack kitchen boxes',
    categoryId: 'personal',
    projectId: 'proj-move',
    scheduledDate: '2026-09-20',
    order: nextOrder(),
  },
  {
    id: 't-move-4',
    title: 'Change address with USPS',
    categoryId: 'personal',
    projectId: 'proj-move',
    order: nextOrder(),
  },
  {
    id: 't-move-5',
    title: 'Clean old apartment',
    categoryId: 'personal',
    projectId: 'proj-move',
    order: nextOrder(),
  },

  // --- Marathon training subtasks ---
  {
    id: 't-run-1',
    title: 'Build 12-week training plan',
    categoryId: 'routine',
    projectId: 'proj-marathon',
    completedAt: '2026-09-01T08:00:00',
    order: nextOrder(),
  },
  {
    id: 't-run-2',
    title: 'Buy new running shoes',
    categoryId: 'routine',
    projectId: 'proj-marathon',
    completedAt: '2026-09-08T11:00:00',
    order: nextOrder(),
  },
  {
    id: 't-run-3',
    title: 'Long run: 10 miles',
    categoryId: 'routine',
    projectId: 'proj-marathon',
    scheduledDate: TODAY_KEY,
    order: nextOrder(),
  },
  {
    id: 't-run-4',
    title: 'Sign up for race',
    categoryId: 'routine',
    projectId: 'proj-marathon',
    order: nextOrder(),
  },

  // --- Standalone Today tasks (not part of a project) ---
  {
    id: 't-today-1',
    title: 'Review IUI lecture notes',
    categoryId: 'study',
    scheduledDate: TODAY_KEY,
    order: nextOrder(),
  },
  {
    id: 't-today-2',
    title: 'Problem set 3 — office hours question',
    categoryId: 'study',
    scheduledDate: TODAY_KEY,
    completedAt: '2026-09-18T09:15:00',
    order: nextOrder(),
  },
  {
    id: 't-today-3',
    title: 'Email professor about extension',
    categoryId: 'study',
    scheduledDate: TODAY_KEY,
    order: nextOrder(),
  },
  {
    id: 't-today-4',
    title: 'Reply to recruiter email',
    categoryId: 'career',
    scheduledDate: TODAY_KEY,
    completedAt: '2026-09-18T10:05:00',
    order: nextOrder(),
  },
  {
    id: 't-today-5',
    title: 'Grocery run',
    categoryId: 'personal',
    scheduledDate: TODAY_KEY,
    order: nextOrder(),
  },
  {
    id: 't-today-6',
    title: 'Call mom',
    categoryId: 'personal',
    scheduledDate: TODAY_KEY,
    completedAt: '2026-09-18T08:30:00',
    order: nextOrder(),
  },
  {
    id: 't-today-7',
    title: 'Gym — leg day',
    categoryId: 'routine',
    scheduledDate: TODAY_KEY,
    order: nextOrder(),
  },
  {
    id: 't-today-8',
    title: 'QT / morning devotional',
    categoryId: 'routine',
    scheduledDate: TODAY_KEY,
    completedAt: '2026-09-18T07:00:00',
    order: nextOrder(),
  },
];

// --- External calendar events (mock provider), curated across Sep 13-26 ---
let eventSeq = 0;
function ev(
  title: string,
  start: string,
  end: string,
  color: string,
  calendarId: string,
  allDay = false
): CalendarEvent {
  const id = `evt-${eventSeq++}`;
  return {
    id,
    title,
    start,
    end,
    allDay,
    color,
    source: { provider: 'mock', calendarId, eventId: id },
  };
}

const CLASS_COLOR = '#7AA2E3';
const CAREER_COLOR = '#E3A46E';
const PERSONAL_COLOR = '#7FC7A0';
const FAITH_COLOR = '#D79FC0';

export const calendarEvents: CalendarEvent[] = [
  // CSCI 599: IUI lecture — Mon & Wed, 2-4pm
  ev('CSCI 599 — IUI', '2026-09-14T14:00:00', '2026-09-14T16:00:00', CLASS_COLOR, 'usc'),
  ev('CSCI 599 — IUI', '2026-09-16T14:00:00', '2026-09-16T16:00:00', CLASS_COLOR, 'usc'),
  ev('CSCI 599 — IUI', '2026-09-21T14:00:00', '2026-09-21T16:00:00', CLASS_COLOR, 'usc'),
  ev('CSCI 599 — IUI', '2026-09-23T14:00:00', '2026-09-23T16:00:00', CLASS_COLOR, 'usc'),
  // CSCI 599: AAI lab — Tue & Thu, 7-9pm
  ev('CSCI 599 — AAI', '2026-09-15T19:00:00', '2026-09-15T21:00:00', CLASS_COLOR, 'usc'),
  ev('CSCI 599 — AAI', '2026-09-17T19:00:00', '2026-09-17T21:00:00', CLASS_COLOR, 'usc'),
  ev('CSCI 599 — AAI', '2026-09-22T19:00:00', '2026-09-22T21:00:00', CLASS_COLOR, 'usc'),
  ev('CSCI 599 — AAI', '2026-09-24T19:00:00', '2026-09-24T21:00:00', CLASS_COLOR, 'usc'),
  // Team meeting (Zoom), weekly Tue
  ev('Team Meeting (Zoom)', '2026-09-15T11:00:00', '2026-09-15T12:00:00', CAREER_COLOR, 'work'),
  ev('Team Meeting (Zoom)', '2026-09-22T11:00:00', '2026-09-22T12:00:00', CAREER_COLOR, 'work'),
  // Marco Papa office hour, weekly Thu
  ev('Marco Papa Office Hour', '2026-09-17T13:00:00', '2026-09-17T16:00:00', CLASS_COLOR, 'usc'),
  ev('Marco Papa Office Hour', '2026-09-24T13:00:00', '2026-09-24T16:00:00', CLASS_COLOR, 'usc'),
  // Career events
  ev('USC Career Center: Resume Review', '2026-09-15T10:00:00', '2026-09-15T10:30:00', CAREER_COLOR, 'career'),
  ev('Viterbi Employer Insights: Resume Workshop', '2026-09-17T12:00:00', '2026-09-17T13:00:00', CAREER_COLOR, 'career'),
  ev('NVIDIA Info Session', '2026-09-16T16:00:00', '2026-09-16T17:00:00', CAREER_COLOR, 'career'),
  // Personal / routine
  ev('USC Rec: Group Run', '2026-09-18T18:30:00', '2026-09-18T19:30:00', PERSONAL_COLOR, 'personal'),
  ev('Bible Study', '2026-09-17T19:30:00', '2026-09-17T20:30:00', FAITH_COLOR, 'faith'),
  ev('Sunday Service', '2026-09-13T10:00:00', '2026-09-13T11:30:00', FAITH_COLOR, 'faith'),
  ev('Sunday Service', '2026-09-20T10:00:00', '2026-09-20T11:30:00', FAITH_COLOR, 'faith'),
  ev('USC Founders’ Day (no classes)', '2026-09-25T00:00:00', '2026-09-25T23:59:00', CLASS_COLOR, 'usc', true),
  // Recurring morning run, Mon/Wed/Fri
  ev('Morning Run', '2026-09-14T06:30:00', '2026-09-14T07:15:00', PERSONAL_COLOR, 'personal'),
  ev('Morning Run', '2026-09-16T06:30:00', '2026-09-16T07:15:00', PERSONAL_COLOR, 'personal'),
  ev('Morning Run', '2026-09-18T06:30:00', '2026-09-18T07:15:00', PERSONAL_COLOR, 'personal'),
  ev('Morning Run', '2026-09-21T06:30:00', '2026-09-21T07:15:00', PERSONAL_COLOR, 'personal'),
  ev('Morning Run', '2026-09-23T06:30:00', '2026-09-23T07:15:00', PERSONAL_COLOR, 'personal'),
  ev('Morning Run', '2026-09-25T06:30:00', '2026-09-25T07:15:00', PERSONAL_COLOR, 'personal'),
];

export const timeBlocks: TimeBlock[] = [
  {
    id: 'tb-1',
    taskId: 't-csci-3',
    start: '2026-09-14T20:00:00',
    end: '2026-09-14T21:00:00',
  },
  {
    id: 'tb-2',
    taskId: 't-nvidia-1',
    start: '2026-09-16T20:00:00',
    end: '2026-09-16T21:00:00',
  },
  {
    id: 'tb-3',
    taskId: 't-move-3',
    start: '2026-09-20T15:00:00',
    end: '2026-09-20T16:30:00',
  },
];
