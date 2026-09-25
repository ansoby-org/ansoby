/**
 * LINE通知のテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LineNotifier } from '../src/notifier/line.js';

describe('LineNotifier', () => {
  describe('constructor', () => {
    it('should throw error when channel access token is missing', () => {
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
      delete process.env.LINE_GROUP_ID;
      delete process.env.LINE_USER_ID;
      
      assert.throws(
        () => new LineNotifier(),
        /LINE_CHANNEL_ACCESS_TOKEN is required/
      );
    });

    it('should throw error when destination is missing', () => {
      assert.throws(
        () => new LineNotifier({ channelAccessToken: 'test-token' }),
        /LINE_GROUP_ID or LINE_USER_ID is required/
      );
    });

    it('should accept config from parameters', () => {
      const notifier = new LineNotifier({
        channelAccessToken: 'test-token',
        destination: 'test-group-id',
      });
      assert.strictEqual(notifier.channelAccessToken, 'test-token');
      assert.strictEqual(notifier.destination, 'test-group-id');
    });

    it('should accept config from environment', () => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = 'env-token';
      process.env.LINE_GROUP_ID = 'env-group-id';
      const notifier = new LineNotifier();
      assert.strictEqual(notifier.channelAccessToken, 'env-token');
      assert.strictEqual(notifier.destination, 'env-group-id');
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
      delete process.env.LINE_GROUP_ID;
    });
  });

  describe('_formatAvailabilityMessage', () => {
    it('should format availability message correctly', () => {
      const notifier = new LineNotifier({
        channelAccessToken: 'test',
        destination: 'test-group',
      });
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
