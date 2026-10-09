export function normalizeLocationText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
const countryCodes = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ ' +
  'TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ')
const countryAliases = new Map<string, string>()
for (const language of ['pt', 'en', 'es', 'ja']) {
  const names = new Intl.DisplayNames([language], { type: 'region' })
  for (const code of countryCodes) countryAliases.set(normalizeLocationText(names.of(code) ?? code), code)
}
for (const code of countryCodes) countryAliases.set(code.toLowerCase(), code)
countryAliases.set('uk', 'GB'); countryAliases.set('eua', 'US'); countryAliases.set('usa', 'US')
export function eventCountryCode(value: string): string | undefined { return countryAliases.get(normalizeLocationText(value)) }
export function eventCountryName(code: string, language = 'en'): string {
  return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code
}
export function eventLocationSlug(value: string): string {
  return normalizeLocationText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
