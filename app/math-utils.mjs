export const isNumber = value => typeof value === 'number' && Number.isFinite(value);
export function dateStamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const stamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : NaN;
}
export function timeStamp(value) {
  if (typeof value !== 'string') return NaN;
  if (value.length === 10) return dateStamp(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(dateStamp(value.slice(0, 10)))) return NaN;
  return Date.parse(value);
}
export const recordKey = row => JSON.stringify([row.code, row.period, row.currency ?? '', row.unit ?? '', row.basis ?? '']);
export function hasReturnPromise(text) {
  const positive = text.replace(/(?:不|不能|无法|并非|不应|不会|不得)(?:承诺|保证)收益|(?:并非|不是|不存在)零风险/g, '');
  return /保证收益|稳赚|保本保收益|必涨|零风险|没有风险|风险为零/.test(positive);
}
export function safeRatio(numerator, denominator) {
  if (!isNumber(numerator) || !isNumber(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}
