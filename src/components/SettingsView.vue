<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Course } from '../types'
import { store, exportData, importData, replaceJxfwCourses, resetSectionTimes, updateSettings } from '../store'
import { parseJxfwHtml, type ParsedResult } from '../lib/importer'
import { THEME_COLORS, COURSE_COLORS } from '../lib/seed'
import { formatWeeks, weekOf } from '../lib/weeks'
import { secsLabel } from '../lib/label'
import { clock } from '../lib/clock'
import ImportPreview from './ImportPreview.vue'

const emit = defineEmits<{ (e: 'edit-course', c: Course): void; (e: 'toast', m: string): void }>()

const settings = computed(() => store.data.settings)
const currentWeek = computed(() => weekOf(settings.value.semesterStart, clock.now))

function setSemesterStart(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (v) updateSettings({ semesterStart: v })
}
function setTime(idx: number, part: 'start' | 'end', e: Event) {
  const v = (e.target as HTMLInputElement).value
  const times = settings.value.sectionTimes.map(t => ({ ...t }))
  if (times[idx]) {
    times[idx][part] = v
    updateSettings({ sectionTimes: times })
  }
}
function setTheme(v: string) {
  updateSettings({ theme: v })
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', v)
}

/* ---------- 课程管理 ---------- */
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
function courseSummary(c: Course): string {
  if (!c.slots.length) return '暂无上课时段'
  const s = c.slots[0]
  const more = c.slots.length > 1 ? ` 等${c.slots.length}个时段` : ''
  return `${WEEKDAYS[s.day - 1]} ${secsLabel(s.startSection, s.endSection)}${more}`
}
function colorOf(c: Course): string {
  return COURSE_COLORS[c.color % COURSE_COLORS.length]
}
function editCourse(c: Course) {
  emit('edit-course', c)
}

/* ---------- 课表导入 ---------- */
const pasteText = ref('')
const importResult = ref<ParsedResult | null>(null)

function handleParse(text: string) {
  try {
    const r = parseJxfwHtml(text)
    if (r && r.courses.length) {
      importResult.value = r
    } else {
      emit('toast', '未能识别课表数据，请确认保存的是“课表查询”页面')
    }
  } catch {
    emit('toast', '解析出错，请重试')
  }
}
/** 支持一次选多个文件：优先取内嵌 JSON 的结果，其次表格兜底结果 */
async function onImportFile(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  ;(e.target as HTMLInputElement).value = ''
  if (!files.length) return
  let jsonHit: ParsedResult | null = null
  let gridHit: ParsedResult | null = null
  for (const f of files) {
    const text = await f.text().catch(() => '')
    if (!text) continue
    try {
      const r = parseJxfwHtml(text)
      if (!r || !r.courses.length) continue
      if (r.source === 'json') {
        jsonHit = r
        break
      }
      if (!gridHit) gridHit = r
    } catch {
      /* 单个文件失败不影响其他文件 */
    }
  }
  const best = jsonHit || gridHit
  if (best) importResult.value = best
  else emit('toast', '这些文件里没有课表数据，请选择“课表查询”页面保存的文件')
}
function doParsePaste() {
  if (!pasteText.value.trim()) {
    emit('toast', '请先粘贴课表页面内容')
    return
  }
  handleParse(pasteText.value)
}
function confirmImport() {
  if (!importResult.value) return
  replaceJxfwCourses(importResult.value.courses)
  emit('toast', `已导入 ${importResult.value.courses.length} 门课程`)
  importResult.value = null
  pasteText.value = ''
}

