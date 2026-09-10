import type { Note, ScheduleItem } from './types'

export const scheduleItems: ScheduleItem[] = [
  { id: 1, time: '08:30', title: 'Morning pages', detail: 'Clear the desk, make a plan', category: 'focus', duration: '30 min', completed: true },
  { id: 2, time: '09:00', title: 'Product team stand-up', detail: 'Weekly sync · Studio room', category: 'work', duration: '45 min', completed: false },
  { id: 3, time: '10:15', title: 'Deep work block', detail: 'Ship the calendar interactions', category: 'focus', duration: '2 hrs', completed: false },
  { id: 4, time: '12:30', title: 'Lunch with Maya', detail: 'Greenhouse Cafe · 12th street', category: 'personal', duration: '1 hr', completed: false },
  { id: 5, time: '14:00', title: 'Client presentation', detail: 'Walk through the spring campaign', category: 'work', duration: '1 hr', completed: false },
  { id: 6, time: '17:30', title: 'Evening run', detail: 'Easy 5k along the river', category: 'health', duration: '45 min', completed: false },
]

export const notes: Note[] = [
  { id: 1, title: 'Things to remember', preview: 'Book the train for next month. Ask Jamie about...', updated: 'Edited 12m ago', accent: 'orange' },
  { id: 2, title: 'Spring campaign', preview: 'The feeling should be warm, human, and a little...', updated: 'Edited yesterday', accent: 'blue' },
  { id: 3, title: 'Reading list', preview: 'The Creative Act · Four Thousand Weeks · ...', updated: 'Edited Mon', accent: 'cream' },
]
