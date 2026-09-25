/**
 * 茅ヶ崎市公共施設予約システムプロバイダー
 */

export { ChigasakiClient } from './client.js';

export const CHIGASAKI_CONFIG = {
  name: '茅ヶ崎市',
  provider: 'chigasaki',
  systems: {
    new: {
      name: '新システム',
      baseUrl: 'https://k7.p-kashikan.jp/chigasaki-city',
      active: true,
      since: '2026-08-25',
    },
    old: {
      name: '旧システム (Cultos)',
      baseUrl: 'https://yoyaku.city.chigasaki.kanagawa.jp/cultos/reserve',
      active: false,
      until: '2026-08-24',
      note: '市民文化会館のみ継続使用中',
    },
  },
};
