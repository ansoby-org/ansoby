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
    it('should require facilityId and date', async () => {
      const client = new ChigasakiClient();
      
      await assert.rejects(
        async () => await client.getAvailability({}),
        /facilityId and date are required/
      );
    });

    it('should accept valid parameters', async () => {
      const client = new ChigasakiClient();
      const params = {
        facilityId: '123',
        date: getToday(),
        days: 7,
      };

      try {
        await client.getAvailability(params);
      } catch (error) {
        assert.ok(error.message.includes('Failed to fetch availability'));
      }
    });
  });

  describe('getFacilityDetails', () => {
    it('should require facilityId', async () => {
      const client = new ChigasakiClient();
      
      await assert.rejects(
        async () => await client.getFacilityDetails(),
        /facilityId is required/
      );
    });
  });

  describe('_parseFacilitiesFromHtml', () => {
    it('should parse facilities from HTML', () => {
      const client = new ChigasakiClient();
      const html = `
        <a href="index.php?facility_id=101">施設A</a>
        <a href="index.php?facility_id=102">施設B</a>
        <a href="index.php?facility_id=101">施設A</a>
      `;
      
      const facilities = client._parseFacilitiesFromHtml(html);
      
      assert.strictEqual(facilities.length, 2);
      assert.strictEqual(facilities[0].id, '101');
      assert.strictEqual(facilities[0].name, '施設A');
      assert.strictEqual(facilities[1].id, '102');
      assert.strictEqual(facilities[1].name, '施設B');
    });

    it('should return empty array for no matches', () => {
      const client = new ChigasakiClient();
      const html = '<div>No facilities</div>';
      
      const facilities = client._parseFacilitiesFromHtml(html);
      
      assert.strictEqual(facilities.length, 0);
    });
  });

  describe('_parseAvailabilityFromHtml', () => {
    it('should parse availability from HTML', () => {
      const client = new ChigasakiClient();
      const html = `
        <td class="available" data-date="2026-09-25" data-time="09:00"></td>
        <td class="available" data-date="2026-09-25" data-time="10:00"></td>
        <td class="reserved" data-date="2026-09-25" data-time="11:00"></td>
      `;
      
      const availability = client._parseAvailabilityFromHtml(html, '123', '2026-09-25');
      
      assert.strictEqual(availability.length, 3);
      assert.strictEqual(availability[0].status, 'available');
      assert.strictEqual(availability[0].time, '09:00');
      assert.strictEqual(availability[2].status, 'reserved');
    });

    it('should sort by date and time', () => {
      const client = new ChigasakiClient();
      const html = `
        <td class="available" data-date="2026-09-26" data-time="09:00"></td>
        <td class="available" data-date="2026-09-25" data-time="10:00"></td>
        <td class="available" data-date="2026-09-25" data-time="09:00"></td>
      `;
      
      const availability = client._parseAvailabilityFromHtml(html, '123', '2026-09-25');
      
      assert.strictEqual(availability[0].date, '2026-09-25');
      assert.strictEqual(availability[0].time, '09:00');
      assert.strictEqual(availability[1].date, '2026-09-25');
      assert.strictEqual(availability[1].time, '10:00');
      assert.strictEqual(availability[2].date, '2026-09-26');
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