/* ---------- 备份 ---------- */
function doExport() {
  const blob = new Blob([exportData()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const d = new Date()
  a.download = `myclass-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  emit('toast', '备份文件已导出')
}
function onBackupFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      importData(String(reader.result || ''))
      emit('toast', '备份已恢复')
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.value.theme)
    } catch (err) {
      emit('toast', `恢复失败：${(err as Error).message}`)
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">设置</h1>

    <!-- 学期 -->
    <section class="card sec">
      <div class="sec-title">学期</div>
      <label class="row">
        <span class="row-label">开学日期（第 1 周周一）</span>
        <input type="date" :value="settings.semesterStart" @change="setSemesterStart" />
      </label>
      <div class="hint">今天是第 {{ Math.max(currentWeek, 0) }} 周</div>
    </section>

    <!-- 作息时间 -->
    <section class="card sec">
      <div class="sec-title">
        每节课时间
        <button class="mini" @click="resetSectionTimes(); emit('toast', '已恢复默认作息')">恢复默认</button>
      </div>
      <div class="times">
        <div v-for="(t, i) in settings.sectionTimes" :key="i" class="trow">
          <span class="tno">第{{ i + 1 }}节</span>
          <input type="time" :value="t.start" @change="setTime(i, 'start', $event)" />
          <span class="dash">–</span>
          <input type="time" :value="t.end" @change="setTime(i, 'end', $event)" />
        </div>
      </div>
    </section>

    <!-- 显示 -->
    <section class="card sec">
      <div class="sec-title">显示</div>
      <label class="row">
        <span class="row-label">课表总是显示周六周日</span>
        <input type="checkbox" class="sw" :checked="settings.showWeekend" @change="updateSettings({ showWeekend: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label class="row">
        <span class="row-label">主题色</span>
        <span class="swatches">
          <button
            v-for="t in THEME_COLORS"
            :key="t.value"
            class="swatch"
            :class="{ sel: settings.theme === t.value }"
            :style="{ background: t.value }"
            :title="t.name"
            @click="setTheme(t.value)"
          ></button>
        </span>
      </label>
    </section>

    <!-- 课程管理 -->
    <section class="card sec">
      <div class="sec-title">
        课程管理
        <button class="mini" @click="editCourse({ id: '', name: '', color: 0, type: 'course', slots: [] } as Course)">＋ 添加</button>
      </div>
      <div v-for="c in store.data.courses" :key="c.id" class="crow" @click="editCourse(c)">
        <span class="dot" :style="{ background: colorOf(c) }"></span>
        <span class="crow-name">{{ c.name }}</span>
        <span class="crow-sub">{{ courseSummary(c) }}</span>
        <span class="chev">›</span>
      </div>
    </section>

    <!-- 导入课表 -->
    <section class="card sec">
      <div class="sec-title">从教务系统导入课表</div>
      <details class="howto">
        <summary>导入步骤（换学期时用）</summary>
        <ol>
          <li>电脑浏览器登录教务系统 jxfw.gdut.edu.cn</li>
          <li>进入「信息查询 → 课表查询」，选好学期</li>
          <li>按 Ctrl+S 保存网页，保存类型选「<b>网页，全部</b>」</li>
          <li>回到这里，把保存的 HTML 文件选进来（可以连同生成的 xxx_files 文件夹里的 HTML 一起多选，识别更稳）</li>
        </ol>
      </details>
      <label class="filebtn">
        📂 选择保存的课表 HTML 文件（可多选）
        <input type="file" accept=".html,.htm,.txt" multiple hidden @change="onImportFile" />
      </label>
      <textarea
        v-model="pasteText"
        rows="3"
        placeholder="或者：在课表页面上 Ctrl+A 全选、Ctrl+C 复制，粘贴到这里"
      ></textarea>
      <button class="btn secondary full" @click="doParsePaste">解析并预览</button>
    </section>

    <!-- 备份 -->
    <section class="card sec">
      <div class="sec-title">数据备份</div>
      <div class="btnrow">
        <button class="btn secondary" @click="doExport">导出备份文件</button>
        <label class="btn secondary filebtn-inline">
          从备份恢复
          <input type="file" accept=".json" hidden @change="onBackupFile" />
        </label>
      </div>
      <div class="hint">换手机/换浏览器时：先导出，再在新设备上恢复</div>
    </section>

    <!-- 关于 -->
    <section class="card sec">
      <div class="sec-title">关于</div>
      <p class="hint">
        「我的课表」· 本地网页应用，数据只保存在你自己的浏览器里，不需要账号密码，没有服务器和上传。<br />
        手机上可通过「浏览器菜单 → 添加到主屏幕」像 App 一样使用。
      </p>
    </section>

    <ImportPreview
      v-if="importResult"
      :result="importResult"
      @confirm="confirmImport"
      @cancel="importResult = null"
    />
  </div>
</template>

<style scoped>
.sec {
  padding: 13px 14px;
  margin-bottom: 12px;
}
.sec-title {
  font-weight: 700;
  font-size: 14.5px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mini {
  border: none;
  background: var(--accent-weak);
  color: var(--accent);
  font-size: 12px;
  border-radius: 8px;
  padding: 5px 10px;
  font-weight: 600;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
}
.row-label {
  font-size: 14px;
}
.hint {
  color: var(--muted);
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.6;
}

.times {
  max-height: 240px;
  overflow: auto;
}
.trow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.tno {
  width: 48px;
  font-size: 13px;
  color: var(--text);
  flex: none;
}
.trow input {
  width: 96px;
  padding: 5px 6px;
}
.dash {
  color: var(--muted);
}

.sw {
  width: 40px;
  height: 22px;
  appearance: auto;
}
.swatches {
  display: flex;
  gap: 8px;
}
.swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  padding: 0;
}
.swatch.sel {
  border-color: var(--text);
  transform: scale(1.12);
}

.crow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}
.crow:last-child {
  border-bottom: none;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}
.crow-name {
  font-size: 14px;
  font-weight: 500;
  flex: none;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crow-sub {
  color: var(--muted);
  font-size: 11.5px;
  flex: 1;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chev {
  color: #c3c8d6;
}

.howto summary {
  cursor: pointer;
  color: var(--accent);
  font-size: 13px;
  margin-bottom: 8px;
}
.howto ol {
  margin: 0 0 10px 18px;
  padding: 0;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.9;
}
.filebtn {
  display: block;
  text-align: center;
  background: var(--accent-weak);
  color: var(--accent);
  border-radius: 10px;
  padding: 10px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
}
textarea {
  width: 100%;
  resize: vertical;
  margin-bottom: 8px;
  font-size: 12px;
}
.full {
  width: 100%;
}
.btnrow {
  display: flex;
  gap: 10px;
}
.btnrow .btn {
  flex: 1;
  text-align: center;
}
.filebtn-inline {
  display: inline-block;
}
</style>
