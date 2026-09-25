/**
 * 茅ヶ崎市公共施設予約システム APIクライアント
 * 新システム (k7.p-kashikan.jp) 対応版
 */

export class ChigasakiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://k7.p-kashikan.jp/chigasaki-city';
    this.timeout = config.timeout || 30000;
  }

  /**
   * HTTPリクエストを実行する
   * @private
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}/${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'ansoby/0.1.0',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * 施設一覧を取得する
   * @returns {Promise<Array>} 施設一覧
   */
  async getFacilities() {
    try {
      const response = await this._request('index.php?op=sct');
      const html = await response.text();
      
      return this._parseFacilitiesFromHtml(html);
    } catch (error) {
      throw new Error(`Failed to fetch facilities: ${error.message}`);
    }
  }

  /**
   * 指定された施設の空き状況を取得する
   * @param {Object} params - 検索パラメータ
   * @param {string} params.facilityId - 施設ID
   * @param {string} params.date - 検索日 (YYYY-MM-DD形式)
   * @param {number} params.days - 検索日数 (デフォルト: 7)
   * @returns {Promise<Array>} 空き状況の配列
   */
  async getAvailability(params) {
    const { facilityId, date, days = 7 } = params;

    if (!facilityId || !date) {
      throw new Error('facilityId and date are required');
    }

    try {
      const searchParams = new URLSearchParams({
        op: 'calendar',
        facility_id: facilityId,
        target_date: date,
        days: days.toString(),
      });

      const response = await this._request(`index.php?${searchParams}`);
      const html = await response.text();
      
      return this._parseAvailabilityFromHtml(html, facilityId, date);
    } catch (error) {
      throw new Error(`Failed to fetch availability: ${error.message}`);
    }
  }

  /**
   * HTMLから施設一覧をパースする
   * @private
   * @param {string} html - HTMLコンテンツ
   * @returns {Array} 施設情報の配列
   */
  _parseFacilitiesFromHtml(html) {
    const facilities = [];
    
    const facilityPattern = /<a[^>]*href="[^"]*facility_id=(\d+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    
    while ((match = facilityPattern.exec(html)) !== null) {
      const [, id, name] = match;
      facilities.push({
        id,
        name: name.trim(),
        provider: 'chigasaki',
        system: 'new',
      });
    }

    return [...new Map(facilities.map(f => [f.id, f])).values()];
  }

  /**
   * HTMLから空き状況をパースする
   * @private
   * @param {string} html - HTMLコンテンツ
   * @param {string} facilityId - 施設ID
   * @param {string} baseDate - 基準日
   * @returns {Array} 空き状況の配列
   */
  _parseAvailabilityFromHtml(html, facilityId, baseDate) {
    const availability = [];
    
    const availabilityPattern = /<td[^>]*class="[^"]*available[^"]*"[^>]*data-date="([^"]+)"[^>]*data-time="([^"]+)"[^>]*>/gi;
    let match;
    
    while ((match = availabilityPattern.exec(html)) !== null) {
      const [, date, time] = match;
      availability.push({
        facilityId,
        date,
        time,
        status: 'available',
        provider: 'chigasaki',
        timestamp: new Date().toISOString(),
      });
    }

    const reservedPattern = /<td[^>]*class="[^"]*reserved[^"]*"[^>]*data-date="([^"]+)"[^>]*data-time="([^"]+)"[^>]*>/gi;
    
    while ((match = reservedPattern.exec(html)) !== null) {
      const [, date, time] = match;
      availability.push({
        facilityId,
        date,
        time,
        status: 'reserved',
        provider: 'chigasaki',
        timestamp: new Date().toISOString(),
      });
    }

    return availability.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }

  /**
   * 施設の詳細情報を取得する
   * @param {string} facilityId - 施設ID
   * @returns {Promise<Object>} 施設の詳細情報
   */
  async getFacilityDetails(facilityId) {
    if (!facilityId) {
      throw new Error('facilityId is required');
    }

    try {
      const response = await this._request(`index.php?op=facility&id=${facilityId}`);
      const html = await response.text();
      
      return this._parseFacilityDetailsFromHtml(html, facilityId);
    } catch (error) {
      throw new Error(`Failed to fetch facility details: ${error.message}`);
    }
  }

  /**
   * HTMLから施設詳細をパースする
   * @private
   * @param {string} html - HTMLコンテンツ
   * @param {string} facilityId - 施設ID
   * @returns {Object} 施設詳細情報
   */
  _parseFacilityDetailsFromHtml(html, facilityId) {
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const addressMatch = html.match(/住所[：:]\s*([^<\n]+)/i);
    const capacityMatch = html.match(/定員[：:]\s*(\d+)/i);

    return {
      id: facilityId,
      name: nameMatch ? nameMatch[1].trim() : '',
      address: addressMatch ? addressMatch[1].trim() : '',
      capacity: capacityMatch ? parseInt(capacityMatch[1], 10) : null,
      provider: 'chigasaki',
      system: 'new',
    };
  }
}
