/**
 * LINE通知のテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LineNotifier } from '../src/notifier/line.js';

describe('LineNotifier', () => {
  describe('constructor', () => {
    it('should throw error when token is missing', () => {
      delete process.env.LINE_NOTIFY_TOKEN;
      
      assert.throws(
        () => new LineNotifier(),
        /LINE_NOTIFY_TOKEN is required/
      );
    });

    it('should accept token from config', () => {
      const notifier = new LineNotifier({ accessToken: 'test-token' });
      assert.strictEqual(notifier.accessToken, 'test-token');
    });

    it('should accept token from environment', () => {
      process.env.LINE_NOTIFY_TOKEN = 'env-token';
      const notifier = new LineNotifier();
      assert.strictEqual(notifier.accessToken, 'env-token');
      delete process.env.LINE_NOTIFY_TOKEN;
    });
  });

  describe('_formatAvailabilityMessage', () => {
    it('should format availability message correctly', () => {
      const notifier = new LineNotifier({ accessToken: 'test' });
      const available = [
        { date: '2026-09-25', time: '10:00', status: 'available' },
        { date: '2026-09-25', time: '11:00', status: 'available' },
        { date: '2026-09-26', time: '09:00', status: 'available' },
      ];

      const message = notifier._formatAvailabilityMessage(available, 'テスト施設');

      assert.ok(message.includes('テスト施設'));
      assert.ok(message.includes('2026-09-25'));
      assert.ok(message.includes('10:00'));
      assert.ok(message.includes('11:00'));
      assert.ok(message.includes('2026-09-26'));
      assert.ok(message.includes('09:00'));
      assert.ok(message.includes('合計: 3枠'));
    });
  });
});
