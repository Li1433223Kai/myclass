import { reactive } from 'vue'

/**
 * 共享时钟：Today/课表页都用它判断“现在”。
 * 支持 ?today=YYYY-MM-DD&now=HH:mm 调试参数（固定时间，便于验证上课/倒计时状态），正式使用不受影响。
 */
const params = new URLSearchParams(location.search)
const debugDate = params.get('today')
const debugTime = params.get('now')
export const debugFixed = !!(debugDate && /^\d{4}-\d{2}-\d{2}$/.test(debugDate))

function resolveNow(): Date {
  if (debugFixed) {
    const [y, m, d] = debugDate!.split('-').map(Number)
    const [hh, mm] = (debugTime || '10:00').split(':').map(Number)
    return new Date(y, m - 1, d, hh || 0, mm || 0)
  }
  return new Date()
}

export const clock = reactive({ now: resolveNow() })

let timer: number | undefined
export function startClock() {
  if (debugFixed || timer !== undefined) return
  timer = window.setInterval(() => {
    clock.now = new Date()
  }, 30000)
}
