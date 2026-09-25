/**
 * LINE通知クライアント
 */

export class LineNotifier {
  constructor(config = {}) {
    this.accessToken = config.accessToken || process.env.LINE_NOTIFY_TOKEN;
    this.endpoint = 'https://notify-api.line.me/api/notify';
    
    if (!this.accessToken) {
      throw new Error('LINE_NOTIFY_TOKEN is required');
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

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: new URLSearchParams({ message }).toString(),
      });

      if (!response.ok) {
        throw new Error(`LINE Notify API error: ${response.status}`);
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
