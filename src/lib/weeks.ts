import { parseLocalDate, startOfDay } from './date'

/** 把 "1,3-9" / "4-19" / "全部" 这样的文本解析成周次数组 */
export function parseWeeksText(input: string, maxWeek = 40): number[] {
  const s = input.trim().replace(/，/g, ',').replace(/[–—~～]/g, '-')
  if (!s) return []
  if (/^(全部|all)$/i.test(s)) return Array.from({ length: Math.min(maxWeek, 25) }, (_, i) => i + 1)
  const out = new Set<number>()
  for (const part of s.split(',')) {
    const p = part.trim()
    if (!p) continue
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      let a = +m[1]
      let b = +m[2]
      if (a > b) [a, b] = [b, a]
      for (let i = a; i <= b; i++) if (i >= 1 && i <= maxWeek) out.add(i)
    } else if (/^\d+$/.test(p)) {
      const n = +p
      if (n >= 1 && n <= maxWeek) out.add(n)
    } else {
      throw new Error(`无法识别的周次“${p}”`)
    }
  }
  return [...out].sort((a, b) => a - b)
}

/** 把周次数组压缩回简洁文本，如 [1,3..9] → "1,3-9"，全为奇数 → "1-19（单周）" */
export function formatWeeks(weeks: number[]): string {
  if (!weeks.length) return '—'
  const sorted = [...weeks].sort((a, b) => a - b)
  const runs: Array<[number, number]> = []
  let s = sorted[0]
  let prev = sorted[0]
  for (const w of sorted.slice(1)) {
    if (w === prev + 1) {
      prev = w
    } else {
      runs.push([s, prev])
      s = w
      prev = w
    }
  }
  runs.push([s, prev])
  const body = runs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(',')
  // 只有跨度≥2周的连续区间才标单双周，单独一周（如仅第10周）不标
  const allOdd = sorted.length >= 2 && sorted.every(w => w % 2 === 1)
  const allEven = sorted.length >= 2 && sorted.every(w => w % 2 === 0)
  const tag = allOdd && runs.length === 1 ? '（单周）' : allEven && runs.length === 1 ? '（双周）' : ''
  return body + tag
}

/** 计算某日期是学期第几周；开学前返回 ≤0 */
export function weekOf(semesterStart: string, date: Date): number {
  const start = startOfDay(parseLocalDate(semesterStart))
  const diff = Math.floor((startOfDay(date).getTime() - start.getTime()) / 86400000)
  return Math.floor(diff / 7) + 1
}

/** 第 n 周的周一日期 */
export function weekMonday(semesterStart: string, week: number): Date {
  const start = startOfDay(parseLocalDate(semesterStart))
  const d = new Date(start)
  d.setDate(start.getDate() + (week - 1) * 7)
  return d
}
