/**
 * Appクラスのテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App } from '../src/app.js';

// テスト用のモッククライアント
class MockClient {
  async getAvailability({ facilityCode, date }) {
    return [
      {
        facilityCode,
        room: '大集会室全室(500人)',
        date,
        time: '10:00',
        status: 'available',
        provider: 'chigasaki',
        timestamp: new Date().toISOString(),
      },
    ];
  }
}

// テスト用の失敗するクライアント
class FailingClient {
  async getAvailability() {
    throw new Error('Failed to fetch availability: Network error');
  }

  async _initializeSession() {
    // セッション初期化をスキップ
  }
}

// テスト用のモックストレージ
class MockStorage {
  constructor() {
    this.data = {};
  }

  async load(key) {
    return this.data[key] || null;
  }

  async save(key, data) {
    this.data[key] = data;
  }
}

// テスト用の失敗するストレージ（read error）
class FailingStorage {
  async load() {
    throw new Error('Redis connection failed');
  }

  async save() {
    throw new Error('Redis connection failed');
  }
}

describe('App', () => {
  describe('run', () => {
    it('should throw when facility processing fails', async () => {
      const app = new App({
        client: new FailingClient(),
        storage: new MockStorage(),
        facilities: [
          {
            code: '016',
            name: 'テスト施設',
            date: '2026-09-25',
            notifyConditions: {},
          },
        ],
        line: {
          channelAccessToken: 'test-token',
          groupId: 'test-group',
        },
      });

      app.client = new FailingClient();

      await assert.rejects(
        async () => await app.run(),
        /One or more facilities failed/
      );
    });

    it('should throw when storage load fails', async () => {
      const app = new App({
        client: new MockClient(),
        storage: new FailingStorage(),
        facilities: [
          {
            code: '016',
            name: 'テスト施設',
            date: '2026-09-25',
            notifyConditions: {},
          },
        ],
        line: {
          channelAccessToken: 'test-token',
          groupId: 'test-group',
        },
      });

      await assert.rejects(
        async () => await app.run(),
        /One or more facilities failed/
      );
    });

    it('should distinguish initial run (null) from empty state ([])', async () => {
      const storage = new MockStorage();
      const app = new App({
        client: new MockClient(),
        storage,
        facilities: [
          {
            code: '016',
            name: 'テスト施設',
            date: '2026-09-25',
            notifyConditions: {},
          },
        ],
        line: {
          channelAccessToken: 'test-token',
          groupId: 'test-group',
        },
      });

      // 初回実行（null）
      const stateKey = '016:2026-09-25';
      const loaded = await storage.load(stateKey);
      assert.strictEqual(loaded, null);

      // 空の状態を保存
      await storage.save(stateKey, []);
      const loaded2 = await storage.load(stateKey);
      assert.deepStrictEqual(loaded2, []);
    });
  });
});
