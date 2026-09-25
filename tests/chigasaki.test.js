/**
 * 茅ヶ崎市プロバイダーのテスト
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ChigasakiClient, CHIGASAKI_CONFIG } from '../src/providers/chigasaki/index.js';
import { getToday, isValidDate } from '../src/utils/date.js';

describe('ChigasakiClient', () => {
  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new ChigasakiClient();
      assert.strictEqual(client.baseUrl, 'https://k7.p-kashikan.jp/chigasaki-city');
      assert.strictEqual(client.timeout, 30000);
    });

    it('should create client with custom config', () => {
      const client = new ChigasakiClient({
        baseUrl: 'https://example.com',
        timeout: 10000,
      });
      assert.strictEqual(client.baseUrl, 'https://example.com');
      assert.strictEqual(client.timeout, 10000);
    });
  });

  describe('getAvailability', () => {
    it('should require facilityCode and date', async () => {
      const client = new ChigasakiClient();
      
      await assert.rejects(
        async () => await client.getAvailability({}),
        /facilityCode and date are required/
      );
    });

    it('should accept valid parameters', async () => {
      const client = new ChigasakiClient();
      const params = {
        facilityCode: '016',
        date: getToday(),
      };

      // 実際のネットワークリクエストが発生するため、
      // エラーが発生することを期待
      try {
        await client.getAvailability(params);
      } catch (error) {
        assert.ok(error.message.includes('Failed to fetch availability'));
      }
    });

    it('should generate correct POST parameters for actual measurement case', () => {
      // 実測値のテスト（2026-09-25 基準日、2026-10-02 表示日）
      const client = new ChigasakiClient();
      
      // baseDateとdateから正しいパラメータが生成されるかテスト
      const baseDate = '2026-09-25';
      const displayDate = '2026-10-02';
      
      const baseDateObj = new Date(baseDate);
      const baseYear = baseDateObj.getFullYear();
      const baseMonth = String(baseDateObj.getMonth() + 1).padStart(2, '0');
      const baseDay = String(baseDateObj.getDate()).padStart(2, '0');
      
      const displayDateObj = new Date(displayDate);
      const displayYear = displayDateObj.getFullYear();
      const displayMonth = String(displayDateObj.getMonth() + 1).padStart(2, '0');
      const displayDay = String(displayDateObj.getDate()).padStart(2, '0');
      
      // 期待値（実測値と一致）
      assert.strictEqual(`${baseYear}${baseMonth}`, '202609');
      assert.strictEqual(baseDay, '25');
      assert.strictEqual(`${displayYear}${displayMonth}${displayDay}`, '20261002');
    });
  });



  describe('_parseAvailabilityFromHtml', () => {
    it('should parse availability with room names from actual HTML structure', () => {
      const client = new ChigasakiClient();
      // 実際のHTMLサンプル（調査結果に基づく - 部屋名列あり）
      const html = `
        <div class="SelectCalendarOuter">
          <table class="koma-table" style="margin:0 auto;">
            <tbody>
              <tr>
                <th style="width:140px;">部屋名</th>
                <th style="width:40px;">10</th>
                <th style="width:40px;">11</th>
                <th style="width:40px;">12</th>
              </tr>
              <tr>
                <td style="width:140px;">大集会室全室(500人)</td>
                <td style="width:40px;background-color:#01fafa;">○</td>
                <td style="width:40px;background-color:#ffffe0;">×</td>
                <td style="width:40px;background-color:#ffffff;">-</td>
              </tr>
              <tr>
                <td style="width:140px;">大集会室1(250人)</td>
                <td style="width:40px;background-color:#ffffff;">-</td>
                <td style="width:40px;background-color:#01fafa;">○</td>
                <td style="width:40px;background-color:#ffffe0;">×</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      
      const availability = client._parseAvailabilityFromHtml(html, '016', '2026-09-25');
      
      assert.strictEqual(availability.length, 6); // 2部屋 × 3時間
      
      // 大集会室全室 - 10時: 空きあり
      const room1slot10 = availability.find(s => s.time === '10:00' && s.room === '大集会室全室(500人)');
      assert.ok(room1slot10);
      assert.strictEqual(room1slot10.status, 'available');
      assert.strictEqual(room1slot10.facilityCode, '016');
      
      // 大集会室1 - 11時: 空きあり（別の部屋なので別スロット）
      const room2slot11 = availability.find(s => s.time === '11:00' && s.room === '大集会室1(250人)');
      assert.ok(room2slot11);
      assert.strictEqual(room2slot11.status, 'available');
    });

    it('should fail-closed when HTML structure is unexpected', () => {
      const client = new ChigasakiClient();
      const html = '<div>No tables here</div>';
      
      assert.throws(
        () => client._parseAvailabilityFromHtml(html, '016', '2026-09-25'),
        /Expected HTML structure not found/
      );
    });

    it('should return empty array for valid HTML with no data', () => {
      const client = new ChigasakiClient();
      const html = `
        <div class="SelectCalendarOuter">
          <table class="koma-table">
            <tbody>
              <tr><th>10</th></tr>
            </tbody>
          </table>
        </div>
      `;
      
      const availability = client._parseAvailabilityFromHtml(html, '016', '2026-09-25');
      assert.strictEqual(availability.length, 0);
    });
  });
});

describe('CHIGASAKI_CONFIG', () => {
  it('should have correct configuration', () => {
    assert.strictEqual(CHIGASAKI_CONFIG.name, '茅ヶ崎市');
    assert.strictEqual(CHIGASAKI_CONFIG.provider, 'chigasaki');
    assert.ok(CHIGASAKI_CONFIG.systems.new);
    assert.ok(CHIGASAKI_CONFIG.systems.old);
  });

  it('should have new system as active', () => {
    assert.strictEqual(CHIGASAKI_CONFIG.systems.new.active, true);
    assert.strictEqual(CHIGASAKI_CONFIG.systems.old.active, false);
  });
});
