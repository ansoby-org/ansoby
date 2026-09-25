# ansoby API リファレンス

## ChigasakiClient

茅ヶ崎市公共施設予約システムのクライアント

### コンストラクタ

```javascript
new ChigasakiClient(config?)
```

#### パラメータ

- `config` (Object, optional): 設定オブジェクト
  - `baseUrl` (string, optional): ベースURL（デフォルト: `https://k7.p-kashikan.jp/chigasaki-city`）
  - `timeout` (number, optional): タイムアウト時間（ミリ秒、デフォルト: 30000）

#### 例

```javascript
import { ChigasakiClient } from './src/providers/chigasaki/index.js';

// デフォルト設定
const client = new ChigasakiClient();

// カスタム設定
const client = new ChigasakiClient({
  baseUrl: 'https://example.com',
  timeout: 10000,
});
```

---

### getFacilities()

施設一覧を取得します。

#### 戻り値

`Promise<Array<Facility>>` - 施設情報の配列

##### Facility オブジェクト

```typescript
{
  id: string;          // 施設ID
  name: string;        // 施設名
  provider: string;    // プロバイダー名 ('chigasaki')
  system: string;      // システム種別 ('new' | 'old')
}
```

#### 例

```javascript
const facilities = await client.getFacilities();
console.log(facilities);
// [
//   { id: '101', name: '総合体育館', provider: 'chigasaki', system: 'new' },
//   { id: '102', name: '市民文化会館', provider: 'chigasaki', system: 'new' },
// ]
```

#### エラー

- ネットワークエラー
- タイムアウト
- HTTPエラー（4xx, 5xx）

---

### getAvailability(params)

指定した施設の空き状況を取得します。

#### パラメータ

- `params` (Object): 検索パラメータ
  - `facilityId` (string, required): 施設ID
  - `date` (string, required): 検索開始日（YYYY-MM-DD形式）
  - `days` (number, optional): 検索日数（デフォルト: 7）

#### 戻り値

`Promise<Array<Availability>>` - 空き状況の配列

##### Availability オブジェクト

```typescript
{
  facilityId: string;     // 施設ID
  date: string;           // 日付 (YYYY-MM-DD)
  time: string;           // 時刻 (HH:MM)
  status: string;         // ステータス ('available' | 'reserved')
  provider: string;       // プロバイダー名
  timestamp: string;      // 取得日時 (ISO 8601)
}
```

#### 例

```javascript
const availability = await client.getAvailability({
  facilityId: '101',
  date: '2026-09-25',
  days: 7,
});

console.log(availability);
// [
//   {
//     facilityId: '101',
//     date: '2026-09-25',
//     time: '09:00',
//     status: 'available',
//     provider: 'chigasaki',
//     timestamp: '2026-09-25T00:00:00.000Z'
//   },
//   ...
// ]
```

#### エラー

- `facilityId` または `date` が指定されていない場合
- ネットワークエラー
- タイムアウト
- HTTPエラー

---

### getFacilityDetails(facilityId)

施設の詳細情報を取得します。

#### パラメータ

- `facilityId` (string, required): 施設ID

#### 戻り値

`Promise<FacilityDetails>` - 施設詳細情報

##### FacilityDetails オブジェクト

```typescript
{
  id: string;          // 施設ID
  name: string;        // 施設名
  address: string;     // 住所
  capacity: number;    // 定員
  provider: string;    // プロバイダー名
  system: string;      // システム種別
}
```

#### 例

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

#### エラー

- `facilityId` が指定されていない場合
- ネットワークエラー
- タイムアウト
- HTTPエラー

---

## 日付ユーティリティ

`src/utils/date.js`

### formatDate(date)

日付をYYYY-MM-DD形式にフォーマットします。

#### パラメータ

- `date` (Date, required): 日付オブジェクト

#### 戻り値

`string` - YYYY-MM-DD形式の文字列

#### 例

```javascript
import { formatDate } from './src/utils/date.js';

const date = new Date(2026, 8, 25); // 2026年9月25日
console.log(formatDate(date)); // '2026-09-25'
```

---

### parseDate(dateStr)

日付文字列をパースします。

#### パラメータ

- `dateStr` (string, required): 日付文字列（YYYY-MM-DD）

#### 戻り値

`Date` - 日付オブジェクト

#### 例

```javascript
import { parseDate } from './src/utils/date.js';

const date = parseDate('2026-09-25');
console.log(date.getFullYear()); // 2026
```

---

### addDays(date, days)

指定した日数後の日付を取得します。

#### パラメータ

- `date` (Date, required): 基準日
- `days` (number, required): 日数（負の値で過去の日付）

#### 戻り値

`Date` - 日数後の日付

#### 例

```javascript
import { addDays, formatDate } from './src/utils/date.js';

const date = new Date(2026, 8, 25);
const future = addDays(date, 7);
console.log(formatDate(future)); // '2026-10-02'
```

---

### getDateRange(startDate, endDate)

日付範囲を生成します。

#### パラメータ

- `startDate` (Date, required): 開始日
- `endDate` (Date, required): 終了日

#### 戻り値

`Array<string>` - 日付文字列の配列（YYYY-MM-DD）

#### 例

```javascript
import { getDateRange } from './src/utils/date.js';

const start = new Date(2026, 8, 25);
const end = new Date(2026, 8, 27);
const range = getDateRange(start, end);
console.log(range);
// ['2026-09-25', '2026-09-26', '2026-09-27']
```

---

### getToday()

今日の日付を取得します。

#### 戻り値

`string` - 今日の日付（YYYY-MM-DD形式）

#### 例

```javascript
import { getToday } from './src/utils/date.js';

console.log(getToday()); // '2026-09-25'
```

---

### isValidDate(dateStr)

日付が有効かチェックします。

#### パラメータ

- `dateStr` (string, required): 日付文字列（YYYY-MM-DD）

#### 戻り値

`boolean` - 有効な日付かどうか

#### 例

```javascript
import { isValidDate } from './src/utils/date.js';

console.log(isValidDate('2026-09-25')); // true
console.log(isValidDate('2026-13-01')); // false
console.log(isValidDate('2026/09/25')); // false
```

---

## エラーハンドリング

すべての非同期メソッドは、エラーが発生した場合にPromiseをrejectします。

### 一般的なエラー

1. **パラメータエラー**
   ```
   Error: facilityId and date are required
   Error: facilityId is required
   ```

2. **ネットワークエラー**
   ```
   Error: Failed to fetch facilities: [詳細]
   Error: Failed to fetch availability: [詳細]
   Error: Failed to fetch facility details: [詳細]
   ```

3. **タイムアウトエラー**
   ```
   Error: Request timeout after 30000ms
   ```

4. **HTTPエラー**
   ```
   Error: HTTP 404: Not Found
   Error: HTTP 500: Internal Server Error
   ```

### エラー処理の例

```javascript
try {
  const availability = await client.getAvailability({
    facilityId: '101',
    date: '2026-09-25',
  });
  console.log(availability);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('リクエストがタイムアウトしました');
  } else if (error.message.includes('HTTP')) {
    console.error('サーバーエラーが発生しました');
  } else {
    console.error('エラー:', error.message);
  }
}
```

---

## 制限事項

1. **ログイン必須機能**: 予約実行など、ログインが必要な操作は未対応
2. **HTML構造依存**: ページの構造変更により動作しなくなる可能性
3. **レート制限**: 過度なリクエストは避けてください
4. **公式API非対応**: HTMLパース方式のため、精度に限界があります

---

## 参考リンク

- [茅ヶ崎市プロバイダー仕様](./CHIGASAKI.md)
- [README](../README.md)
