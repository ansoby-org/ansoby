/**
 * 設定ファイルのテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';

describe('config.example.json', () => {
  it('should be valid JSON', () => {
    const configContent = readFileSync('./config.example.json', 'utf-8');
    
    // JSONとしてパース可能
    let config;
    assert.doesNotThrow(() => {
      config = JSON.parse(configContent);
    });
    
    // 必須フィールドが存在する
    assert.ok(config.client);
    assert.ok(config.storage);
    assert.ok(config.line);
    assert.ok(Array.isArray(config.facilities));
  });

  it('should have valid structure', () => {
    const configContent = readFileSync('./config.example.json', 'utf-8');
    const config = JSON.parse(configContent);
    
    // client
    assert.strictEqual(typeof config.client.baseUrl, 'string');
    assert.strictEqual(typeof config.client.timeout, 'number');
    
    // storage
    assert.ok('keyPrefix' in config.storage);
    
    // line
    assert.strictEqual(typeof config.line.channelAccessToken, 'string');
    
    // facilities
    assert.ok(config.facilities.length > 0);
    const facility = config.facilities[0];
    assert.strictEqual(typeof facility.code, 'string');
    assert.strictEqual(typeof facility.name, 'string');
    assert.strictEqual(typeof facility.baseDate, 'string');
    assert.strictEqual(typeof facility.date, 'string');
    assert.ok(facility.notifyConditions);
  });

  it('should have optional targetRoomSections', () => {
    const configContent = readFileSync('./config.example.json', 'utf-8');
    const config = JSON.parse(configContent);
    
    if (config.targetRoomSections) {
      // targetRoomSectionsが存在する場合は、構造が正しいか確認
      assert.strictEqual(typeof config.targetRoomSections, 'object');
      
      // 各施設コードに対して、部屋と区画の配列が存在する
      for (const facilityCode in config.targetRoomSections) {
        const rooms = config.targetRoomSections[facilityCode];
        assert.strictEqual(typeof rooms, 'object');
        
        for (const roomName in rooms) {
          const sections = rooms[roomName];
          assert.ok(Array.isArray(sections));
        }
      }
    }
  });
});
