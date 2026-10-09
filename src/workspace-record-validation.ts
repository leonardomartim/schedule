import type { Note, ScheduleItem } from './types'

function isWorkspaceRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function isStoredNote(value: unknown): value is Note {
  return isWorkspaceRecord(value) && typeof value.id === 'number' && Number.isFinite(value.id) &&
    typeof value.title === 'string' && typeof value.preview === 'string' && typeof value.updated === 'string' &&
    ['orange', 'blue', 'cream'].includes(String(value.accent)) &&
    (value.deletedAt === undefined || (typeof value.deletedAt === 'string' && Number.isFinite(Date.parse(value.deletedAt))))
}

export function isStoredScheduleItem(value: unknown): value is ScheduleItem {
  return isWorkspaceRecord(value) && typeof value.id === 'number' && Number.isFinite(value.id) &&
    typeof value.title === 'string' && typeof value.detail === 'string' && typeof value.duration === 'string' &&
    typeof value.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) &&
    ['work', 'personal', 'focus', 'health'].includes(String(value.category)) && typeof value.completed === 'boolean' &&
    (value.date === undefined || (typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date))) &&
    (value.eventId === undefined || typeof value.eventId === 'string')
}
