/** 单文件版（file:// 直接打开）使用：file:// 下没有 Service Worker，注册为空操作 */
export function registerSW(_options?: Record<string, unknown>) {
  return () => {}
}
