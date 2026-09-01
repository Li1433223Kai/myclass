<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TodayView from './components/TodayView.vue'
import TimetableView from './components/TimetableView.vue'
import SettingsView from './components/SettingsView.vue'
import CourseEditor from './components/CourseEditor.vue'
import type { Course } from './types'
import { newId } from './store'
import { startClock } from './lib/clock'
import { COURSE_COLORS } from './lib/seed'

type Tab = 'today' | 'table' | 'settings'
const tab = ref<Tab>('today')
const editing = ref<Course | null>(null)
const toastMsg = ref('')
let toastTimer: number | undefined

onMounted(startClock)

function openEditor(course?: Course, prefill?: { day: number; startSection: number }) {
  if (course) {
    const copy = JSON.parse(JSON.stringify(course))
    if (!copy.id) copy.id = newId()
    editing.value = copy
  } else {
    const end = prefill ? Math.min(prefill.startSection + 1, 12) : 2
    editing.value = {
      id: newId(),
      name: '',
      color: Math.floor(Math.random() * COURSE_COLORS.length),
      type: 'custom',
      slots: prefill ? [{ day: prefill.day, startSection: prefill.startSection, endSection: end, weeks: [], location: '' }] : []
    }
  }
}

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastMsg.value = ''), 2600)
}
</script>

<template>
  <main class="content">
    <TodayView v-show="tab === 'today'" @edit-course="c => openEditor(c)" />
    <TimetableView v-show="tab === 'table'" @edit-course="c => openEditor(c)" @add-course="p => openEditor(undefined, p)" />
    <SettingsView v-show="tab === 'settings'" @edit-course="c => openEditor(c)" @toast="showToast" />
  </main>

  <CourseEditor v-if="editing" :course="editing" @close="editing = null" @toast="showToast" />

  <nav class="tabbar">
    <button :class="{ active: tab === 'today' }" @click="tab = 'today'"><span class="ico">☀️</span>今日</button>
    <button :class="{ active: tab === 'table' }" @click="tab = 'table'"><span class="ico">🗓️</span>课表</button>
    <button :class="{ active: tab === 'settings' }" @click="tab = 'settings'"><span class="ico">⚙️</span>设置</button>
  </nav>

  <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
</template>
