import { notes as initialNotes, scheduleItems as initialScheduleItems } from './data'
import type { Note, ScheduleItem } from './types'

const notesStorageKey = 'schedule.notes.v1'
const scheduleStorageKey = 'schedule.items.v1'

function loadStoredArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback

  try {
    const savedValue: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    return Array.isArray(savedValue) ? savedValue as T[] : fallback
  } catch {
    return fallback
  }
}

function saveStoredArray<T>(key: string, values: T[]): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(values))
}

export function loadScheduleItems(): ScheduleItem[] {
  return loadStoredArray(scheduleStorageKey, initialScheduleItems)
}

export function saveScheduleItems(items: ScheduleItem[]): void {
  saveStoredArray(scheduleStorageKey, items)
}

export function loadNotes(): Note[] {
  return loadStoredArray(notesStorageKey, initialNotes)
}

export function saveNotes(notes: Note[]): void {
  saveStoredArray(notesStorageKey, notes)
}
