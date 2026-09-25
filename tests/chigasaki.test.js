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

    it('should generate correct POST parameters for actual measurement case', async () => {
      // 実測値のテスト（2026-09-25 基準日、2026-10-02 表示日）
      const client = new ChigasakiClient();
      
      // _postRequestをスパイ
      let capturedParams = null;
      const original_postRequest = client._postRequest.bind(client);
      client._postRequest = async function(params) {
        capturedParams = params;
        // モックレスポンスを返す
        return {
          text: async () => `
            <div class="SelectCalendarOuter">
              <table class="koma-table">
                <tr><th>10</th></tr>
                <tr><td style="background-color:#01fafa;">○</td></tr>
              </table>
            </div>
          `,
          headers: { get: () => null },
        };
      };
      
      // セッション初期化をスキップ
      client.sessionInitialized = true;
      
      try {
        await client.getAvailability({
          facilityCode: '016',
          date: '2026-10-02',
          baseDate: '2026-09-25',
        });
        
        // 実測値と一致することを確認
        assert.strictEqual(capturedParams.UserYM, '202609');
        assert.strictEqual(capturedParams.UseDay, '25');
        assert.strictEqual(capturedParams.UseDate, '20261002');
        assert.strictEqual(capturedParams.ShosetsuCode, '016');
        assert.strictEqual(capturedParams.disp_open, '0');
      } finally {
        // restore
        client._postRequest = original_postRequest;
      }
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

    it('should throw when data cells exist but no status is recognized', () => {
      const client = new ChigasakiClient();
      // データセルは存在するが、既知のステータスマーカーがない
      const html = `
        <div class="SelectCalendarOuter">
          <table class="koma-table">
            <tbody>
              <tr><th>10</th><th>11</th></tr>
              <tr>
                <td>大集会室全室(500人)</td>
                <td style="background-color:#ff0000;">?</td>
                <td style="background-color:#00ff00;">△</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      
      assert.throws(
        () => client._parseAvailabilityFromHtml(html, '016', '2026-09-25'),
        /could not recognize any status markers/
      );
    });

    it('should extract section from room name', () => {
      const client = new ChigasakiClient();
      // 体育室1 / 1 のように section を含む部屋名
      const html = `
        <div class="SelectCalendarOuter">
          <table class="koma-table">
            <tbody>
              <tr>
                <th>部屋名</th>
                <th>10</th>
                <th>11</th>
              </tr>
              <tr>
                <td>体育室1 / 1</td>
                <td style="background-color:#01fafa;">○</td>
                <td style="background-color:#ffffe0;">×</td>
              </tr>
              <tr>
                <td>体育室1 / 2</td>
                <td style="background-color:#ffffff;">-</td>
                <td style="background-color:#01fafa;">○</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      
      const availability = client._parseAvailabilityFromHtml(html, '001', '2026-09-25');
      
      assert.strictEqual(availability.length, 4);
      
      // 体育室1 / 1 の 10時
      const section1_10 = availability.find(s => s.time === '10:00' && s.section === '1');
      assert.ok(section1_10);
      assert.strictEqual(section1_10.room, '体育室1');
      assert.strictEqual(section1_10.section, '1');
      assert.strictEqual(section1_10.status, 'available');
      
      // 体育室1 / 2 の 11時
      const section2_11 = availability.find(s => s.time === '11:00' && s.section === '2');
      assert.ok(section2_11);
      assert.strictEqual(section2_11.room, '体育室1');
      assert.strictEqual(section2_11.section, '2');
      assert.strictEqual(section2_11.status, 'available');
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
