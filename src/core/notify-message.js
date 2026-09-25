/**
 * 通知メッセージ生成
 * 既存のansoby/court_reservation/src/generateNotifyMessage.jsを踏襲
 */

/**
 * 通知条件を適用する
 * @param {Array} availabilities - 空き状況の配列
 * @param {Object} config - 通知条件の設定
 * @returns {Array} 通知対象の空き状況
 */
export function applyNotifyConditions(availabilities, config = {}) {
  let filtered = availabilities;

  // 日付範囲フィルター
  if (config.dateFrom || config.dateTo) {
    filtered = filtered.filter(slot => {
      if (config.dateFrom && slot.date < config.dateFrom) return false;
      if (config.dateTo && slot.date > config.dateTo) return false;
      return true;
    });
  }

  // 時間帯フィルター
  if (config.timeFrom || config.timeTo) {
    filtered = filtered.filter(slot => {
      if (config.timeFrom && slot.time < config.timeFrom) return false;
      if (config.timeTo && slot.time > config.timeTo) return false;
      return true;
    });
  }

  // 曜日フィルター
  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    filtered = filtered.filter(slot => {
      const date = new Date(slot.date);
      const dayOfWeek = date.getDay(); // 0=日曜, 6=土曜
      return config.daysOfWeek.includes(dayOfWeek);
    });
  }

  return filtered;
}

/**
 * 通知メッセージを生成する
 * @param {Array} availabilities - 空き状況の配列
 * @param {string} facilityName - 施設名
 * @param {Object} config - メッセージ設定
 * @returns {string} 通知メッセージ
 */
export function generateNotifyMessage(availabilities, facilityName, config = {}) {
  if (!availabilities || availabilities.length === 0) {
    return null;
  }

  const lines = [];

  // ヘッダー
  if (config.header) {
    lines.push(config.header);
  } else {
    lines.push(`\n🏢 ${facilityName}`);
    lines.push(`空きが見つかりました！`);
  }
  lines.push('');

  // 日付ごとにグループ化
  const byDate = availabilities.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot.time);
    return acc;
  }, {});

  // 日付・時刻リスト
  Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, times]) => {
      lines.push(`📅 ${date}`);
      times.sort().forEach(time => {
        lines.push(`  ✓ ${time}`);
      });
      lines.push('');
    });

  // フッター
  lines.push(`合計: ${availabilities.length}枠`);

  if (config.footer) {
    lines.push('');
    lines.push(config.footer);
  }

  return lines.join('\n');
}
