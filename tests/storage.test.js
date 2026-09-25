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

  it('should return null for non-existent key', async () => {
    cleanup();
    
    const storage = new FileStorage({ stateDir: testDir });
    const loaded = await storage.load('non-existent');

    assert.strictEqual(loaded, null);

    cleanup();
  });

  it('should throw on corrupted state file', async () => {
    cleanup();
    
    const storage = new FileStorage({ stateDir: testDir });
    const filePath = storage.getFilePath('corrupt-key');
    
    // 不正なJSONを書き込む
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(filePath, '{invalid json}', 'utf-8');

    await assert.rejects(
      async () => await storage.load('corrupt-key'),
      /Failed to parse state from file/
    );

    cleanup();
  });

  it('should delete state', async () => {
    cleanup();
    
    const storage = new FileStorage({ stateDir: testDir });
    const data = [{ test: 'data' }];

    await storage.save('test-key', data);
    await storage.delete('test-key');
    const loaded = await storage.load('test-key');

    assert.strictEqual(loaded, null); // 削除後はnull

    cleanup();
  });
});
