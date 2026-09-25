/**
 * 差分検出
 * 既存のansoby/court_reservation/src/getDiff.jsを踏襲
 */

/**
 * スロットのユニークキーを生成
 * @param {Object} slot - 空き状況スロット
 * @returns {string} ユニークキー
 */
function getSlotKey(slot) {
  const room = slot.room || 'default';
  return `${slot.facilityCode}:${room}:${slot.date}:${slot.time}`;
}

/**
 * 差分を算出する
 * @param {Array} previous - 前回の空き状況
 * @param {Array} current - 現在の空き状況
 * @returns {Object} 差分（added/removed）
 */
export function getDiff(previous, current) {
  // 空きスロットのみを対象
  const prevAvailable = previous.filter(s => s.status === 'available');
  const currAvailable = current.filter(s => s.status === 'available');

  const prevKeys = new Set(prevAvailable.map(getSlotKey));
  const currKeys = new Set(currAvailable.map(getSlotKey));

  // 追加された空き
  const added = currAvailable.filter(slot => !prevKeys.has(getSlotKey(slot)));

  // 削除された空き（予約された）
  const removed = prevAvailable.filter(slot => !currKeys.has(getSlotKey(slot)));

  return { added, removed };
}

/**
 * 新規空きのみを取得（既存運用との互換性）
 * @param {Array} previous - 前回の空き状況
 * @param {Array} current - 現在の空き状況
 * @returns {Array} 新規の空きスロット
 */
export function getNewAvailabilities(previous, current) {
  const { added } = getDiff(previous, current);
  return added;
}
