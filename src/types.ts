export interface Slot {
  /** 星期几，1=周一 … 7=周日 */
  day: number
  /** 起始节次（从 1 开始） */
  startSection: number
  /** 结束节次（含） */
  endSection: number
  /** 上课周次列表（显式展开，如 1,3-9 存为 [1,3,4,5,6,7,8,9]） */
  weeks: number[]
  location: string
}

export type CourseType = 'course' | 'custom'

export interface Course {
  id: string
  name: string
  /** 课程编号，如 TMP8464 */
  code?: string
  teacher?: string
  /** 主题色索引（COURSE_COLORS 数组下标） */
  color: number
  note?: string
  /** course=教务课程（导入时会被替换），custom=自定义事项（导入时保留） */
  type: CourseType
  slots: Slot[]
}

export interface SectionTime {
  start: string
  end: string
}

export interface Settings {
  /** 学期第 1 周周一的日期，如 2026-08-31 */
  semesterStart: string
  sectionTimes: SectionTime[]
  /** 是否显示周六/周日列 */
  showWeekend: boolean
  /** 主题色 */
  theme: string
}

export interface AppData {
  version: number
  courses: Course[]
  settings: Settings
}
