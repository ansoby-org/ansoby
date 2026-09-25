/**
 * 日付関連のユーティリティ関数
 */

/**
 * 日付をYYYY-MM-DD形式にフォーマットする
 * @param {Date} date - 日付オブジェクト
 * @returns {string} YYYY-MM-DD形式の文字列
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付文字列をパースする
 * @param {string} dateStr - 日付文字列 (YYYY-MM-DD)
 * @returns {Date} 日付オブジェクト
 */
export function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 指定した日数後の日付を取得する
 * @param {Date} date - 基準日
 * @param {number} days - 日数
 * @returns {Date} 日数後の日付
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 日付範囲を生成する
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @returns {Array<string>} 日付文字列の配列 (YYYY-MM-DD)
 */
export function getDateRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}

/**
 * 今日の日付を取得する (YYYY-MM-DD形式)
 * @returns {string} 今日の日付
 */
export function getToday() {
  return formatDate(new Date());
}

/**
 * 日付が有効かチェックする
 * @param {string} dateStr - 日付文字列 (YYYY-MM-DD)
 * @returns {boolean} 有効な日付かどうか
 */
export function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  
  const date = parseDate(dateStr);
  if (!(date instanceof Date) || isNaN(date)) {
    return false;
  }
  
  return formatDate(date) === dateStr;
}
