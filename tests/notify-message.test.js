/**
 * 通知メッセージ生成のテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { applyNotifyConditions, generateNotifyMessage } from '../src/core/notify-message.js';

describe('applyNotifyConditions', () => {
  const availabilities = [
    { date: '2026-09-25', time: '10:00', status: 'available' },
    { date: '2026-09-25', time: '18:00', status: 'available' },
    { date: '2026-09-26', time: '10:00', status: 'available' },
    { date: '2026-09-27', time: '18:00', status: 'available' },
  ];

  it('should filter by time range', () => {
    const config = {
      timeFrom: '18:00',
      timeTo: '22:00',
    };

    const filtered = applyNotifyConditions(availabilities, config);

    assert.strictEqual(filtered.length, 2);
    assert.ok(filtered.every(s => s.time >= '18:00'));
  });

  it('should filter by date range', () => {
    const config = {
      dateFrom: '2026-09-26',
      dateTo: '2026-09-27',
    };

    const filtered = applyNotifyConditions(availabilities, config);

    assert.strictEqual(filtered.length, 2);
    assert.ok(filtered.every(s => s.date >= '2026-09-26'));
  });

  it('should filter by day of week', () => {
    const config = {
      daysOfWeek: [4], // 木曜日のみ (2026-09-25は金曜日)
    };

    const filtered = applyNotifyConditions(availabilities, config);

    // 2026-09-25は金曜日(5)なので除外される
    assert.ok(filtered.length < availabilities.length);
  });

  it('should return all when no conditions', () => {
    const filtered = applyNotifyConditions(availabilities, {});

    assert.strictEqual(filtered.length, availabilities.length);
  });
});

describe('generateNotifyMessage', () => {
  it('should generate formatted message', () => {
    const availabilities = [
      { date: '2026-09-25', time: '10:00', status: 'available' },
      { date: '2026-09-25', time: '11:00', status: 'available' },
    ];

    const message = generateNotifyMessage(availabilities, 'テスト施設');

    assert.ok(message.includes('テスト施設'));
    assert.ok(message.includes('2026-09-25'));
    assert.ok(message.includes('10:00'));
    assert.ok(message.includes('11:00'));
    assert.ok(message.includes('合計: 2枠'));
  });

  it('should return null for empty array', () => {
    const message = generateNotifyMessage([], 'テスト施設');

    assert.strictEqual(message, null);
  });

  it('should include custom footer', () => {
    const availabilities = [
      { date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    const config = {
      footer: '予約はこちら: https://example.com',
    };

    const message = generateNotifyMessage(availabilities, 'テスト施設', config);

    assert.ok(message.includes('予約はこちら'));
  });
});
