/**
 * 空き状況監視・差分検出
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { ChigasakiClient } from '../providers/chigasaki/index.js';
import { LineNotifier } from '../notifier/line.js';

export class AvailabilityMonitor {
  constructor(config = {}) {
    this.client = config.client || new ChigasakiClient(config.clientConfig);
    this.notifier = config.notifier || new LineNotifier(config.lineConfig);
    this.stateFile = config.stateFile || './.availability-state.json';
  }

  /**
   * 前回の状態を読み込む
   * @private
   * @returns {Object} 前回の状態
   */
  _loadState() {
    if (!existsSync(this.stateFile)) {
      return {};
    }

    try {
      const content = readFileSync(this.stateFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load state:', error.message);
      return {};
    }
  }

  /**
   * 状態を保存する
   * @private
   * @param {Object} state - 保存する状態
   */
  _saveState(state) {
    try {
      writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save state:', error.message);
    }
  }

  /**
   * スロットのユニークキーを生成する
   * @private
   * @param {Object} slot - 空き状況スロット
   * @returns {string} ユニークキー
   */
  _getSlotKey(slot) {
    return `${slot.facilityCode}:${slot.date}:${slot.time}`;
  }

  /**
   * 新規の空きスロットを検出する
   * @param {Array} current - 現在の空き状況
   * @param {Array} previous - 前回の空き状況
   * @returns {Array} 新規の空きスロット
   */
  detectNewAvailabilities(current, previous) {
    const previousKeys = new Set(
      previous
        .filter(s => s.status === 'available')
        .map(s => this._getSlotKey(s))
    );

    return current.filter(slot => {
      if (slot.status !== 'available') {
        return false;
      }
      return !previousKeys.has(this._getSlotKey(slot));
    });
  }

  /**
   * 施設の空き状況を監視し、新規の空きを通知する
   * @param {Object} params - 監視パラメータ
   * @param {string} params.facilityCode - 施設コード
   * @param {string} params.facilityName - 施設名
   * @param {string} params.date - 検索日
   * @returns {Promise<Object>} 監視結果
   */
  async monitor(params) {
    const { facilityCode, facilityName, date } = params;

    if (!facilityCode || !facilityName || !date) {
      throw new Error('facilityCode, facilityName and date are required');
    }

    // 前回の状態を読み込む
    const state = this._loadState();
    const stateKey = `${facilityCode}:${date}`;
    const previousAvailability = state[stateKey] || [];

    // 現在の空き状況を取得
    const currentAvailability = await this.client.getAvailability({
      facilityCode,
      date,
    });

    // 新規の空きを検出
    const newAvailabilities = this.detectNewAvailabilities(
      currentAvailability,
      previousAvailability
    );

    // 新規の空きがあれば通知
    let notificationSent = false;
    let notificationError = null;
    
    if (newAvailabilities.length > 0) {
      try {
        await this.notifier.notifyAvailability(newAvailabilities, facilityName);
        notificationSent = true;
      } catch (error) {
        notificationError = error.message;
        console.error('Failed to send notification:', error.message);
        // 通知失敗時はstateを更新せずにエラーを返す
        throw new Error(`Notification failed: ${error.message}`);
      }
    }

    // 通知が成功した場合のみ状態を保存
    // （新規空きがない場合も保存）
    state[stateKey] = currentAvailability;
    
    try {
      this._saveState(state);
    } catch (error) {
      console.error('Failed to save state:', error.message);
      throw new Error(`State save failed: ${error.message}`);
    }

    return {
      facilityCode,
      facilityName,
      date,
      total: currentAvailability.length,
      available: currentAvailability.filter(a => a.status === 'available').length,
      newAvailabilities: newAvailabilities.length,
      notificationSent,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 複数の施設を監視する
   * @param {Array} facilities - 施設リスト
   * @param {string} date - 検索日
   * @returns {Promise<Array>} 監視結果の配列
   */
  async monitorMultiple(facilities, date) {
    const results = [];

    for (const facility of facilities) {
      try {
        const result = await this.monitor({
          facilityCode: facility.code,
          facilityName: facility.name,
          date,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to monitor ${facility.name}:`, error.message);
        results.push({
          facilityCode: facility.code,
          facilityName: facility.name,
          date,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }
}
