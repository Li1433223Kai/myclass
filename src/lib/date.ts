/** 按本地时区解析 YYYY-MM-DD（避免 new Date(str) 走 UTC 造成日期偏移） */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** 星期索引，1=周一 … 7=周日 */
export function dayIndexMon1(d: Date): number {
  const g = d.getDay()
  return g === 0 ? 7 : g
}

export function fmtDateCN(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** "08:30" → 分钟数 */
export function toMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}
