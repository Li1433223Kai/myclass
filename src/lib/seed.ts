import type { Course, Settings, SectionTime } from '../types'

/** 广工作息时间表（第 5 节为中午节 13:50–14:35，10–12 节为晚上 18:30–20:55） */
export const DEFAULT_SECTION_TIMES: SectionTime[] = [
  { start: '08:30', end: '09:15' },
  { start: '09:20', end: '10:05' },
  { start: '10:25', end: '11:10' },
  { start: '11:15', end: '12:00' },
  { start: '13:50', end: '14:35' },
  { start: '14:40', end: '15:25' },
  { start: '15:30', end: '16:15' },
  { start: '16:35', end: '17:20' },
  { start: '17:25', end: '18:10' },
  { start: '18:30', end: '19:15' },
  { start: '19:20', end: '20:05' },
  { start: '20:10', end: '20:55' }
]

/** 课程色板 */
export const COURSE_COLORS = [
  '#4E7CF6', // 蓝
  '#10B981', // 绿
  '#F59E0B', // 橙
  '#EF5350', // 红
  '#8B5CF6', // 紫
  '#06B6D4', // 青
  '#EC4899', // 粉
  '#84CC16'  // 黄绿
]

export const THEME_COLORS = [
  { value: '#4f6ef7', name: '学院蓝' },
  { value: '#10b981', name: '清新绿' },
  { value: '#f59e0b', name: '暖橙' },
  { value: '#8b5cf6', name: '优雅紫' },
  { value: '#ef5350', name: '活力红' },
  { value: '#0ea5e9', name: '天空蓝' }
]

const r = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/**
 * 2026 秋季真实课表（信息工程专业）。
 * 来源：教务系统课表页内嵌 kbxx JSON（xnxqdm=202601），按课程任务代码合并同一门课的多个时段。
 */
export function seedCourses(): Course[] {
  return [
    {
      id: 'c-1354278',
      name: '机器学习',
      code: 'TMP8741',
      teacher: '程昱',
      color: 0,
      type: 'course',
      slots: [
        { day: 4, startSection: 1, endSection: 2, weeks: [1, ...r(3, 9)], location: '教1-421' },
        { day: 5, startSection: 6, endSection: 7, weeks: [1, ...r(3, 9)], location: '教1-423' }
      ]
    },
    {
      id: 'c-1354286',
      name: 'Python程序设计',
      code: 'TMP9463',
      teacher: '张欢',
      color: 1,
      type: 'course',
      slots: [
        { day: 2, startSection: 1, endSection: 4, weeks: [10], location: '工1-404' },
        { day: 2, startSection: 5, endSection: 8, weeks: r(6, 8), location: '工1-404' },
        { day: 4, startSection: 3, endSection: 4, weeks: [1, ...r(3, 13)], location: '教2-529' }
      ]
    },
    {
      id: 'c-1354274',
      name: '数字图像处理',
      code: 'TMP8464',
      teacher: '何家峰',
      color: 2,
      type: 'course',
      slots: [{ day: 1, startSection: 1, endSection: 2, weeks: r(4, 19), location: '教2-527' }]
    },
    {
      id: 'c-1354266',
      name: '信息论基础',
      code: 'TMP6115',
      teacher: '李伟彤',
      color: 3,
      type: 'course',
      slots: [{ day: 5, startSection: 1, endSection: 2, weeks: [1, ...r(3, 17)], location: '教1-424' }]
    },
    {
      id: 'c-1354270',
      name: '现代通信网',
      code: 'TMP5943',
      teacher: '赖峻',
      color: 4,
      type: 'course',
      slots: [
        { day: 3, startSection: 6, endSection: 7, weeks: [1, ...r(3, 14)], location: '教2-525' },
        { day: 2, startSection: 5, endSection: 7, weeks: [9, 11], location: '工1-309' }
      ]
    },
    {
      id: 'c-1354302',
      name: '习近平新时代中国特色社会主义思想概论',
      code: 'TMP11934',
      teacher: '黄晓曦',
      color: 5,
      type: 'course',
      slots: [
        { day: 1, startSection: 3, endSection: 4, weeks: [1, ...r(3, 10), ...r(12, 19)], location: '教1-308' },
        { day: 2, startSection: 1, endSection: 2, weeks: [19], location: '教1-314' }
      ]
    },
    {
      id: 'c-1354310',
      name: '毛泽东思想和中国特色社会主义理论体系概论',
      code: 'TMP9625',
      teacher: '孙秀梅',
      color: 6,
      type: 'course',
      slots: [
        { day: 1, startSection: 6, endSection: 7, weeks: [...r(4, 7), ...r(9, 19)], location: '教3-305' },
        { day: 3, startSection: 8, endSection: 9, weeks: r(4, 6), location: '教3-305' }
      ]
    },
    {
      id: 'c-1354185',
      name: '形势与政策',
      code: 'TMP6146',
      teacher: '阳香华',
      color: 7,
      type: 'course',
      slots: [{ day: 5, startSection: 6, endSection: 7, weeks: [11, 12], location: '2号大教室' }]
    },
    {
      id: 'c-1354290',
      name: '工程训练',
      code: 'TMP1859',
      teacher: '刘桂贤',
      color: 1,
      type: 'course',
      slots: [{ day: 2, startSection: 1, endSection: 4, weeks: r(4, 9), location: '实4-211' }]
    },
    {
      id: 'c-1354298',
      name: '劳动教育',
      code: 'TMP11240',
      teacher: '吕元俊',
      color: 2,
      type: 'course',
      slots: [
        { day: 3, startSection: 8, endSection: 8, weeks: [9], location: '宿舍(大学城)' },
        { day: 5, startSection: 4, endSection: 4, weeks: [4], location: '宿舍(大学城)' }
      ]
    },
    {
      id: 'c-cad-2w',
      name: '电子线路CAD设计',
      teacher: '',
      color: 3,
      type: 'custom',
      note: '集中实训（第 2 周，白天全天）；如与实际安排不符可直接编辑本课程',
      slots: [
        { day: 1, startSection: 1, endSection: 9, weeks: [2], location: '' },
        { day: 2, startSection: 1, endSection: 9, weeks: [2], location: '' },
        { day: 3, startSection: 1, endSection: 9, weeks: [2], location: '' },
        { day: 4, startSection: 1, endSection: 9, weeks: [2], location: '' },
        { day: 5, startSection: 1, endSection: 9, weeks: [2], location: '' }
      ]
    }
  ]
}

export function defaultSettings(): Settings {
  return {
    semesterStart: '2026-08-31',
    sectionTimes: DEFAULT_SECTION_TIMES.map(t => ({ ...t })),
    showWeekend: false,
    theme: '#4f6ef7'
  }
}
