/**
 * 日付ユーティリティのテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatDate,
  parseDate,
  addDays,
  getDateRange,
  getToday,
  isValidDate,
} from '../src/utils/date.js';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date(2026, 8, 25);
      assert.strictEqual(formatDate(date), '2026-09-25');
    });

    it('should pad single digit month and day', () => {
      const date = new Date(2026, 0, 5);
      assert.strictEqual(formatDate(date), '2026-01-05');
    });
  });

  describe('parseDate', () => {
    it('should parse date string correctly', () => {
      const date = parseDate('2026-09-25');
      assert.strictEqual(date.getFullYear(), 2026);
      assert.strictEqual(date.getMonth(), 8);
      assert.strictEqual(date.getDate(), 25);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date(2026, 8, 25);
      const result = addDays(date, 5);
      assert.strictEqual(formatDate(result), '2026-09-30');
    });

    it('should handle month boundary', () => {
      const date = new Date(2026, 8, 30);
      const result = addDays(date, 1);
      assert.strictEqual(formatDate(result), '2026-10-01');
    });

    it('should handle negative days', () => {
      const date = new Date(2026, 8, 25);
      const result = addDays(date, -5);
      assert.strictEqual(formatDate(result), '2026-09-20');
    });
  });

  describe('getDateRange', () => {
    it('should generate date range', () => {
      const start = new Date(2026, 8, 25);
      const end = new Date(2026, 8, 27);
      const range = getDateRange(start, end);
      
      assert.strictEqual(range.length, 3);
      assert.strictEqual(range[0], '2026-09-25');
      assert.strictEqual(range[1], '2026-09-26');
      assert.strictEqual(range[2], '2026-09-27');
    });

    it('should handle single day range', () => {
      const date = new Date(2026, 8, 25);
      const range = getDateRange(date, date);
      
      assert.strictEqual(range.length, 1);
      assert.strictEqual(range[0], '2026-09-25');
    });
  });

  describe('getToday', () => {
    it('should return today in YYYY-MM-DD format', () => {
      const today = getToday();
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(today));
    });
  });

  describe('isValidDate', () => {
    it('should validate correct date format', () => {
      assert.strictEqual(isValidDate('2026-09-25'), true);
      assert.strictEqual(isValidDate('2026-12-31'), true);
    });

    it('should reject invalid format', () => {
      assert.strictEqual(isValidDate('2026/09/25'), false);
      assert.strictEqual(isValidDate('26-09-25'), false);
      assert.strictEqual(isValidDate('2026-9-25'), false);
      assert.strictEqual(isValidDate('not-a-date'), false);
    });

    it('should reject invalid dates', () => {
      assert.strictEqual(isValidDate('2026-13-01'), false);
      assert.strictEqual(isValidDate('2026-02-30'), false);
    });
  });
});
