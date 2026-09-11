import type { ScheduleItem } from './types'

export interface AgendaStack {
  id: 'morning' | 'afternoon' | 'evening'
  label: string
  items: ScheduleItem[]
}

interface AgendaStackDefinition {
  id: AgendaStack['id']
  label: string
  startsAt: string
}

const agendaStackDefinitions: AgendaStackDefinition[] = [
  { id: 'morning', label: 'Morning', startsAt: '00:00' },
  { id: 'afternoon', label: 'Afternoon', startsAt: '12:00' },
  { id: 'evening', label: 'Evening', startsAt: '17:00' },
]

export interface ScheduleProgress {
  completed: number
  total: number
  percentage: number
}

export function createAgendaStacks(items: ScheduleItem[]): AgendaStack[] {
  const chronologicalItems = [...items].sort((firstItem, secondItem) => firstItem.time.localeCompare(secondItem.time))

  return agendaStackDefinitions.map((definition, index) => {
    const nextDefinition = agendaStackDefinitions[index + 1]
    const stackItems = chronologicalItems.filter((item) => item.time >= definition.startsAt && (!nextDefinition || item.time < nextDefinition.startsAt))
    return { id: definition.id, label: definition.label, items: stackItems }
  }).filter((stack) => stack.items.length > 0)
}

export function getScheduleProgress(items: ScheduleItem[]): ScheduleProgress {
  const completed = items.filter((item) => item.completed).length
  const total = items.length
  return { completed, total, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) }
}
