/**
 * LINE Messaging API通知送信
 * 既存のansoby/court_reservation/src/pushLineMessages.jsを踏襲
 * fail-closed要件に対応（送信失敗を上位へ伝播）
 */

/**
 * LINE Messaging APIでメッセージを送信する
 * @param {string} message - 送信するメッセージ
 * @param {Object} config - 設定
 * @param {string} config.channelAccessToken - チャネルアクセストークン
 * @param {string} config.groupId - グループID
 * @param {string} config.userId - ユーザーID（groupIdがない場合）
 * @param {string} config.retryKey - リトライキー（オプション）
 * @returns {Promise<Object>} レスポンス
 */
export async function pushLineMessages(message, config) {
  const { channelAccessToken, groupId, userId, retryKey } = config;

  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required');
  }

  const destination = groupId || userId;
  if (!destination) {
    throw new Error('LINE_GROUP_ID or LINE_USER_ID is required');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${channelAccessToken}`,
  };

  // X-Line-Retry-Key for idempotency
  if (retryKey) {
    headers['X-Line-Retry-Key'] = retryKey;
  }

  const body = {
    to: destination,
    messages: [
      {
        type: 'text',
        text: message,
      },
    ],
  };

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // fail-closed: 送信失敗を上位へ伝播
      throw new Error(`LINE API error: ${response.status} - ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    // fail-closed: 送信失敗を上位へ伝播（既存実装の改善）
    throw new Error(`Failed to send LINE message: ${error.message}`);
  }
}
