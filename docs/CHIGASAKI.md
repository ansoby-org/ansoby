# 茅ヶ崎市公共施設予約システム 対応仕様

## 概要

茅ヶ崎市の公共施設予約システムは、2026年8月25日に新システムに移行しました。
ansobyでは、この新システムに対応した空き状況取得機能を提供します。

## システム情報

### 新システム (現行)
- **URL**: https://k7.p-kashikan.jp/chigasaki-city/
- **プラットフォーム**: p-kashikan (株式会社パスコ)
- **稼働開始**: 2026年8月25日
- **対応状況**: ✅ 実装済み

### 旧システム (廃止)
- **URL**: https://yoyaku.city.chigasaki.kanagawa.jp/cultos/reserve/
- **プラットフォーム**: Cultos
- **廃止日**: 2026年8月24日
- **備考**: 市民文化会館のみ継続使用中

## 機能

### 1. 施設一覧の取得

茅ヶ崎市内の公共施設一覧を取得します。

```javascript
import { ChigasakiClient } from './src/providers/chigasaki/index.js';

const client = new ChigasakiClient();
const facilities = await client.getFacilities();

console.log(facilities);
// [
//   { id: '101', name: '総合体育館', provider: 'chigasaki', system: 'new' },
//   { id: '102', name: '市民文化会館', provider: 'chigasaki', system: 'new' },
//   ...
// ]
```

### 2. 空き状況の取得

指定した施設の空き状況を取得します。

```javascript
const availability = await client.getAvailability({
  facilityCode: '016',
  date: '2026-10-02',
  baseDate: '2026-09-25', // 省略時はdateと同じ
});

console.log(availability);
// [
//   {
//     facilityCode: '016',
//     room: '大集会室全室(500人)',
//     date: '2026-10-02',
//     time: '10:00',
//     status: 'available',
//     provider: 'chigasaki',
//     timestamp: '2026-09-25T00:00:00.000Z'
//   },
//   ...
// ]
```

#### パラメータ
- `facilityCode`: 施設コード（例: '016'）
- `date`: 表示する日付 (YYYY-MM-DD形式)
- `baseDate`: 基準日 (YYYY-MM-DD形式、省略時はdateと同じ)

基準日は、実際のサイトでカレンダーから最初に選択した日付を示します。
日付変更ボタンで別の日に移動する場合、基準日は固定され、表示日のみが変更されます。

#### POSTパラメータ
実際のサイトに送信されるパラメータ：
- `UserYM`: 基準年月 (YYYYMM形式、例: 202609)
- `UseDay`: 基準日 (DD形式、例: 25)
- `UseDate`: 表示日 (YYYYMMDD形式、例: 20261002)
- `ShosetsuCode`: 施設コード (例: 016)
- `disp_open`: 日付変更時に送信 (値: 0)

#### ステータス
- `available`: 空き（予約可能）
- `reserved`: 予約済み
- `unavailable`: 受付期間外

#### 部屋情報
複数の部屋がある施設では、各スロットに `room` 属性が含まれます。
同じ施設・日付・時間でも、部屋が異なれば別のスロットとして扱われます。

### 3. 施設詳細の取得

施設の詳細情報を取得します。

```javascript
const details = await client.getFacilityDetails('101');

console.log(details);
// {
//   id: '101',
//   name: '総合体育館',
//   address: '茅ヶ崎市...',
//   capacity: 300,
//   provider: 'chigasaki',
//   system: 'new'
// }
```

## 実装上の注意点

### API仕様の非公開

p-kashikanシステムは公式なAPI仕様を公開していません。
現在の実装は、Webページの構造を解析してデータを取得する方式です。

### HTMLパース

システムが返すHTMLから以下の要素を抽出します:

1. **施設一覧**: リンクのhref属性から`facility_id`パラメータを抽出
2. **空き状況**: テーブルのclass属性とdata属性から状態と時間を抽出
3. **施設詳細**: 見出しや説明文から情報を抽出

### エラーハンドリング

- **ネットワークエラー**: タイムアウト30秒
- **HTTPエラー**: ステータスコードをチェック
- **パースエラー**: 空の結果を返す

### 制限事項

1. **ログイン必須機能**: 予約実行など、ログインが必要な操作は未対応
2. **HTML構造依存**: ページの構造変更により動作しなくなる可能性
3. **レート制限**: 過度なリクエストは避ける

## テスト

```bash
npm test
```

### テストカバレッジ

- ✅ クライアント初期化
- ✅ パラメータバリデーション
- ✅ HTMLパース機能
- ✅ エラーハンドリング

## 今後の対応

### Phase 1: 基本機能 (完了)
- [x] 施設一覧取得
- [x] 空き状況取得
- [x] 施設詳細取得
- [x] テスト実装

### Phase 2: 実地検証 (予定)
- [ ] 実際のシステムでの動作確認
- [ ] HTMLパース精度の向上
- [ ] エラーケースの追加対応

### Phase 3: 拡張機能 (予定)
- [ ] キャッシュ機能
- [ ] 差分検出
- [ ] 通知機能

## 参考リンク

- [茅ヶ崎市公式 - 公共施設予約システム](https://www.city.chigasaki.kanagawa.jp/jyohosuishin/yoyaku/index.html)
- [新システムトップページ](https://k7.p-kashikan.jp/chigasaki-city/)
- [利用マニュアル (PDF)](https://www.city.chigasaki.kanagawa.jp/jyohosuishin/yoyaku/1067566.html)

## ライセンス

本実装は茅ヶ崎市の公共施設予約システムの公開情報を利用しています。
利用者登録が不要な空き状況確認機能のみを対象としています。
