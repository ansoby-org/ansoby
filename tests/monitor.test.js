/**
 * 空き状況監視のテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AvailabilityMonitor } from '../src/monitor/availability.js';
import { unlinkSync, existsSync } from 'fs';

// テスト用のモッククライアント
// 実際のgetAvailabilityの動作をシミュレート
class MockClient {
  async getAvailability({ facilityCode, date }) {
    // 実際のHTMLパース処理と同じ結果を返す
    return [
      {
        facilityCode,
        date,
        time: '10:00',
        status: 'available',
        provider: 'chigasaki',
        timestamp: new Date().toISOString(),
      },
      {
        facilityCode,
        date,
        time: '11:00',
        status: 'reserved',
        provider: 'chigasaki',
        timestamp: new Date().toISOString(),
      },
    ];
  }
}

// テスト用のモック通知（成功）
class MockNotifier {
  constructor() {
    this.lastMessage = null;
  }

  async notifyAvailability(availabilities, facilityName) {
    this.lastMessage = { availabilities, facilityName };
  }
}

// テスト用のモック通知（失敗）
class FailingNotifier {
  async notifyAvailability() {
    throw new Error('Network error');
  }
}

describe('AvailabilityMonitor', () => {
  const testStateFile = './.test-availability-state.json';

  // テスト後にクリーンアップ
  function cleanup() {
    if (existsSync(testStateFile)) {
      try {
        unlinkSync(testStateFile);
      } catch (e) {
        // ignore
      }
    }
  }

  describe('detectNewAvailabilities', () => {
    it('should detect new availabilities', () => {
      const monitor = new AvailabilityMonitor({
        client: new MockClient(),
        notifier: new MockNotifier(),
        stateFile: testStateFile,
      });

      const current = [
        { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
        { facilityCode: '016', date: '2026-09-25', time: '11:00', status: 'available' },
      ];

      const previous = [
        { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
      ];

      const newSlots = monitor.detectNewAvailabilities(current, previous);

      assert.strictEqual(newSlots.length, 1);
      assert.strictEqual(newSlots[0].time, '11:00');

      cleanup();
    });

    it('should return empty array when no new availabilities', () => {
      const monitor = new AvailabilityMonitor({
        client: new MockClient(),
        notifier: new MockNotifier(),
        stateFile: testStateFile,
      });

      const current = [
        { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
      ];

      const previous = [
        { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
      ];

      const newSlots = monitor.detectNewAvailabilities(current, previous);

      assert.strictEqual(newSlots.length, 0);

      cleanup();
    });
  });

  describe('_getSlotKey', () => {
    it('should generate unique key for slot', () => {
      const monitor = new AvailabilityMonitor({
        client: new MockClient(),
        notifier: new MockNotifier(),
        stateFile: testStateFile,
      });

      const slot = {
        facilityCode: '016',
        date: '2026-09-25',
        time: '10:00',
      };

      const key = monitor._getSlotKey(slot);
      assert.strictEqual(key, '016:2026-09-25:10:00');

      cleanup();
    });
  });

  describe('monitor notification failure handling', () => {
    it('should not save state when notification fails', async () => {
      cleanup();
      
      const monitor = new AvailabilityMonitor({
        client: new MockClient(),
        notifier: new FailingNotifier(),
        stateFile: testStateFile,
      });

      // 初回実行（通知失敗）
      await assert.rejects(
        async () => await monitor.monitor({
          facilityCode: '016',
          facilityName: 'テスト施設',
          date: '2026-09-25',
        }),
        /Notification failed/
      );

      // stateファイルが作成されていないことを確認
      assert.strictEqual(existsSync(testStateFile), false);

      cleanup();
    });

    it('should retry notification on next run after failure', async () => {
      cleanup();
      
      // 1回目: 通知失敗するモニター
      const failingMonitor = new AvailabilityMonitor({
        client: new MockClient(),
        notifier: new FailingNotifier(),
        stateFile: testStateFile,
      });

      try {
        await failingMonitor.monitor({
          facilityCode: '016',
          facilityName: 'テスト施設',
          date: '2026-09-25',
        });
      } catch (error) {
        // 通知失敗は期待通り
      }

      // 2回目: 成功するモニター
      const successMonitor = new AvailabilityMonitor({
        client: new MockClient(),
        notifier: new MockNotifier(),
        stateFile: testStateFile,
      });

      const result = await successMonitor.monitor({
        facilityCode: '016',
        facilityName: 'テスト施設',
        date: '2026-09-25',
      });

      // 前回失敗したため、同じ空きが再度検出される
      assert.strictEqual(result.newAvailabilities, 1);
      assert.strictEqual(result.notificationSent, true);

      cleanup();
    });
  });
});
