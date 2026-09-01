<script setup lang="ts">
import { computed } from 'vue'
import type { Course, Slot } from '../types'
import { store } from '../store'
import { clock } from '../lib/clock'
import { weekOf } from '../lib/weeks'
import { COURSE_COLORS } from '../lib/seed'
import { addDays, dayIndexMon1, fmtDateCN, fmtMD, minutesOfDay, parseLocalDate, startOfDay, toMinutes } from '../lib/date'
import { secsLabel } from '../lib/label'

const emit = defineEmits<{ (e: 'edit-course', c: Course): void }>()

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const settings = computed(() => store.data.settings)
const week = computed(() => weekOf(settings.value.semesterStart, clock.now))
const day = computed(() => dayIndexMon1(clock.now))
const notStarted = computed(() => week.value < 1)
const daysToStart = computed(() =>
  Math.ceil((startOfDay(parseLocalDate(settings.value.semesterStart)).getTime() - startOfDay(clock.now).getTime()) / 86400000)
)

interface Item {
  course: Course
  slot: Slot
  startMin: number
  endMin: number
  status: 'done' | 'current' | 'upcoming'
  progress: number
}

function slotTimes(slot: Slot): { startMin: number; endMin: number } {
  const st = settings.value.sectionTimes[slot.startSection - 1]
  const en = settings.value.sectionTimes[slot.endSection - 1]
  const startMin = st ? toMinutes(st.start) : 0
  const endMin = en ? toMinutes(en.end) : startMin + 45
  return { startMin, endMin }
}

function timeLabel(slot: Slot): string {
  const { startMin, endMin } = slotTimes(slot)
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return `${f(startMin)} – ${f(endMin)}`
}

function colorOf(c: Course): string {
  return COURSE_COLORS[c.color % COURSE_COLORS.length]
}

const items = computed<Item[]>(() => {
  const nowMin = minutesOfDay(clock.now)
  const out: Item[] = []
  for (const course of store.data.courses) {
    for (const slot of course.slots) {
      if (slot.day !== day.value || !slot.weeks.includes(week.value)) continue
      const { startMin, endMin } = slotTimes(slot)
      let status: Item['status'] = 'upcoming'
      let progress = 0
      if (nowMin >= endMin) status = 'done'
      else if (nowMin >= startMin) {
        status = 'current'
        progress = Math.min(100, Math.round(((nowMin - startMin) / Math.max(1, endMin - startMin)) * 100))
      }
      out.push({ course, slot, startMin, endMin, status, progress })
    }
  }
  return out.sort((a, b) => a.startMin - b.startMin)
})

/** 未开学时，预览开学第一天（周一）的课 */
const firstDayItems = computed(() => {
  const w = weekOf(settings.value.semesterStart, parseLocalDate(settings.value.semesterStart))
  const out: Array<{ course: Course; slot: Slot }> = []
  for (const course of store.data.courses) {
    for (const slot of course.slots) {
      if (slot.day === 1 && slot.weeks.includes(w)) out.push({ course, slot })
    }
  }
  return out.sort((a, b) => a.slot.startSection - b.slot.startSection)
})

/** 今天没课时，找最近的一节课（往后扫 28 天） */
const nextClass = computed<{ date: Date; course: Course; slot: Slot } | null>(() => {
  for (let off = 0; off <= 28; off++) {
    const date = addDays(clock.now, off)
    const w = weekOf(settings.value.semesterStart, date)
    if (w < 1) continue
    const d = dayIndexMon1(date)
    let best: { course: Course; slot: Slot; startMin: number } | null = null
    for (const c of store.data.courses) {
      for (const s of c.slots) {
        if (s.day !== d || !s.weeks.includes(w)) continue
        const { startMin, endMin } = slotTimes(s)
        if (off === 0 && endMin <= minutesOfDay(clock.now)) continue
        if (!best || startMin < best.startMin) best = { course: c, slot: s, startMin }
      }
    }
    if (best) return { date, course: best.course, slot: best.slot }
  }
  return null
})

