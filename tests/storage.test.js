/**
 * ストレージのテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FileStorage } from '../src/storage/file.js';
import { existsSync, rmSync } from 'fs';

describe('FileStorage', () => {
  const testDir = './.test-storage';
  
  function cleanup() {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }

  it('should save and load state', async () => {
    cleanup();
    
    const storage = new FileStorage({ stateDir: testDir });
    const data = [
      { facilityCode: '016', date: '2026-09-25', time: '10:00', status: 'available' },
    ];

    await storage.save('test-key', data);
    const loaded = await storage.load('test-key');

    assert.deepStrictEqual(loaded, data);

    cleanup();
  });

  it('should return empty array for non-existent key', async () => {
    cleanup();
    
    const storage = new FileStorage({ stateDir: testDir });
    const loaded = await storage.load('non-existent');

    assert.deepStrictEqual(loaded, []);

    cleanup();
  });

  it('should delete state', async () => {
    cleanup();
    
    const storage = new FileStorage({ stateDir: testDir });
    const data = [{ test: 'data' }];

    await storage.save('test-key', data);
    await storage.delete('test-key');
    const loaded = await storage.load('test-key');

    assert.deepStrictEqual(loaded, []);

    cleanup();
  });
});
