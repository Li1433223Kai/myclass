<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Course } from '../types'
import { store } from '../store'
import { clock, debugFixed } from '../lib/clock'
import { formatWeeks, weekMonday, weekOf } from '../lib/weeks'
import { COURSE_COLORS } from '../lib/seed'
import { addDays, dayIndexMon1, fmtMD } from '../lib/date'

const emit = defineEmits<{
  (e: 'edit-course', c: Course): void
  (e: 'add-course', p: { day: number; startSection: number }): void
}>()

const ROW_H = 46
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const settings = computed(() => store.data.settings)
const currentWeek = computed(() => weekOf(settings.value.semesterStart, clock.now))
const week = ref(Math.max(currentWeek.value, 1))
const isThisWeek = computed(() => week.value === currentWeek.value && currentWeek.value >= 1)

function go(delta: number) {
  week.value = Math.min(40, Math.max(1, week.value + delta))
}
function backToThisWeek() {
  week.value = Math.max(currentWeek.value, 1)
}

const sectionCount = computed(() => {
  let n = Math.max(12, settings.value.sectionTimes.length)
  for (const c of store.data.courses) for (const s of c.slots) n = Math.max(n, s.endSection)
  return n
})

const hasWeekendCourse = computed(() => store.data.courses.some(c => c.slots.some(s => s.day >= 6)))
const days = computed<number[]>(() => {
  const base = [1, 2, 3, 4, 5]
  if (settings.value.showWeekend || hasWeekendCourse.value) base.push(6, 7)
  return base
})

const weekDates = computed(() => {
  const monday = weekMonday(settings.value.semesterStart, week.value)
  return days.value.map(d => addDays(monday, d - 1))
})

interface Entry {
  course: Course
  active: boolean
  day: number
  startSection: number
  endSection: number
  location: string
}

const cellEntries = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const course of store.data.courses) {
    for (const slot of course.slots) {
      const key = `${slot.day}-${slot.startSection}`
      const arr = map.get(key) || []
      arr.push({
        course,
        active: slot.weeks.includes(week.value),
        day: slot.day,
        startSection: slot.startSection,
        endSection: slot.endSection,
        location: slot.location
      })
      map.set(key, arr)
    }
  }
  return map
})

function entriesAt(day: number, section: number): Entry[] {
  return cellEntries.value.get(`${day}-${section}`) || []
}

function colorOf(c: Course): string {
  return COURSE_COLORS[c.color % COURSE_COLORS.length]
}

function blockTitle(e: Entry): string {
  return `${e.course.name}｜${formatWeeks(e.course.slots.find(s => s.startSection === e.startSection && s.day === e.day)?.weeks || [])}｜${e.location || '地点待定'}`
}
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="head-left">
        <button class="nav" @click="go(-1)">‹</button>
        <div class="week-label" @click="backToThisWeek">
          <div class="week-main">第 {{ week }} 周</div>
          <div class="week-range">
            {{ fmtMD(weekDates[0]) }} – {{ fmtMD(weekDates[weekDates.length - 1]) }}
            <span v-if="!isThisWeek" class="back">回到本周</span>
          </div>
        </div>
        <button class="nav" @click="go(1)">›</button>
      </div>
      <div v-if="debugFixed" class="dbg">调试时间</div>
    </header>

    <div class="card gridcard">
      <div class="kbgrid" :style="{ gridTemplateColumns: `44px repeat(${days.length}, minmax(44px, 1fr))` }">
        <!-- 表头 -->
        <div class="hcell corner"></div>
        <div
          v-for="(d, i) in days"
          :key="d"
          class="hcell"
          :class="{ today: isThisWeek && dayIndexMon1(clock.now) === d }"
        >
          <div class="hname">{{ WEEKDAYS[d - 1] }}</div>
          <div class="hdate">{{ weekDates[i] ? fmtMD(weekDates[i]) : '' }}</div>
        </div>

        <!-- 主体 -->
        <template v-for="sec in sectionCount" :key="sec">
          <div class="tcell">
            <div class="tno">{{ sec }}</div>
            <div class="ttime">{{ settings.sectionTimes[sec - 1]?.start || '' }}</div>
          </div>
          <div
            v-for="d in days"
            :key="`${sec}-${d}`"
            class="cell"
            @click="!entriesAt(d, sec).length && emit('add-course', { day: d, startSection: sec })"
          >
            <div class="overlay">
              <div
                v-for="(e, i) in entriesAt(d, sec)"
                :key="i"
                class="block"
                :class="{ ghost: !e.active }"
                :style="{
                  height: (e.endSection - e.startSection + 1) * ROW_H - 6 + 'px',
                  background: e.active ? colorOf(e.course) : undefined
                }"
                :title="blockTitle(e)"
                @click.stop="emit('edit-course', e.course)"
              >
                <div class="bname">{{ e.course.name }}</div>
                <div class="bloc">{{ e.location }}</div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <p class="tip">点空白格可添加课程；灰色块为本周不上、其他周上的课</p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 2px 12px;
}
.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nav {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #fff;
  box-shadow: 0 1px 4px rgba(30, 40, 80, 0.1);
  font-size: 18px;
  color: var(--text);
  line-height: 1;
}
.week-label {
  text-align: center;
  cursor: pointer;
  min-width: 120px;
}
.week-main {
  font-size: 18px;
  font-weight: 700;
}
.week-range {
  color: var(--muted);
  font-size: 11.5px;
  margin-top: 1px;
}
.week-range .back {
  color: var(--accent);
  margin-left: 4px;
}
.dbg {
  background: #fff3cd;
  color: #8a6d00;
  font-size: 11px;
  border-radius: 8px;
  padding: 4px 8px;
}

.gridcard {
  padding: 8px 6px;
  overflow: hidden;
}
.kbgrid {
  display: grid;
  gap: 0;
}
.hcell {
  position: sticky;
  top: 0;
  z-index: 4;
  text-align: center;
  padding: 4px 0 6px;
  background: var(--card);
  border-bottom: 1px solid var(--line);
}
.hcell.today {
  color: var(--accent);
}
.hcell.today .hdate {
  color: var(--accent);
  font-weight: 700;
}
.hname {
  font-size: 13px;
  font-weight: 600;
}
.hdate {
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 1px;
}
.corner {
  z-index: 5;
}

.tcell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--line);
}
.tno {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.ttime {
  font-size: 9px;
  color: #b7bccb;
  margin-top: 1px;
}

.cell {
  position: relative;
  height: v-bind("ROW_H + 'px'");
  border-left: 1px solid var(--line);
  border-top: 1px solid var(--line);
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  gap: 2px;
  padding: 1px;
}
.block {
  flex: 1;
  min-width: 0;
  border-radius: 6px;
  color: #fff;
  padding: 3px 4px;
  overflow: hidden;
  cursor: pointer;
  z-index: 3;
  line-height: 1.25;
}
.block.ghost {
  background: #edeff5;
  border: 1px dashed #c9cede;
  color: #9aa0b2;
  z-index: 2;
}
.bname {
  font-size: 10.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.bloc {
  font-size: 9.5px;
  opacity: 0.9;
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tip {
  color: var(--muted);
  font-size: 11.5px;
  text-align: center;
  margin-top: 10px;
}
</style>
