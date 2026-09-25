/**
 * Redis状態管理
 * 既存のansoby/court_reservation運用を踏襲
 */

export class RedisStorage {
  constructor(config = {}) {
    this.redis = config.redis;
    this.keyPrefix = config.keyPrefix || 'ansoby:availability:';
  }

  /**
   * 前回の状態を読み込む
   * @param {string} key - 状態のキー
   * @returns {Promise<Array|null>} 前回の空き状況（存在しない場合はnull）
   * @throws {Error} Redis障害またはJSON解析エラーの場合
   */
  async load(key) {
    if (!this.redis) {
      throw new Error('Redis client is not configured');
    }

    try {
      const data = await this.redis.get(this.keyPrefix + key);
      
      // キーが存在しない場合はnull（初回実行）
      if (data === null || data === undefined) {
        return null;
      }
      
      // JSON解析エラーはthrow（データ破損）
      try {
        return JSON.parse(data);
      } catch (parseError) {
        throw new Error(`Failed to parse state from Redis: ${parseError.message}`);
      }
    } catch (error) {
      // Redis障害はthrow
      if (error.message.startsWith('Failed to parse')) {
        throw error;
      }
      throw new Error(`Failed to load state from Redis: ${error.message}`);
    }
  }

  /**
   * 状態を保存する
   * @param {string} key - 状態のキー
   * @param {Array} data - 保存するデータ
   * @returns {Promise<void>}
   */
  async save(key, data) {
    if (!this.redis) {
      throw new Error('Redis client is not configured');
    }

    try {
      await this.redis.set(
        this.keyPrefix + key,
        JSON.stringify(data),
        'EX',
        86400 * 30 // 30日間保持
      );
    } catch (error) {
      throw new Error(`Failed to save state to Redis: ${error.message}`);
    }
  }

  /**
   * 状態を削除する
   * @param {string} key - 状態のキー
   * @returns {Promise<void>}
   */
  async delete(key) {
    if (!this.redis) {
      throw new Error('Redis client is not configured');
    }

    try {
      await this.redis.del(this.keyPrefix + key);
    } catch (error) {
      console.error('Failed to delete state from Redis:', error.message);
    }
  }
}
