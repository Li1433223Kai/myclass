<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Course, CourseType, Slot } from '../types'
import { store, upsertCourse, deleteCourse } from '../store'
import { COURSE_COLORS } from '../lib/seed'
import { formatWeeks, parseWeeksText } from '../lib/weeks'

const props = defineProps<{ course: Course }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'toast', m: string): void }>()

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const isNew = computed(() => !store.data.courses.some(c => c.id === props.course.id))
const sectionCount = computed(() => Math.max(12, store.data.settings.sectionTimes.length))

interface SlotDraft {
  day: number
  startSection: number
  endSection: number
  location: string
  weeksText: string
}

const draft = reactive({
  ...JSON.parse(JSON.stringify(props.course)),
  slots: (props.course.slots || []).map(s => ({
    day: s.day,
    startSection: s.startSection,
    endSection: s.endSection,
    location: s.location,
    weeksText: formatWeeks(s.weeks) === '—' ? '' : formatWeeks(s.weeks).replace(/（.*）/, '')
  })) as SlotDraft[]
})

const error = ref('')

function addSlot() {
  draft.slots.push({ day: 1, startSection: 1, endSection: 2, location: '', weeksText: '1-20' })
}
function removeSlot(i: number) {
  draft.slots.splice(i, 1)
}

function slotTimePreview(s: SlotDraft): string {
  const st = store.data.settings.sectionTimes[s.startSection - 1]
  const en = store.data.settings.sectionTimes[s.endSection - 1]
  if (!st || !en) return ''
  return `${st.start} – ${en.end}`
}

function save() {
  const name = draft.name.trim()
  if (!name) {
    error.value = '请填写课程名称'
    return
  }
  const slots: Slot[] = []
  for (const [i, s] of draft.slots.entries()) {
    let weeks: number[]
    try {
      weeks = parseWeeksText(s.weeksText)
    } catch (e) {
      error.value = `时段 ${i + 1}：${(e as Error).message}`
      return
    }
    if (!weeks.length) {
      error.value = `时段 ${i + 1}：请填写周次，如 1-19 或 1,3-9`
      return
    }
    const a = Math.min(s.startSection, s.endSection)
    const b = Math.max(s.startSection, s.endSection)
    slots.push({ day: s.day, startSection: a, endSection: b, weeks, location: s.location.trim() })
  }
  upsertCourse({
    id: draft.id,
    name,
    code: (draft.code || '').trim() || undefined,
    teacher: (draft.teacher || '').trim() || undefined,
    note: (draft.note || '').trim() || undefined,
    color: draft.color,
    type: draft.type as CourseType,
    slots
  })
  emit('toast', isNew.value ? '已添加' : '已保存')
  emit('close')
}

