import type { EventCategory } from '../src/events/event-discovery.js'
import { normalizeLocationText } from '../src/events/event-country-names.js'
export function classifyPublicEvent(value: string): EventCategory {
  const text = normalizeLocationText(value)
  if (/music|musica|show|concerto|concert|samba|rock|dj\b|rnb|festival coolritiba/.test(text)) return 'music'
  if (/food|drink|gastronom|culin|beer|wine|comida/.test(text)) return 'food'
  if (/sport|esport|football|marathon|grappling|corrida|fitness|fitdance/.test(text)) return 'sports'
  if (/technolog|tecnolog|software|developer|\bai\b|high tech|programa[çc]ao|hackathon/.test(text)) return 'technology'
  if (/outdoor|hiking|trilha|nature|natureza|camping/.test(text)) return 'outdoors'
  if (/art\b|arts|artes|theat|teatro|circo|comedy|comedia|exhibition|exposi|stand.?up|musicais|orquestra/.test(text)) return 'arts'
  return 'other'
}
