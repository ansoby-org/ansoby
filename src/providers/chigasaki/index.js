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
      since: '2026-08-27T09:00+09:00',
    },
    old: {
      name: '旧システム (Cultos)',
      baseUrl: 'https://yoyaku.city.chigasaki.kanagawa.jp/cultos/reserve',
      active: false,
      until: '2026-08-26',
      note: '市民文化会館は2026-09-29から新システムに移行予定',
    },
  },
  facilities: {
    '016': {
      code: '016',
      name: '茅ヶ崎市コミュニティホール',
    },
  },
};
