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
   * @returns {Promise<Array>} 前回の空き状況
   */
  async load(key) {
    if (!this.redis) {
      throw new Error('Redis client is not configured');
    }

    try {
      const data = await this.redis.get(this.keyPrefix + key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load state from Redis:', error.message);
      return [];
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
