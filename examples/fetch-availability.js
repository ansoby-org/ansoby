#!/usr/bin/env node
/**
 * 茅ヶ崎市の施設空き状況を取得する使用例
 */

import { ChigasakiClient } from '../src/providers/chigasaki/index.js';
import { getToday, addDays, formatDate } from '../src/utils/date.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node examples/fetch-availability.js <command> [options]\n');
    console.log('Commands:');
    console.log('  facilities              施設一覧を取得');
    console.log('  availability <id>       指定した施設の空き状況を取得');
    console.log('  details <id>            施設の詳細情報を取得\n');
    console.log('Examples:');
    console.log('  node examples/fetch-availability.js facilities');
    console.log('  node examples/fetch-availability.js availability 101');
    console.log('  node examples/fetch-availability.js details 101');
    process.exit(0);
  }

  const command = args[0];
  const client = new ChigasakiClient();

  try {
    switch (command) {
      case 'facilities': {
        console.log('茅ヶ崎市の公共施設一覧を取得中...\n');
        const facilities = await client.getFacilities();
        
        if (facilities.length === 0) {
          console.log('施設が見つかりませんでした。');
          console.log('実際のシステムでの動作確認が必要です。');
        } else {
          console.log(`${facilities.length}件の施設が見つかりました:\n`);
          facilities.forEach((facility, index) => {
            console.log(`${index + 1}. [ID: ${facility.id}] ${facility.name}`);
          });
        }
        break;
      }

      case 'availability': {
        const facilityId = args[1];
        if (!facilityId) {
          console.error('Error: 施設IDを指定してください');
          console.error('Usage: node examples/fetch-availability.js availability <facility_id>');
          process.exit(1);
        }

        const today = getToday();
        const endDate = formatDate(addDays(new Date(), 7));
        
        console.log(`施設ID ${facilityId} の空き状況を取得中...`);
        console.log(`期間: ${today} ～ ${endDate}\n`);
        
        const availability = await client.getAvailability({
          facilityId,
          date: today,
          days: 7,
        });

        if (availability.length === 0) {
          console.log('空き状況が見つかりませんでした。');
          console.log('施設IDが正しいか確認してください。');
        } else {
          console.log(`${availability.length}件の時間枠が見つかりました:\n`);
          
          const byDate = availability.reduce((acc, slot) => {
            if (!acc[slot.date]) {
              acc[slot.date] = [];
            }
            acc[slot.date].push(slot);
            return acc;
          }, {});

          Object.entries(byDate).forEach(([date, slots]) => {
            console.log(`\n${date}:`);
            slots.forEach(slot => {
              const status = slot.status === 'available' ? '○' : '×';
              console.log(`  ${slot.time} ${status} ${slot.status}`);
            });
          });

          const available = availability.filter(a => a.status === 'available').length;
          const reserved = availability.filter(a => a.status === 'reserved').length;
          
          console.log(`\n合計: ${availability.length}枠`);
          console.log(`  空き: ${available}枠`);
          console.log(`  予約済: ${reserved}枠`);
        }
        break;
      }

      case 'details': {
        const facilityId = args[1];
        if (!facilityId) {
          console.error('Error: 施設IDを指定してください');
          console.error('Usage: node examples/fetch-availability.js details <facility_id>');
          process.exit(1);
        }

        console.log(`施設ID ${facilityId} の詳細情報を取得中...\n`);
        
        const details = await client.getFacilityDetails(facilityId);
        
        console.log('施設詳細:');
        console.log(`  名前: ${details.name || '(取得できませんでした)'}`);
        console.log(`  住所: ${details.address || '(取得できませんでした)'}`);
        console.log(`  定員: ${details.capacity ? `${details.capacity}名` : '(取得できませんでした)'}`);
        console.log(`  ID: ${details.id}`);
        console.log(`  プロバイダー: ${details.provider}`);
        console.log(`  システム: ${details.system}`);
        break;
      }

      default:
        console.error(`Error: 不明なコマンド '${command}'`);
        console.error('使用可能なコマンド: facilities, availability, details');
        process.exit(1);
    }

  } catch (error) {
    console.error('\nエラーが発生しました:');
    console.error(`  ${error.message}\n`);
    
    if (error.message.includes('Failed to fetch')) {
      console.error('ネットワークエラーまたはシステムの問題の可能性があります。');
      console.error('以下を確認してください:');
      console.error('  - インターネット接続');
      console.error('  - 茅ヶ崎市のシステムが稼働中か');
      console.error('  - URLが正しいか');
    }
    
    process.exit(1);
  }
}

main();
