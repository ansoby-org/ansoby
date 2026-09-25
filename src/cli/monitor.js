#!/usr/bin/env node
/**
 * 空き状況監視CLI
 */

import { AvailabilityMonitor } from '../monitor/availability.js';
import { CHIGASAKI_CONFIG } from '../providers/chigasaki/index.js';
import { getToday, addDays, formatDate } from '../utils/date.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: node src/cli/monitor.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --facility <code>    施設コード（デフォルト: 016）');
    console.log('  --date <YYYY-MM-DD>  検索日（デフォルト: 今日）');
    console.log('  --days <number>      検索日数（デフォルト: 7）');
    console.log('  --help               ヘルプを表示');
    console.log('');
    console.log('Environment variables:');
    console.log('  LINE_NOTIFY_TOKEN    LINE Notifyアクセストークン（必須）');
    console.log('');
    console.log('Examples:');
    console.log('  node src/cli/monitor.js');
    console.log('  node src/cli/monitor.js --facility 016 --date 2026-09-25');
    console.log('  node src/cli/monitor.js --days 14');
    process.exit(0);
  }

  // 環境変数チェック
  if (!process.env.LINE_NOTIFY_TOKEN) {
    console.error('Error: LINE_NOTIFY_TOKEN environment variable is required');
    console.error('Set it with: export LINE_NOTIFY_TOKEN=your_token_here');
    process.exit(1);
  }

  // パラメータ解析
  let facilityCode = '016';
  let startDate = getToday();
  let days = 7;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--facility' && args[i + 1]) {
      facilityCode = args[i + 1];
      i++;
    } else if (args[i] === '--date' && args[i + 1]) {
      startDate = args[i + 1];
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // 施設情報を取得
  const facility = CHIGASAKI_CONFIG.facilities[facilityCode];
  if (!facility) {
    console.error(`Error: Unknown facility code '${facilityCode}'`);
    console.error('Available facilities:');
    Object.entries(CHIGASAKI_CONFIG.facilities).forEach(([code, fac]) => {
      console.error(`  ${code}: ${fac.name}`);
    });
    process.exit(1);
  }

  console.log(`\n🔍 空き状況監視を開始`);
  console.log(`施設: ${facility.name} (${facilityCode})`);
  console.log(`期間: ${startDate} から ${days}日間`);
  console.log(`時刻: ${new Date().toLocaleString('ja-JP')}\n`);

  const monitor = new AvailabilityMonitor();
  const results = [];

  // 指定された日数分監視
  for (let i = 0; i < days; i++) {
    const date = formatDate(addDays(new Date(startDate), i));
    
    try {
      console.log(`${date} を確認中...`);
      const result = await monitor.monitor({
        facilityCode: facility.code,
        facilityName: facility.name,
        date,
      });

      console.log(`  ✓ 取得完了: ${result.available}/${result.total} 枠が空き`);
      
      if (result.newAvailabilities > 0) {
        console.log(`  🆕 新規空き: ${result.newAvailabilities} 枠`);
        if (result.notificationSent) {
          console.log(`  📱 LINE通知を送信しました`);
        }
      }

      results.push(result);
    } catch (error) {
      console.error(`  ✗ エラー: ${error.message}`);
      results.push({
        facilityCode: facility.code,
        facilityName: facility.name,
        date,
        error: error.message,
      });
    }

    // レート制限対策: 1秒待機
    if (i < days - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // サマリー表示
  console.log('\n📊 監視結果サマリー');
  console.log('===================');
  
  const totalNew = results.reduce((sum, r) => sum + (r.newAvailabilities || 0), 0);
  const totalNotifications = results.filter(r => r.notificationSent).length;
  const totalErrors = results.filter(r => r.error).length;

  console.log(`総新規空き: ${totalNew} 枠`);
  console.log(`通知送信: ${totalNotifications} 回`);
  console.log(`エラー: ${totalErrors} 件`);

  if (totalErrors > 0) {
    console.log('\nエラー詳細:');
    results.filter(r => r.error).forEach(r => {
      console.log(`  ${r.date}: ${r.error}`);
    });
  }

  console.log('\n✅ 監視完了\n');
}

main().catch(error => {
  console.error('\n❌ 予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});
