import type { ScheduleCategory } from './types'

export interface ScheduleCategoryPresentation {
  label: string
  badgeClassName: string
  dotClassName: string
}

const scheduleCategoryPresentations: Record<ScheduleCategory, ScheduleCategoryPresentation> = {
  work: { label: 'Work', badgeClassName: 'bg-sky/12 text-sky', dotClassName: 'bg-sky ring-sky' },
  personal: { label: 'Personal', badgeClassName: 'bg-peach/12 text-peach', dotClassName: 'bg-peach ring-peach' },
  focus: { label: 'Focus', badgeClassName: 'bg-orange/12 text-orange', dotClassName: 'bg-orange ring-orange' },
  health: { label: 'Health', badgeClassName: 'bg-lilac/12 text-lilac', dotClassName: 'bg-lilac ring-lilac' },
}

export function getScheduleCategoryPresentation(category: ScheduleCategory): ScheduleCategoryPresentation {
  return scheduleCategoryPresentations[category]
}
