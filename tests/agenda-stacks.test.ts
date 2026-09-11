import { describe, expect, it } from 'vitest'
import { createAgendaStacks, getScheduleProgress } from '../src/agenda-stacks'
import type { ScheduleItem } from '../src/types'

const agendaItems: ScheduleItem[] = [
  { id: 1, time: '17:30', title: 'Evening run', detail: '', category: 'health', duration: '45 min', completed: false },
  { id: 2, time: '08:30', title: 'Morning pages', detail: '', category: 'focus', duration: '30 min', completed: true },
  { id: 3, time: '12:30', title: 'Lunch', detail: '', category: 'personal', duration: '1 hr', completed: false },
  { id: 4, time: '09:00', title: 'Stand-up', detail: '', category: 'work', duration: '45 min', completed: false },
]

describe('agenda stacks', () => {
  it('groups a day into chronological morning, afternoon, and evening stacks', () => {
    expect(createAgendaStacks(agendaItems)).toEqual([
      { id: 'morning', label: 'Morning', items: [agendaItems[1], agendaItems[3]] },
      { id: 'afternoon', label: 'Afternoon', items: [agendaItems[2]] },
      { id: 'evening', label: 'Evening', items: [agendaItems[0]] },
    ])
  })

  it('reports progress against the complete agenda, including completed items', () => {
    expect(getScheduleProgress(agendaItems)).toEqual({ completed: 1, total: 4, percentage: 25 })
  })
})
