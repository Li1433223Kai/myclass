import type { Course, Slot } from '../types'
import { parseWeeksText } from './weeks'
import { COURSE_COLORS } from './seed'

export interface ParsedResult {
  courses: Course[]
  warnings: string[]
  /** 识别方式：json=页面内嵌数据（最可靠），grid=课表表格兜底 */
  source: 'json' | 'grid'
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function colorOf(name: string): number {
  return hashCode(name) % COURSE_COLORS.length
}

/**
 * 解析广工教务系统（jxfw）课表页面。
 * 支持：另存的完整网页 / 课表 iframe HTML / 复制粘贴的页面源码。
 * 优先提取页面内嵌的 kbxx 结构化 JSON，失败则解析课表网格表格。
 */
export function parseJxfwHtml(html: string): ParsedResult | null {
  if (!html || html.length < 50) return null

  const jsonMatch = html.match(/var\s+kbxx\s*=\s*(\[[\s\S]*?\])\s*;/)
  if (jsonMatch) {
    try {
      const items = JSON.parse(jsonMatch[1]) as KbxxItem[]
      if (Array.isArray(items) && items.length) return fromKbxx(items, html)
    } catch {
      /* JSON 解析失败则走表格兜底 */
    }
  }

  if (/class="[^"]*\bkb\b[^"]*"/.test(html)) {
    try {
      const grid = fromGrid(html)
      if (grid && grid.courses.length) return grid
    } catch {
      /* 兜底失败 */
    }
  }
  return null
}

interface KbxxItem {
  kcmc: string
  kcbh: string
  jxbmc: string
  kcrwdm: string
  jcdm2: string
  zcs: string
  xq: string
  jxcdmcs: string
  teaxms: string
}

function fromKbxx(items: KbxxItem[], html: string): ParsedResult {
  const warnings: string[] = []
  const byTask = new Map<string, Course>()

  for (const it of items) {
    const key = it.kcrwdm || `${it.kcbh}-${it.kcmc}`
    const sections = it.jcdm2.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n))
    const weeks = [...new Set(it.zcs.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n)))].sort((a, b) => a - b)
    const day = parseInt(it.xq, 10)
    if (!sections.length || !weeks.length || !day) {
      warnings.push(`课程「${it.kcmc}」有一条时段数据不完整，已跳过`)
      continue
    }
    const slot: Slot = {
      day,
      startSection: Math.min(...sections),
      endSection: Math.max(...sections),
      weeks,
      location: (it.jxcdmcs || '').trim()
    }
    const existing = byTask.get(key)
    if (existing) {
      existing.slots.push(slot)
    } else {
      byTask.set(key, {
        id: `c-${it.kcrwdm || hashCode(key)}`,
        name: it.kcmc.trim(),
        code: it.kcbh || undefined,
        teacher: (it.teaxms || '').trim() || undefined,
        color: colorOf(it.kcmc),
        type: 'course',
        slots: [slot]
      })
    }
  }

  collectUnplacedNotes(html, warnings)
  return { courses: [...byTask.values()], warnings, source: 'json' }
}

/** 课表页底部的灰色备注，如 {电子线路CAD设计，…，2周} —— 未排进网格的集中实训 */
function collectUnplacedNotes(html: string, warnings: string[]) {
  const braces = html.match(/\{([^{}]{4,120})\}/g) || []
  for (const b of braces) {
    const inner = b.slice(1, -1).replace(/；?$/, '').trim()
    const parts = inner.split(/[，,;]/).map(s => s.trim()).filter(Boolean)
    // 备注格式固定为“{课程名，教学班…，N周}”：末段是“N周”，首段是纯中文课程名（排除 JS 对象字面量）
    if (parts.length < 2) continue
    if (!/^\d+\s*周$/.test(parts[parts.length - 1])) continue
    if (!/^[\u4e00-\u9fa5A-Za-z0-9（）()]+$/.test(parts[0])) continue
    warnings.push(`检测到未排入课表的课程「${parts[0]}」（${parts[parts.length - 1]}），导入后请在课程管理中手动补充周次`)
  }
}

/** 兜底：解析 <table class="kb"> 网格（单元格 id 形如 01-1 = 第01节周一） */
function fromGrid(html: string): ParsedResult | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table.kb')
  if (!table) return null

  const warnings: string[] = []
  interface Acc {
    course: Course
    // 同一课程在同一“周X+地点”的分节行重复出现，这里合并节次范围
    ranges: Map<string, { day: number; min: number; max: number; weeks: number[]; location: string }>
  }
  const accs = new Map<string, Acc>()

  table.querySelectorAll('td[id]').forEach(td => {
    const m = td.id.match(/^(\d+)-(\d+)$/)
    if (!m) return
    const section = parseInt(m[1], 10)
    const day = parseInt(m[2], 10)
    td.querySelectorAll('.kbdiv').forEach(div => {
      const title = div.getAttribute('title') || ''
      const name = (title.match(/课程名称：(.*)/)?.[1] || div.querySelector('a')?.textContent || '').trim()
      if (!name) return
      const key = title.match(/view\(&?quot;(\d+)/)?.[1] || name
      const weeksTxt = (title.match(/周次：(.*)/)?.[1] || div.textContent?.match(/★([0-9,\-]+)/)?.[1] || '').trim()
      let weeks: number[] = []
      try {
        weeks = parseWeeksText(weeksTxt, 40)
      } catch {
        warnings.push(`课程「${name}」周次“${weeksTxt}”无法识别，请导入后手动修正`)
      }
      const location = (title.match(/教学场地：(.*)/)?.[1] || '').trim()
      const code = title.match(/课程编号：(.*)/)?.[1]?.trim()
      const teacher = (title.match(/授课教师：(.*)/)?.[1] || '').trim()

      let acc = accs.get(key)
      if (!acc) {
        acc = {
          course: {
            id: `c-${key}`,
            name,
            code: code || undefined,
            teacher: teacher || undefined,
            color: colorOf(name),
            type: 'course',
            slots: []
          },
          ranges: new Map()
        }
        accs.set(key, acc)
      }
      const rangeKey = `${day}-${location}`
      const rg = acc.ranges.get(rangeKey)
      if (rg) {
        rg.min = Math.min(rg.min, section)
        rg.max = Math.max(rg.max, section)
        for (const w of weeks) if (!rg.weeks.includes(w)) rg.weeks.push(w)
      } else {
        acc.ranges.set(rangeKey, { day, min: section, max: section, weeks: [...weeks], location })
      }
    })
  })

  for (const acc of accs.values()) {
    acc.course.slots = [...acc.ranges.values()]
      .sort((a, b) => a.day - b.day || a.min - b.min)
      .map(rg => ({ day: rg.day, startSection: rg.min, endSection: rg.max, weeks: rg.weeks.sort((a, b) => a - b), location: rg.location }))
  }

  collectUnplacedNotes(html, warnings)
  const courses = [...accs.values()].map(a => a.course)
  return { courses, warnings, source: 'grid' }
}
