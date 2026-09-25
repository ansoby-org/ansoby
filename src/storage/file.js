/**
 * ファイルベース状態管理（Redisのフォールバック）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class FileStorage {
  constructor(config = {}) {
    this.stateDir = config.stateDir || './.ansoby-state';
    this.ensureStateDir();
  }

  /**
   * 状態ディレクトリを作成
   * @private
   */
  ensureStateDir() {
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * キーからファイルパスを生成
   * @private
   * @param {string} key - 状態のキー
   * @returns {string} ファイルパス
   */
  getFilePath(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${this.stateDir}/${safeKey}.json`;
  }

  /**
   * 前回の状態を読み込む
   * @param {string} key - 状態のキー
   * @returns {Promise<Array>} 前回の空き状況
   */
  async load(key) {
    const filePath = this.getFilePath(key);

    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load state from file:', error.message);
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
    const filePath = this.getFilePath(key);

    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save state to file: ${error.message}`);
    }
  }

  /**
   * 状態を削除する
   * @param {string} key - 状態のキー
   * @returns {Promise<void>}
   */
  async delete(key) {
    const filePath = this.getFilePath(key);

    if (existsSync(filePath)) {
      try {
        const { unlinkSync } = await import('fs');
        unlinkSync(filePath);
      } catch (error) {
        console.error('Failed to delete state file:', error.message);
      }
    }
  }
}
