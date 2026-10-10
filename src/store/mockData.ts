import type { CalendarEvent, Category, Project, Task, TimeBlock } from '@/domain/types';
import { dictionaryFor, resolveLocale, type Dictionary, type Language } from '@/i18n';

export const prototypeDate = new Date('2026-09-22T10:30:00-07:00');

// Sample and default content is created in the active language at creation time; stored data is never renamed afterwards.
const copyFor = (language: Language): Dictionary => dictionaryFor(resolveLocale(language));
const lookup = (map: Record<string, string>, id: string) => map[id] ?? id;

export const initialCategories = (language: Language): Category[] => {
  const names = copyFor(language).sample.categories;
  return [
    { id: 'study', name: names.study, colorKey: 'study', order: 0 },
    { id: 'career', name: names.career, colorKey: 'career', order: 1 },
    { id: 'personal', name: names.personal, colorKey: 'personal', order: 2 },
    { id: 'routine', name: names.routine, colorKey: 'routine', order: 3 },
  ];
};

const sampleProjects: Project[] = [
  { id: 'agentic-ai', order: 0, title: 'Agentic AI Assignment', categoryId: 'study', deadline: '2026-09-27', status: 'active', notes: 'Build, deploy, and record the final MCP demo.' },
  { id: 'iui-project', order: 1, title: 'IUI Project', categoryId: 'study', deadline: '2026-10-03', status: 'active', notes: 'Prototype and evaluate the interaction flow.' },
  { id: 'portfolio', order: 2, title: 'Portfolio refresh', categoryId: 'career', deadline: '2026-10-14', status: 'active', notes: 'Tighten case studies before recruiting season.' },
  { id: 'move-plan', order: 3, title: 'October move', categoryId: 'personal', deadline: '2026-10-20', status: 'active' },
];

const sampleTasks: Task[] = [
  { id: 'history-14-study', title: 'Outline interaction study', categoryId: 'study', scheduledDate: '2026-09-14', completedAt: '2026-09-14T10:20:00-07:00' },
  { id: 'history-14-routine', title: 'Morning run', categoryId: 'routine', scheduledDate: '2026-09-14', completedAt: '2026-09-14T07:10:00-07:00' },
  { id: 'history-16-career', title: 'Coffee chat prep', categoryId: 'career', scheduledDate: '2026-09-16', completedAt: '2026-09-16T15:00:00-07:00' },
  { id: 'history-16-personal', title: 'Laundry', categoryId: 'personal', scheduledDate: '2026-09-16' },
  { id: 'history-18-study', title: 'Read HCI paper', categoryId: 'study', scheduledDate: '2026-09-18', completedAt: '2026-09-18T13:20:00-07:00' },
  { id: 'history-18-career', title: 'Send portfolio link', categoryId: 'career', scheduledDate: '2026-09-18', completedAt: '2026-09-18T16:40:00-07:00' },
  { id: 'history-18-routine', title: 'Stretch', categoryId: 'routine', scheduledDate: '2026-09-18', completedAt: '2026-09-18T21:10:00-07:00' },
  { id: 'history-19-study', title: 'Plan user interviews', categoryId: 'study', projectId: 'iui-project', scheduledDate: '2026-09-19', completedAt: '2026-09-19T14:00:00-07:00' },
  { id: 'history-19-personal', title: 'Farmers market', categoryId: 'personal', scheduledDate: '2026-09-19', completedAt: '2026-09-19T11:20:00-07:00' },
  { id: 'history-20-study', title: 'Read assignment brief', categoryId: 'study', projectId: 'agentic-ai', scheduledDate: '2026-09-20', completedAt: '2026-09-20T11:00:00-07:00' },
  { id: 'history-20-routine', title: 'Weekly reset', categoryId: 'routine', scheduledDate: '2026-09-20', completedAt: '2026-09-20T18:30:00-07:00' },
  { id: 'history-21-study', title: 'Set up GCP project', categoryId: 'study', projectId: 'agentic-ai', scheduledDate: '2026-09-21', completedAt: '2026-09-21T16:10:00-07:00' },
  { id: 'history-21-career', title: 'Review internship roles', categoryId: 'career', scheduledDate: '2026-09-21' },
  { id: 'history-21-routine', title: 'Morning pages', categoryId: 'routine', scheduledDate: '2026-09-21', completedAt: '2026-09-21T07:40:00-07:00' },
  { id: 'leetcode', title: 'LeetCode × 2', categoryId: 'study', scheduledDate: '2026-09-22', completedAt: '2026-09-22T08:45:00-07:00' },
  { id: 'lecture', title: 'Review agent systems lecture', categoryId: 'study', scheduledDate: '2026-09-22' },
  { id: 'mcp', title: 'Implement MCP server', categoryId: 'study', projectId: 'agentic-ai', scheduledDate: '2026-09-22' },
  { id: 'deploy', title: 'Deploy service', categoryId: 'study', projectId: 'agentic-ai' },
  { id: 'record', title: 'Record demo', categoryId: 'study', projectId: 'agentic-ai' },
  { id: 'apply', title: 'Apply to Figma', categoryId: 'career', scheduledDate: '2026-09-22' },
  { id: 'resume', title: 'Polish project bullets', categoryId: 'career', scheduledDate: '2026-09-22', completedAt: '2026-09-22T09:35:00-07:00' },
  { id: 'reply', title: 'Reply to recruiter', categoryId: 'career', scheduledDate: '2026-09-22' },
  { id: 'groceries', title: 'Pick up groceries', categoryId: 'personal', scheduledDate: '2026-09-22' },
  { id: 'call-mom', title: 'Call mom', categoryId: 'personal', scheduledDate: '2026-09-22', completedAt: '2026-09-22T10:05:00-07:00' },
  { id: 'qt', title: 'Morning pages', categoryId: 'routine', scheduledDate: '2026-09-22', completedAt: '2026-09-22T07:30:00-07:00' },
  { id: 'gym', title: 'Gym', categoryId: 'routine', scheduledDate: '2026-09-22' },
  { id: 'wireframes', title: 'Refine mobile wireframes', categoryId: 'study', projectId: 'iui-project' },
  { id: 'prototype', title: 'Build interactive prototype', categoryId: 'study', projectId: 'iui-project' },
  { id: 'case-study', title: 'Rewrite Daymark case study', categoryId: 'career', projectId: 'portfolio' },
  { id: 'headshots', title: 'Choose new headshots', categoryId: 'career', projectId: 'portfolio' },
];