function countdownLabel(it: Item): string {
  const mins = it.startMin - minutesOfDay(clock.now)
  if (mins <= 0) return '马上上课'
  if (mins < 60) return `${mins}分钟后`
  return `${Math.floor(mins / 60)}小时${mins % 60}分后`
}
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <div class="date">{{ fmtDateCN(clock.now) }}</div>
        <div class="weekday">{{ WEEKDAYS[day - 1] }}</div>
      </div>
      <div class="badge" :class="{ off: week < 1 }">
        {{ week >= 1 ? `第 ${week} 周` : '假期中' }}
      </div>
    </header>

    <!-- 未开学 -->
    <section v-if="notStarted" class="card banner">
      <div class="banner-title">🎉 距离开学还有 <b>{{ Math.max(daysToStart, 0) }}</b> 天</div>
      <div class="banner-sub">{{ settings.semesterStart }} 开学（第 1 周周一）</div>
      <div v-if="firstDayItems.length" class="preview">
        <div class="preview-cap">开学第一天要上的课</div>
        <div v-for="(it, i) in firstDayItems" :key="i" class="preview-item" @click="emit('edit-course', it.course)">
          <span class="dot" :style="{ background: colorOf(it.course) }"></span>
          <span class="p-time">{{ secsLabel(it.slot.startSection, it.slot.endSection) }} {{ timeLabel(it.slot) }}</span>
          <span class="p-name">{{ it.course.name }}</span>
        </div>
      </div>
      <div v-else class="preview-cap">开学第一天暂无课程安排</div>
    </section>

    <!-- 有课 -->
    <template v-else>
      <section v-if="items.length" class="list">
        <div v-for="(it, i) in items" :key="i" class="card course" :class="it.status" @click="emit('edit-course', it.course)">
          <div class="left">
            <div class="time">{{ timeLabel(it.slot) }}</div>
            <div class="secs">{{ secsLabel(it.slot.startSection, it.slot.endSection) }}</div>
          </div>
          <div class="mid">
            <div class="name">{{ it.course.name }}</div>
            <div class="meta">
              📍 {{ it.slot.location || '待定' }}
              <template v-if="it.course.teacher"> · {{ it.course.teacher }}</template>
            </div>
            <div v-if="it.status === 'current'" class="bar"><i :style="{ width: it.progress + '%' }"></i></div>
          </div>
          <div class="right">
            <span v-if="it.status === 'current'" class="chip cur">进行中</span>
            <span v-else-if="it.status === 'upcoming'" class="chip up">{{ countdownLabel(it) }}</span>
            <span v-else class="chip done">已结束</span>
          </div>
        </div>
      </section>

      <!-- 今天没课 -->
      <section v-else class="card empty">
        <div class="empty-emoji">🎉</div>
        <div class="empty-title">今天没有课</div>
        <div v-if="nextClass" class="next" @click="emit('edit-course', nextClass.course)">
          <div class="next-cap">下一节课</div>
          <div class="next-line">
            <span class="dot" :style="{ background: colorOf(nextClass.course) }"></span>
            {{ WEEKDAYS[nextClass.slot.day - 1] }}（{{ fmtMD(nextClass.date) }}）{{ secsLabel(nextClass.slot.startSection, nextClass.slot.endSection) }}
          </div>
          <div class="next-name">{{ nextClass.course.name }} <span class="meta">📍 {{ nextClass.slot.location }}</span></div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 4px 2px 14px;
}
.date {
  font-size: 21px;
  font-weight: 700;
}
.weekday {
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}
.badge {
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
}
.badge.off {
  background: #c9cdda;
}

.card {
  padding: 14px;
  margin-bottom: 10px;
}

.banner-title {
  font-size: 16px;
  font-weight: 700;
}
.banner-title b {
  color: var(--accent);
  font-size: 22px;
}
.banner-sub {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}
.preview {
  margin-top: 12px;
  border-top: 1px dashed var(--line);
  padding-top: 10px;
}
.preview-cap {
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
}
.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  font-size: 14px;
}
.p-time {
  color: var(--muted);
  font-size: 12.5px;
  white-space: nowrap;
}

.list .course {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.left {
  min-width: 86px;
  border-right: 1px solid var(--line);
  padding-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.time {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.secs {
  color: var(--muted);
  font-size: 11.5px;
  margin-top: 3px;
  white-space: nowrap;
}
.mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.name {
  font-weight: 600;
  font-size: 15px;
}
.meta {
  color: var(--muted);
  font-size: 12.5px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.right {
  display: flex;
  align-items: center;
}
.chip {
  font-size: 11px;
  border-radius: 999px;
  padding: 4px 9px;
  white-space: nowrap;
}
.chip.cur {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}
.chip.up {
  background: var(--accent-weak);
  color: var(--accent);
  font-weight: 600;
}
.chip.done {
  background: #f1f2f7;
  color: var(--muted);
}
.course.done {
  opacity: 0.55;
}
.bar {
  margin-top: 8px;
  height: 4px;
  border-radius: 4px;
  background: var(--line);
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.4s;
}

.empty {
  text-align: center;
  padding: 34px 16px;
}
.empty-emoji {
  font-size: 40px;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  margin-top: 8px;
}
.next {
  margin: 16px auto 0;
  background: var(--bg);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  max-width: 360px;
}
.next-cap {
  color: var(--muted);
  font-size: 12px;
}
.next-line {
  margin-top: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.next-name {
  margin-top: 4px;
  font-weight: 600;
  font-size: 15px;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
  flex: none;
}
</style>
