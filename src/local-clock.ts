export interface LocalClockSnapshot {
  dateLabel: string
  hour: number
  timeLabel: string
  timeZoneLabel: string
}

export function getLocalClockSnapshot(currentDate: Date): LocalClockSnapshot {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const hourPart = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hourCycle: 'h23', timeZone }).formatToParts(currentDate).find((part) => part.type === 'hour')
  const timeZoneLabel = timeZone.replace(/_/g, ' ').split('/').pop() ?? timeZone

  return {
    dateLabel: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone }).format(currentDate),
    hour: Number(hourPart?.value ?? '0'),
    timeLabel: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(currentDate),
    timeZoneLabel,
  }
}
