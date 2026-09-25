/**
 * 茅ヶ崎市公共施設予約システム APIクライアント
 * 新システム (k7.p-kashikan.jp) 対応版
 * 
 * 実際のシステム調査結果に基づく実装:
 * - JSON APIは存在せず、POSTリクエストでHTMLを返す
 * - セッション管理（Cookie）が必要
 * - 空き状況は背景色とテキスト（○×-）で表現
 */

export class ChigasakiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://k7.p-kashikan.jp/chigasaki-city';
    this.timeout = config.timeout || 30000;
    this.sessionCookies = '';
  }

  /**
   * HTTPリクエストを実行する（POSTリクエスト）
   * @private
   */
  async _postRequest(params, options = {}) {
    const url = `${this.baseUrl}/index.php`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const body = new URLSearchParams(params).toString();

    try {
      const response = await fetch(url, {
        method: 'POST',
        body,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Referer': this.baseUrl + '/',
          'Cookie': this.sessionCookies,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Cookieを保存
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        this.sessionCookies = setCookie.split(';')[0];
      }

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
   * 施設一覧を取得する（実装予定）
   * @returns {Promise<Array>} 施設一覧
   */
  async getFacilities() {
    // TODO: 実際のシステムでは施設一覧を別途取得する必要がある
    // 現時点では既知の施設コードを返す
    return [
      {
        id: '016',
        name: '茅ヶ崎市コミュニティホール',
        provider: 'chigasaki',
        system: 'new',
      },
    ];
  }

  /**
   * 指定された施設の空き状況を取得する
   * @param {Object} params - 検索パラメータ
   * @param {string} params.facilityCode - 施設コード（例: '016'）
   * @param {string} params.date - 検索日 (YYYY-MM-DD形式)
   * @returns {Promise<Array>} 空き状況の配列
   */
  async getAvailability(params) {
    const { facilityCode, date } = params;

    if (!facilityCode || !date) {
      throw new Error('facilityCode and date are required');
    }

    // 日付をYYYYMMDD形式に変換
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const useDate = `${year}${month}${day}`;
    const userYM = `${year}${month}`;

    try {
      const postParams = {
        SshID: 'aid',
        UserYM: userYM,
        UseDay: day,
        UseDate: useDate,
        ShosetsuCode: facilityCode,
      };

      const response = await this._postRequest(postParams);
      const html = await response.text();
      
      return this._parseAvailabilityFromHtml(html, facilityCode, date);
    } catch (error) {
      throw new Error(`Failed to fetch availability: ${error.message}`);
    }
  }

  /**
   * HTMLから空き状況をパースする
   * 実際のHTML構造に基づく実装（fail-closed）
   * @private
   * @param {string} html - HTMLコンテンツ
   * @param {string} facilityCode - 施設コード
   * @param {string} date - 検索日 (YYYY-MM-DD)
   * @returns {Array} 空き状況の配列
   */
  _parseAvailabilityFromHtml(html, facilityCode, date) {
    // fail-closed: 必須マーカーが存在するか確認
    if (!html.includes('koma-table')) {
      throw new Error('Expected HTML structure not found: missing koma-table. This might be an error page or unexpected response.');
    }

    // 正常な空き状況ページの識別マーカーを確認
    // SelectCalendarOuter は空き状況カレンダー表示のコンテナ
    if (!html.includes('SelectCalendarOuter')) {
      throw new Error('Expected availability page structure not found: missing SelectCalendarOuter. This might not be a valid availability page.');
    }

    const availability = [];
    
    // テーブルを抽出
    const tablePattern = /<table[^>]*class="[^"]*koma-table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
    const tableMatches = html.matchAll(tablePattern);
    
    let foundTables = false;
    let foundValidTimeHeaders = false;
    
    for (const tableMatch of tableMatches) {
      foundTables = true;
      const tableHtml = tableMatch[1];
      
      // ヘッダー行から時間帯を取得
      const timeHeaders = [];
      const headerPattern = /<th[^>]*>(\d+)<\/th>/gi;
      let headerMatch;
      while ((headerMatch = headerPattern.exec(tableHtml)) !== null) {
        timeHeaders.push(headerMatch[1] + ':00');
        foundValidTimeHeaders = true;
      }
      
      // 時間帯ヘッダーがない場合は不正な構造
      if (timeHeaders.length === 0) {
        continue; // 次のテーブルを試す
      }
      
      // データ行を解析
      const rowPattern = /<tr>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1];
        
        // td要素を抽出
        const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let cellMatch;
        let cellIndex = 0;
        
        while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
          const fullCell = cellMatch[0];
          const cellContent = cellMatch[1].trim();
          
          // 背景色を取得
          const styleMatch = fullCell.match(/style="[^"]*background-color:\s*([^;"]+)/i);
          const bgColor = styleMatch ? styleMatch[1].toLowerCase() : '';
          
          // 時間帯が取得できている場合のみ処理
          if (cellIndex < timeHeaders.length) {
            const time = timeHeaders[cellIndex];
            let status;
            
            // 背景色またはテキストで状態を判定
            if (bgColor.includes('#01fafa') || bgColor.includes('rgb(1, 250, 250)') || cellContent === '○') {
              status = 'available';
            } else if (bgColor.includes('#ffffe0') || bgColor.includes('rgb(255, 255, 224)') || cellContent === '×') {
              status = 'reserved';
            } else if (bgColor.includes('#ffffff') || bgColor.includes('rgb(255, 255, 255)') || cellContent === '-') {
              status = 'unavailable';
            }
            
            if (status) {
              availability.push({
                facilityCode,
                date,
                time,
                status,
                provider: 'chigasaki',
                timestamp: new Date().toISOString(),
              });
            }
          }
          
          cellIndex++;
        }
      }
    }
    
    if (!foundTables) {
      throw new Error('No availability tables found in HTML. This might indicate an error or unexpected page structure.');
    }
    
    if (!foundValidTimeHeaders) {
      throw new Error('No valid time headers found in availability tables. The page structure may have changed.');
    }
    
    // データがない場合は空結果と解釈できるかチェック
    if (availability.length === 0) {
      // 空き状況テーブルと時間帯ヘッダーは存在したがデータがない = 正常な空結果として許容
      return [];
    }
    
    return availability.sort((a, b) => {
      const timeCompare = a.time.localeCompare(b.time);
      return timeCompare;
    });
  }

}
