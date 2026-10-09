export function sourceEventStart(date: string, time: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const target = Date.parse(`${date}T${time}:00Z`)
  if (!Number.isFinite(target)) return null
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    let instant = target
    for (let pass = 0; pass < 3; pass += 1) {
      const fields = Object.fromEntries(formatter.formatToParts(instant).map((part) => [part.type, part.value]))
      const actual = `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}:${fields.second}Z`
      if (actual === `${date}T${time}:00Z`) return new Date(instant).toISOString()
      instant += target - Date.parse(actual)
    }
    return null
  } catch { return null }
}
