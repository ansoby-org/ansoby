/**
 * 監視対象フィルタリング
 * 
 * targetRoomSections 設定に基づいて、通知対象のスロットのみをフィルタリングします。
 */

/**
 * 監視対象スロットかどうかを判定
 * @param {Object} slot - 空き状況スロット
 * @param {Object} targetConfig - 監視対象設定
 * @returns {boolean} 監視対象の場合 true
 */
export function isTargetSlot(slot, targetConfig) {
  if (!targetConfig || Object.keys(targetConfig).length === 0) {
    // 設定がない場合は全て対象
    return true;
  }

  const { facilityCode, room, section } = slot;
  
  // 施設コードが対象設定に含まれているか
  if (!targetConfig[facilityCode]) {
    return false;
  }

  const facilityTargets = targetConfig[facilityCode];
  
  // 部屋が対象設定に含まれているか
  if (!facilityTargets[room]) {
    return false;
  }

  const roomTargets = facilityTargets[room];
  
  // 区画のチェック
  if (roomTargets.includes(null)) {
    // null を含む場合は、区画指定なし（部屋全体）が対象
    return section === null;
  }
  
  // 区画が対象リストに含まれているか
  return roomTargets.includes(section);
}

/**
 * 監視対象スロットのみをフィルタリング
 * @param {Array} slots - 空き状況スロットの配列
 * @param {Object} targetConfig - 監視対象設定
 * @returns {Array} フィルタリング後のスロット配列
 */
export function filterTargetSlots(slots, targetConfig) {
  if (!targetConfig || Object.keys(targetConfig).length === 0) {
    // 設定がない場合は全て対象
    return slots;
  }

  return slots.filter(slot => isTargetSlot(slot, targetConfig));
}
