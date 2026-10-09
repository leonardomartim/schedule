export type ScheduleCategory = 'work' | 'personal' | 'focus' | 'health'

export interface ScheduleItem {
  id: number
  time: string
  title: string
  detail: string
  category: ScheduleCategory
  duration: string
  completed: boolean
  date?: string
  eventId?: string
}

export interface Note {
  id: number
  title: string
  preview: string
  updated: string
  accent: 'orange' | 'blue' | 'cream'
  deletedAt?: string
}