const sampleEvents: CalendarEvent[] = [
  { id: 'e1', provider: 'mock', externalId: 'gcal-1', title: 'CSCI 599 · IUI', startAt: '2026-09-21T14:00:00-07:00', endAt: '2026-09-21T15:30:00-07:00', allDay: false, colorKey: 'event' },
  { id: 'e2', provider: 'mock', externalId: 'gcal-2', title: 'Team critique', startAt: '2026-09-22T11:00:00-07:00', endAt: '2026-09-22T12:00:00-07:00', allDay: false, colorKey: 'event' },
  { id: 'e3', provider: 'mock', externalId: 'gcal-3', title: 'Career fair', startAt: '2026-09-23T13:00:00-07:00', endAt: '2026-09-23T15:00:00-07:00', allDay: false, colorKey: 'event' },
  { id: 'e4', provider: 'mock', externalId: 'gcal-4', title: 'Dinner with Mina', startAt: '2026-09-24T18:30:00-07:00', endAt: '2026-09-24T20:00:00-07:00', allDay: false, colorKey: 'event' },
  { id: 'e5', provider: 'mock', externalId: 'gcal-5', title: 'No class', startAt: '2026-09-25T00:00:00-07:00', endAt: '2026-09-26T00:00:00-07:00', allDay: true, colorKey: 'event' },
  { id: 'e6', provider: 'mock', externalId: 'gcal-6', title: 'Church', startAt: '2026-09-27T10:00:00-07:00', endAt: '2026-09-27T11:30:00-07:00', allDay: false, colorKey: 'event' },
  { id: 'e7', provider: 'mock', externalId: 'gcal-7', title: 'Web team meeting', startAt: '2026-09-28T10:30:00-07:00', endAt: '2026-09-28T11:30:00-07:00', allDay: false, colorKey: 'event' },
  { id: 'e8', provider: 'mock', externalId: 'gcal-8', title: 'Portfolio review', startAt: '2026-09-30T15:00:00-07:00', endAt: '2026-09-30T16:00:00-07:00', allDay: false, colorKey: 'event' },
];

export const initialTimeBlocks: TimeBlock[] = [
  { id: 'b1', taskId: 'lecture', startAt: '2026-09-22T14:00:00-07:00', endAt: '2026-09-22T15:30:00-07:00' },
  { id: 'b2', taskId: 'apply', startAt: '2026-09-23T09:00:00-07:00', endAt: '2026-09-23T10:00:00-07:00' },
  { id: 'b3', taskId: 'gym', startAt: '2026-09-24T17:00:00-07:00', endAt: '2026-09-24T18:00:00-07:00' },
];

export const initialProjects = (language: Language): Project[] => {
  const { projects, projectNotes } = copyFor(language).sample;
  return sampleProjects.map((project) => {
    const { notes, ...rest } = project;
    const note = notes ? lookup(projectNotes, project.id) : undefined;
    return { ...rest, title: lookup(projects, project.id), ...(note ? { notes: note } : {}) };
  });
};

export const initialTasks = (language: Language): Task[] => {
  const { tasks } = copyFor(language).sample;
  return sampleTasks.map((task) => ({ ...task, title: lookup(tasks, task.id) }));
};

export const initialEvents = (language: Language): CalendarEvent[] => {
  const { events } = copyFor(language).sample;
  return sampleEvents.map((event) => ({ ...event, title: lookup(events, event.id) }));
};
