/** 节次范围显示：8,8 → “第8节”；1,2 → “第1-2节” */
export function secsLabel(a: number, b: number): string {
  return a === b ? `第${a}节` : `第${a}-${b}节`
}