function remove() {
  if (isNew.value) {
    emit('close')
    return
  }
  if (confirm(`确定删除「${draft.name}」吗？`)) {
    deleteCourse(draft.id)
    emit('toast', '已删除')
    emit('close')
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="m-head">
        <div class="m-title">{{ isNew ? '添加' : '编辑' }}课程</div>
        <button class="x" @click="emit('close')">✕</button>
      </div>

      <div class="frow">
        <input v-model="draft.name" placeholder="课程名称（必填）" class="w100" />
      </div>
      <div class="frow two">
        <input v-model="draft.teacher" placeholder="老师" />
        <input v-model="draft.code" placeholder="课程编号（选填）" />
      </div>

      <div class="frow type">
        <button
          v-for="t in [
            { v: 'course', n: '教务课程' },
            { v: 'custom', n: '自定义事项' }
          ]"
          :key="t.v"
          class="tbtn"
          :class="{ sel: draft.type === t.v }"
          @click="draft.type = t.v"
        >
          {{ t.n }}
        </button>
        <span class="thint">{{ draft.type === 'custom' ? '自定义事项不会被导入覆盖' : '再次导入教务课表时会被替换' }}</span>
      </div>

      <div class="frow">
        <span class="flabel">颜色</span>
        <span class="swatches">
          <button
            v-for="(c, i) in COURSE_COLORS"
            :key="i"
            class="swatch"
            :class="{ sel: draft.color === i }"
            :style="{ background: c }"
            @click="draft.color = i"
          ></button>
        </span>
      </div>

      <div class="slots">
        <div class="slots-cap">上课时段（周次支持 1-19、1,3-9、全部 等写法）</div>
        <div v-for="(s, i) in draft.slots" :key="i" class="slotbox">
          <div class="srow">
            <select v-model="s.day">
              <option v-for="(w, wi) in WEEKDAYS" :key="wi" :value="wi + 1">{{ w }}</option>
            </select>
            <span class="slabel">第</span>
            <select v-model.number="s.startSection">
              <option v-for="n in sectionCount" :key="n" :value="n">{{ n }}</option>
            </select>
            <span class="slabel">–</span>
            <select v-model.number="s.endSection">
              <option v-for="n in sectionCount" :key="n" :value="n">{{ n }}</option>
            </select>
            <span class="slabel">节</span>
            <button class="del" @click="removeSlot(i)">🗑</button>
          </div>
          <div class="srow">
            <input v-model="s.location" placeholder="地点，如 教1-421" class="loc" />
            <input v-model="s.weeksText" placeholder="周次，如 1,3-9" class="weeks" />
          </div>
          <div class="sprev">{{ slotTimePreview(s) }}</div>
        </div>
        <button class="addslot" @click="addSlot">＋ 添加时段</button>
      </div>

      <div class="frow">
        <textarea v-model="draft.note" rows="2" placeholder="备注（选填），如：集中实训 2 周，周次待确认"></textarea>
      </div>

      <div v-if="error" class="err">{{ error }}</div>

      <div class="m-btns">
        <button v-if="!isNew" class="btn danger" @click="remove">删除</button>
        <button class="btn ghost" @click="emit('close')">取消</button>
        <button class="btn" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.m-title {
  font-size: 17px;
  font-weight: 700;
}
.x {
  border: none;
  background: #f1f2f7;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: var(--muted);
}
.frow {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.frow.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.w100 {
  flex: 1;
  width: 100%;
}
.frow input,
.frow textarea,
.frow select {
  padding: 9px 10px;
}
textarea {
  width: 100%;
  resize: vertical;
}
.type {
  flex-wrap: wrap;
}
.tbtn {
  border: none;
  background: #f1f2f7;
  color: var(--muted);
  padding: 7px 13px;
  border-radius: 9px;
  font-size: 13px;
}
.tbtn.sel {
  background: var(--accent-weak);
  color: var(--accent);
  font-weight: 600;
}
.thint {
  font-size: 11px;
  color: var(--muted);
  width: 100%;
}
.flabel {
  font-size: 13px;
  color: var(--muted);
  flex: none;
}
.swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.swatch {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 2px solid transparent;
  padding: 0;
}
.swatch.sel {
  border-color: var(--text);
  transform: scale(1.12);
}

.slots-cap {
  font-size: 12px;
  color: var(--muted);
  margin: 4px 0 8px;
}
.slotbox {
  background: #fff;
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(30, 40, 80, 0.05);
}
.srow {
  display: flex;
  align-items: center;
  gap: 6px;
}
.srow + .srow {
  margin-top: 8px;
}
.slabel {
  color: var(--muted);
  font-size: 13px;
  flex: none;
}
.srow select {
  padding: 6px 4px;
}
.loc {
  flex: 1.2;
  min-width: 0;
}
.weeks {
  flex: 1;
  min-width: 0;
}
.del {
  border: none;
  background: none;
  font-size: 15px;
  flex: none;
  margin-left: 2px;
}
.sprev {
  color: #b7bccb;
  font-size: 11px;
  margin-top: 6px;
}
.addslot {
  width: 100%;
  border: 1.5px dashed #c9cede;
  background: none;
  color: var(--muted);
  border-radius: 10px;
  padding: 9px;
  font-size: 13px;
  margin-bottom: 10px;
}
.err {
  background: #feecec;
  color: var(--danger);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  margin-bottom: 10px;
}
.m-btns {
  display: flex;
  gap: 10px;
}
.m-btns .btn {
  flex: 1;
}
</style>
