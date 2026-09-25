/**
 * LINE Messaging API通知クライアント
 * 
 * LINE Notifyは2025-03-31に終了したため、Messaging APIを使用
 * https://developers.line.biz/ja/reference/messaging-api/#send-push-message
 */

export class LineNotifier {
  constructor(config = {}) {
    this.channelAccessToken = config.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
    this.destination = config.destination || process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;
    this.endpoint = 'https://api.line.me/v2/bot/message/push';
    this.retryKey = config.retryKey;
    
    if (!this.channelAccessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required');
    }
    
    if (!this.destination) {
      throw new Error('LINE_GROUP_ID or LINE_USER_ID is required');
    }
  }

  /**
   * メッセージを送信する
   * @param {string} message - 送信するメッセージ
   * @returns {Promise<Object>} レスポンス
   */
  async send(message) {
    if (!message) {
      throw new Error('message is required');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.channelAccessToken}`,
    };

    // X-Line-Retry-Key for idempotency (optional)
    if (this.retryKey) {
      headers['X-Line-Retry-Key'] = this.retryKey;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: this.destination,
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LINE Messaging API error: ${response.status} - ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to send LINE notification: ${error.message}`);
    }
  }

  /**
   * 空き状況通知を送信する
   * @param {Array} availabilities - 空き状況の配列
   * @param {string} facilityName - 施設名
   * @returns {Promise<Object>} レスポンス
   */
  async notifyAvailability(availabilities, facilityName) {
    if (!availabilities || availabilities.length === 0) {
      return null;
    }

    const available = availabilities.filter(a => a.status === 'available');
    
    if (available.length === 0) {
      return null;
    }

    const message = this._formatAvailabilityMessage(available, facilityName);
    return await this.send(message);
  }

  /**
   * 空き状況メッセージをフォーマットする
   * @private
   * @param {Array} available - 空き状況の配列
   * @param {string} facilityName - 施設名
   * @returns {string} フォーマットされたメッセージ
   */
  _formatAvailabilityMessage(available, facilityName) {
    const lines = [
      `\n🏢 ${facilityName}`,
      `空きが見つかりました！`,
      ``,
    ];

    const byDate = available.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot.time);
      return acc;
    }, {});

    Object.entries(byDate).forEach(([date, times]) => {
      lines.push(`📅 ${date}`);
      times.sort().forEach(time => {
        lines.push(`  ✓ ${time}`);
      });
      lines.push('');
    });

    lines.push(`合計: ${available.length}枠`);

    return lines.join('\n');
  }
}
