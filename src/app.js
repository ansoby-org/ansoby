/**
 * メインアプリケーション
 * 既存のansoby/court_reservation/src/app.jsの運用構造を踏襲
 * 
 * 運用フロー:
 * 1. 定期実行（cron/systemd timer）
 * 2. 取得（ChigasakiClient）
 * 3. 前回状態との差分（getDiff）
 * 4. 通知条件適用（generateNotifyMessage）
 * 5. LINE Messaging API送信（pushLineMessages）
 */

import { ChigasakiClient } from './providers/chigasaki/index.js';
import { RedisStorage } from './storage/redis.js';
import { getDiff } from './core/diff.js';
import { applyNotifyConditions, generateNotifyMessage } from './core/notify-message.js';
import { pushLineMessages } from './notifier/push-line-messages.js';
import { readFileSync } from 'fs';

export class App {
  constructor(config) {
    this.config = config;
    this.client = new ChigasakiClient(config.client);
    this.storage = new RedisStorage(config.storage);
  }

  /**
   * 設定ファイルから初期化
   * @param {string} configPath - 設定ファイルのパス
   * @returns {App} アプリケーションインスタンス
   */
  static fromConfig(configPath) {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    return new App(config);
  }

  /**
   * 単一施設の監視を実行
   * @param {Object} facilityConfig - 施設設定
   * @returns {Promise<Object>} 実行結果
   */
  async runFacility(facilityConfig) {
    const { code, name, date, notifyConditions } = facilityConfig;
    const stateKey = `${code}:${date}`;

    try {
      // 1. 現在の空き状況を取得
      const current = await this.client.getAvailability({
        facilityCode: code,
        date,
      });

      // 2. 前回の状態を読み込む
      const previous = await this.storage.load(stateKey);

      // 3. 差分を算出
      const { added, removed } = getDiff(previous, current);

      if (added.length === 0) {
        console.log(`[${name}] 新規空きなし`);
        
        // 新規空きがない場合も状態を更新
        await this.storage.save(stateKey, current);
        
        return {
          facilityCode: code,
          facilityName: name,
          date,
          newAvailabilities: 0,
          notificationSent: false,
          success: true,
        };
      }

      console.log(`[${name}] 新規空き: ${added.length}枠`);

      // 4. 通知条件を適用
      const filtered = applyNotifyConditions(added, notifyConditions);

      if (filtered.length === 0) {
        console.log(`[${name}] 通知条件に一致せず`);
        
        // 通知しなくても状態は更新
        await this.storage.save(stateKey, current);
        
        return {
          facilityCode: code,
          facilityName: name,
          date,
          newAvailabilities: added.length,
          filtered: 0,
          notificationSent: false,
          success: true,
        };
      }

      console.log(`[${name}] 通知対象: ${filtered.length}枠`);

      // 5. 通知メッセージを生成
      const message = generateNotifyMessage(filtered, name, notifyConditions);

      if (!message) {
        console.log(`[${name}] メッセージ生成失敗`);
        await this.storage.save(stateKey, current);
        
        return {
          facilityCode: code,
          facilityName: name,
          date,
          newAvailabilities: added.length,
          filtered: filtered.length,
          notificationSent: false,
          success: true,
        };
      }

      // 6. LINE Messaging APIで送信
      try {
        await pushLineMessages(message, {
          channelAccessToken: this.config.line.channelAccessToken,
          groupId: this.config.line.groupId,
          userId: this.config.line.userId,
          retryKey: `${code}:${date}:${Date.now()}`,
        });

        console.log(`[${name}] LINE通知送信成功`);

        // 7. 通知成功後に状態を保存
        await this.storage.save(stateKey, current);

        return {
          facilityCode: code,
          facilityName: name,
          date,
          newAvailabilities: added.length,
          filtered: filtered.length,
          notificationSent: true,
          success: true,
        };

      } catch (error) {
        console.error(`[${name}] LINE通知送信失敗:`, error.message);
        
        // fail-closed: 送信失敗時は状態を保存しない
        throw new Error(`LINE notification failed for ${name}: ${error.message}`);
      }

    } catch (error) {
      console.error(`[${name}] 処理失敗:`, error.message);
      
      return {
        facilityCode: code,
        facilityName: name,
        date,
        error: error.message,
        success: false,
      };
    }
  }

  /**
   * 全施設の監視を実行
   * @returns {Promise<Array>} 実行結果の配列
   */
  async run() {
    console.log('='.repeat(60));
    console.log('ansoby - 空き状況監視');
    console.log(new Date().toLocaleString('ja-JP'));
    console.log('='.repeat(60));
    console.log('');

    const results = [];

    for (const facilityConfig of this.config.facilities) {
      try {
        const result = await this.runFacility(facilityConfig);
        results.push(result);
      } catch (error) {
        console.error(`施設処理エラー:`, error.message);
        results.push({
          facilityCode: facilityConfig.code,
          facilityName: facilityConfig.name,
          error: error.message,
          success: false,
        });
      }

      // レート制限対策: 1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // サマリー
    console.log('');
    console.log('='.repeat(60));
    console.log('実行結果サマリー');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const notified = results.filter(r => r.notificationSent).length;
    const totalNew = results.reduce((sum, r) => sum + (r.newAvailabilities || 0), 0);

    console.log(`成功: ${successful}件`);
    console.log(`失敗: ${failed}件`);
    console.log(`通知送信: ${notified}件`);
    console.log(`新規空き: ${totalNew}枠`);
    console.log('');

    return results;
  }
}
