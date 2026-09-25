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
  });



  describe('_parseAvailabilityFromHtml', () => {
    it('should parse availability from actual HTML structure', () => {
      const client = new ChigasakiClient();
      // 実際のHTMLサンプル（調査結果に基づく）
      const html = `
        <table class="koma-table" style="margin:0 auto;">
          <tbody>
            <tr>
              <th style="width:40px;">10</th>
              <th style="width:40px;">11</th>
              <th style="width:40px;">12</th>
            </tr>
            <tr>
              <td style="width:140px;background-color:#01fafa;">○</td>
              <td style="width:40px;background-color:#ffffe0;">×</td>
              <td style="width:40px;background-color:#ffffff;">-</td>
            </tr>
          </tbody>
        </table>
      `;
      
      const availability = client._parseAvailabilityFromHtml(html, '016', '2026-09-25');
      
      assert.strictEqual(availability.length, 3);
      assert.strictEqual(availability[0].status, 'available');
      assert.strictEqual(availability[0].time, '10:00');
      assert.strictEqual(availability[1].status, 'reserved');
      assert.strictEqual(availability[1].time, '11:00');
      assert.strictEqual(availability[2].status, 'unavailable');
      assert.strictEqual(availability[2].time, '12:00');
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
        <table class="koma-table">
          <tbody>
            <tr><th>10</th></tr>
          </tbody>
        </table>
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
