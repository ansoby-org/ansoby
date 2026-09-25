/**
 * 差分検出のテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDiff, getNewAvailabilities } from '../src/core/diff.js';

describe('getDiff', () => {
  it('should detect added availabilities', () => {
    const previous = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    const current = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
      { facilityCode: '016', date: '2026-09-25', time: '11:00', status: 'available' },
    ];

    const { added, removed } = getDiff(previous, current);

    assert.strictEqual(added.length, 1);
    assert.strictEqual(added[0].time, '11:00');
    assert.strictEqual(removed.length, 0);
  });

  it('should detect removed availabilities', () => {
    const previous = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
      { facilityCode: '016', date: '2026-09-25', time: '11:00', status: 'available' },
    ];

    const current = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    const { added, removed } = getDiff(previous, current);

    assert.strictEqual(added.length, 0);
    assert.strictEqual(removed.length, 1);
    assert.strictEqual(removed[0].time, '11:00');
  });

  it('should ignore reserved slots', () => {
    const previous = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    const current = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'reserved' },
      { facilityCode: '016', date: '2026-09-25', time: '11:00', status: 'available' },
    ];

    const { added, removed } = getDiff(previous, current);

    assert.strictEqual(added.length, 1);
    assert.strictEqual(added[0].time, '11:00');
    assert.strictEqual(removed.length, 1);
    assert.strictEqual(removed[0].time, '10:00');
  });

  it('should distinguish different rooms at same time', () => {
    const previous = [
      { facilityCode: '016', room: '大集会室全室(500人)', date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    const current = [
      { facilityCode: '016', room: '大集会室全室(500人)', date: '2026-09-25', time: '10:00', status: 'available' },
      { facilityCode: '016', room: '大集会室1(250人)', date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    const { added, removed } = getDiff(previous, current);

    // 別の部屋なので新規空きとして検出される
    assert.strictEqual(added.length, 1);
    assert.strictEqual(added[0].room, '大集会室1(250人)');
    assert.strictEqual(added[0].time, '10:00');
    assert.strictEqual(removed.length, 0);
  });
});

describe('getNewAvailabilities', () => {
  it('should return only added availabilities', () => {
    const previous = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    const current = [
      { facilityCode: '016', date: '2026-09-25', time: '11:00', status: 'available' },
    ];

    const newSlots = getNewAvailabilities(previous, current);

    assert.strictEqual(newSlots.length, 1);
    assert.strictEqual(newSlots[0].time, '11:00');
  });
});
