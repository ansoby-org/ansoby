/**
 * 監視対象フィルタリングのテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isTargetSlot, filterTargetSlots } from '../src/core/filter-targets.js';

describe('isTargetSlot', () => {
  it('should return true when no target config is provided', () => {
    const slot = {
      facilityCode: '001',
      room: '第1体育室',
      section: '面1',
    };
    
    assert.strictEqual(isTargetSlot(slot, null), true);
    assert.strictEqual(isTargetSlot(slot, {}), true);
  });

  it('should return true for target slot', () => {
    const slot = {
      facilityCode: '001',
      room: '第1体育室',
      section: '面1',
    };
    
    const config = {
      '001': {
        '第1体育室': ['面1', '面2', '面3', '面4', '面5', '面6'],
      },
    };
    
    assert.strictEqual(isTargetSlot(slot, config), true);
  });

  it('should return false for non-target section', () => {
    const slot = {
      facilityCode: '001',
      room: '第1体育室',
      section: '全面',
    };
    
    const config = {
      '001': {
        '第1体育室': ['面1', '面2', '面3', '面4', '面5', '面6'],
      },
    };
    
    assert.strictEqual(isTargetSlot(slot, config), false);
  });

  it('should return false for non-target facility', () => {
    const slot = {
      facilityCode: '003',
      room: '第1体育室',
      section: '面1',
    };
    
    const config = {
      '001': {
        '第1体育室': ['面1', '面2', '面3', '面4', '面5', '面6'],
      },
    };
    
    assert.strictEqual(isTargetSlot(slot, config), false);
  });

  it('should return false for non-target room', () => {
    const slot = {
      facilityCode: '001',
      room: '第3体育室',
      section: '面1',
    };
    
    const config = {
      '001': {
        '第1体育室': ['面1', '面2', '面3', '面4', '面5', '面6'],
      },
    };
    
    assert.strictEqual(isTargetSlot(slot, config), false);
  });

  it('should handle null section for room-level targets', () => {
    const slot = {
      facilityCode: '001',
      room: '第2体育室',
      section: null,
    };
    
    const config = {
      '001': {
        '第2体育室': [null],
      },
    };
    
    assert.strictEqual(isTargetSlot(slot, config), true);
  });

  it('should return false when section is specified but target is null', () => {
    const slot = {
      facilityCode: '001',
      room: '第2体育室',
      section: '面1',
    };
    
    const config = {
      '001': {
        '第2体育室': [null],
      },
    };
    
    assert.strictEqual(isTargetSlot(slot, config), false);
  });
});

describe('filterTargetSlots', () => {
  it('should return all slots when no config is provided', () => {
    const slots = [
      { facilityCode: '001', room: '第1体育室', section: '面1' },
      { facilityCode: '001', room: '第1体育室', section: '全面' },
    ];
    
    const filtered = filterTargetSlots(slots, null);
    assert.strictEqual(filtered.length, 2);
  });

  it('should filter 総合体育館 第1体育室 面1〜6', () => {
    const slots = [
      { facilityCode: '001', room: '第1体育室', section: '面1', time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第1体育室', section: '面2', time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第1体育室', section: '面3', time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第1体育室', section: '面4', time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第1体育室', section: '面5', time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第1体育室', section: '面6', time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第1体育室', section: '全面', time: '10:00', status: 'available' },
    ];
    
    const config = {
      '001': {
        '第1体育室': ['面1', '面2', '面3', '面4', '面5', '面6'],
      },
    };
    
    const filtered = filterTargetSlots(slots, config);
    
    // 面1〜6のみが残る（全面は除外）
    assert.strictEqual(filtered.length, 6);
    const sections = filtered.map(s => s.section).sort();
    assert.deepStrictEqual(sections, ['面1', '面2', '面3', '面4', '面5', '面6']);
  });

  it('should filter 市体育館 北面・南面', () => {
    const slots = [
      { facilityCode: '002', room: '体育室', section: '北面', time: '10:00', status: 'available' },
      { facilityCode: '002', room: '体育室', section: '南面', time: '10:00', status: 'available' },
      { facilityCode: '002', room: '体育室', section: '全面', time: '10:00', status: 'available' },
    ];
    
    const config = {
      '002': {
        '体育室': ['北面', '南面'],
      },
    };
    
    const filtered = filterTargetSlots(slots, config);
    
    // 北面・南面のみが残る（全面は除外）
    assert.strictEqual(filtered.length, 2);
    const sections = filtered.map(s => s.section).sort();
    assert.deepStrictEqual(sections, ['北面', '南面']);
  });

  it('should filter 第2体育室（区画なし）', () => {
    const slots = [
      { facilityCode: '001', room: '第1体育室', section: '面1', time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第2体育室', section: null, time: '10:00', status: 'available' },
      { facilityCode: '001', room: '第2体育室', section: '面1', time: '10:00', status: 'available' },
    ];
    
    const config = {
      '001': {
        '第1体育室': ['面1', '面2', '面3', '面4', '面5', '面6'],
        '第2体育室': [null],
      },
    };
    
    const filtered = filterTargetSlots(slots, config);
    
    // 第1体育室の面1と第2体育室（section=null）のみが残る
    assert.strictEqual(filtered.length, 2);
    
    const gym1 = filtered.filter(s => s.room === '第1体育室');
    assert.strictEqual(gym1.length, 1);
    assert.strictEqual(gym1[0].section, '面1');
    
    const gym2 = filtered.filter(s => s.room === '第2体育室');
    assert.strictEqual(gym2.length, 1);
    assert.strictEqual(gym2[0].section, null);
  });

  it('should handle multiple facilities', () => {
    const slots = [
      { facilityCode: '001', room: '第1体育室', section: '面1', time: '10:00', status: 'available' },
      { facilityCode: '002', room: '体育室', section: '北面', time: '10:00', status: 'available' },
      { facilityCode: '003', room: '会議室', section: null, time: '10:00', status: 'available' },
    ];
    
    const config = {
      '001': {
        '第1体育室': ['面1', '面2', '面3', '面4', '面5', '面6'],
      },
      '002': {
        '体育室': ['北面', '南面'],
      },
    };
    
    const filtered = filterTargetSlots(slots, config);
    
    // 001の面1と002の北面のみが残る（003は対象外）
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].facilityCode, '001');
    assert.strictEqual(filtered[1].facilityCode, '002');
  });
});
