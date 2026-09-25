/**
 * 空き状況監視のテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AvailabilityMonitor } from '../src/monitor/availability.js';
import { unlinkSync, existsSync } from 'fs';

// テスト用のモッククライアント
class MockClient {
  async getAvailability() {
    return [
      {
        facilityCode: '016',
        date: '2026-09-25',
        time: '10:00',
        status: 'available',
      },
      {
        facilityCode: '016',
        date: '2026-09-25',
        time: '11:00',
        status: 'reserved',
      },
    ];
  }
}

// テスト用のモック通知
class MockNotifier {
  constructor() {
    this.lastMessage = null;
  }

  async notifyAvailability(availabilities, facilityName) {
    this.lastMessage = { availabilities, facilityName };
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
});
