#!/usr/bin/env node
/**
 * メインCLI
 * 既存運用構造に基づく実行
 */

import { App } from '../app.js';
import { createClient } from 'redis';

async function main() {
  const args = process.argv.slice(2);
  const configPath = args[0] || './config.json';

  console.log(`設定ファイル: ${configPath}\n`);

  try {
    // 設定読み込み
    const app = App.fromConfig(configPath);

    // Redisクライアント初期化（設定されている場合）
    if (process.env.REDIS_URL) {
      const redis = createClient({
        url: process.env.REDIS_URL,
      });

      redis.on('error', (err) => console.error('Redis Client Error', err));

      await redis.connect();
      console.log('Redis接続成功\n');

      app.storage.redis = redis;

      try {
        // 監視実行
        await app.run();
      } finally {
        // Redis切断
        await redis.quit();
      }
    } else {
      console.warn('警告: REDIS_URLが設定されていません');
      console.warn('ファイルベースのストレージにフォールバックします\n');
      
      // ファイルベースのフォールバック
      const { FileStorage } = await import('../storage/file.js');
      app.storage = new FileStorage();
      
      await app.run();
    }

    console.log('✅ 完了');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
