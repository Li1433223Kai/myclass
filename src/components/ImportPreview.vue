<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Course, Slot } from '../types'
import type { ParsedResult } from '../lib/importer'
import { formatWeeks } from '../lib/weeks'
import { secsLabel } from '../lib/label'
import { COURSE_COLORS } from '../lib/seed'

const props = defineProps<{ result: ParsedResult }>()
const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function colorOf(c: Course): string {
  return COURSE_COLORS[c.color % COURSE_COLORS.length]
}

function slotText(s: Slot): string {
  return `${WEEKDAYS[s.day - 1]} ${secsLabel(s.startSection, s.endSection)} · ${formatWeeks(s.weeks)}周 · ${s.location || '地点待定'}`
}

const totalSlots = computed(() => props.result.courses.reduce((n, c) => n + c.slots.length, 0))
</script>

<template>
  <div class="modal-mask" @click.self="emit('cancel')">
    <div class="modal">
      <div class="m-title">识别结果确认</div>
      <p class="m-sub">
        识别方式：<b>{{ result.source === 'json' ? '页面内嵌数据（推荐，可靠）' : '课表表格（兜底）' }}</b>
        · 共 {{ result.courses.length }} 门课、{{ totalSlots }} 个上课时段
      </p>

      <div v-if="result.warnings.length" class="warnbox">
        <div v-for="(w, i) in result.warnings" :key="i" class="warn-item">⚠️ {{ w }}</div>
      </div>

      <div class="list">
        <div v-for="c in result.courses" :key="c.id" class="citem">
          <div class="chead">
            <span class="dot" :style="{ background: colorOf(c) }"></span>
            <span class="cname">{{ c.name }}</span>
            <span v-if="c.teacher" class="cteacher">{{ c.teacher }}</span>
          </div>
          <div v-for="(s, i) in c.slots" :key="i" class="slot">{{ slotText(s) }}</div>
        </div>
      </div>

      <p class="m-note">确认后将<b>替换现有教务课程</b>；你手动添加的自定义事项（班会等）会保留。</p>

      <div class="m-btns">
        <button class="btn ghost" @click="emit('cancel')">取消</button>
        <button class="btn" @click="emit('confirm')">确认导入</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m-title {
  font-size: 17px;
  font-weight: 700;
}
.m-sub {
  color: var(--muted);
  font-size: 12.5px;
  margin: 6px 0 10px;
}
.warnbox {
  background: #fff7e6;
  border: 1px solid #ffe1a8;
  border-radius: 10px;
  padding: 8px 10px;
  margin-bottom: 10px;
}
.warn-item {
  font-size: 12.5px;
  color: #8a6d00;
  line-height: 1.5;
}
.list {
  max-height: 44vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  padding: 4px 12px;
}
.citem {
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.citem:last-child {
  border-bottom: none;
}
.chead {
  display: flex;
  align-items: center;
  gap: 7px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}
.cname {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cteacher {
  color: var(--muted);
  font-size: 12px;
}
.slot {
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
  padding-left: 17px;
}
.m-note {
  color: var(--muted);
  font-size: 12px;
  margin: 12px 2px;
}
.m-note b {
  color: var(--danger);
}
.m-btns {
  display: flex;
  gap: 10px;
}
.m-btns .btn {
  flex: 1;
}
</style>
