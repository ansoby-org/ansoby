# 設定ファイル仕様

## config.json の構造

```json
{
  "client": {
    "baseUrl": "https://k7.p-kashikan.jp/chigasaki-city",
    "timeout": 30000
  },
  "storage": {
    "redis": null,
    "keyPrefix": "ansoby:chigasaki:"
  },
  "line": {
    "channelAccessToken": "YOUR_CHANNEL_ACCESS_TOKEN",
    "groupId": "YOUR_GROUP_ID",
    "userId": null
  },
  "facilities": [
    {
      "code": "016",
      "name": "茅ヶ崎市コミュニティホール",
      "baseDate": "2026-09-25",
      "date": "2026-09-25",
      "notifyConditions": {
        "dateFrom": null,
        "dateTo": null,
        "timeFrom": "18:00",
        "timeTo": "22:00",
        "daysOfWeek": [0, 6],
        "header": null,
        "footer": "予約はこちら: https://k7.p-kashikan.jp/chigasaki-city/"
      }
    }
  ]
}
```

## フィールド説明

### client

クライアント設定。

- `baseUrl` (string): 茅ヶ崎市公共施設予約システムのベースURL
- `timeout` (number): タイムアウト時間（ミリ秒）

### storage

状態管理の設定。

- `redis` (object|null): Redis接続設定（nullの場合はファイルベース）
- `keyPrefix` (string): Redisキーのプレフィックス

### line

LINE Messaging API設定。

- `channelAccessToken` (string, required): チャネルアクセストークン
- `groupId` (string, optional): グループID（グループに送信する場合）
- `userId` (string, optional): ユーザーID（個人に送信する場合）

**注意**: `groupId` または `userId` のいずれか1つを指定してください。

### facilities

監視対象施設の配列。

#### 施設設定

- `code` (string, required): 施設コード（例: "016"）
- `name` (string, required): 施設名
- `baseDate` (string, required): 基準日 (YYYY-MM-DD形式)
- `date` (string, required): 表示日 (YYYY-MM-DD形式)
- `notifyConditions` (object): 通知条件

#### 基準日と表示日について

実際のサイトでは、カレンダーから最初に選択した日付が「基準日」となります。
日付変更ボタンで別の日に移動すると、基準日は固定されたまま「表示日」だけが変更されます。

これにより、実測したPOSTパラメータ契約が再現されます：
- `UserYM` / `UseDay`: 基準日から生成
- `UseDate`: 表示日から生成
- `disp_open`: 基準日≠表示日の場合に送信

**例1**: 同じ日を監視する場合
```json
{
  "baseDate": "2026-09-25",
  "date": "2026-09-25"
}
```

**例2**: 9/25を基準に10/2を監視する場合
```json
{
  "baseDate": "2026-09-25",
  "date": "2026-10-02"
}
```

#### 通知条件 (notifyConditions)

- `dateFrom` (string|null): 通知開始日 (YYYY-MM-DD形式、nullの場合は制限なし)
- `dateTo` (string|null): 通知終了日 (YYYY-MM-DD形式、nullの場合は制限なし)
- `timeFrom` (string|null): 通知開始時刻 (HH:MM形式、nullの場合は制限なし)
- `timeTo` (string|null): 通知終了時刻 (HH:MM形式、nullの場合は制限なし)
- `daysOfWeek` (array|null): 曜日フィルタ（0=日曜, 6=土曜、nullの場合は全曜日）
- `header` (string|null): 通知メッセージのヘッダー
- `footer` (string|null): 通知メッセージのフッター

## 複数施設の監視

`facilities` 配列に複数の施設設定を追加することで、複数施設を同時に監視できます。

```json
{
  "facilities": [
    {
      "code": "016",
      "name": "茅ヶ崎市コミュニティホール",
      "baseDate": "2026-09-25",
      "date": "2026-09-25",
      "notifyConditions": { ... }
    },
    {
      "code": "016",
      "name": "茅ヶ崎市コミュニティホール（10月2日）",
      "baseDate": "2026-09-25",
      "date": "2026-10-02",
      "notifyConditions": { ... }
    },
    {
      "code": "001",
      "name": "総合体育館 体育室1",
      "baseDate": "2026-09-25",
      "date": "2026-09-25",
      "notifyConditions": { ... }
    }
  ]
}
```

**注意**: 同じ施設コードでも、HTMLパーサーが部屋名・区画名を自動的に抽出します。
例えば、総合体育館（001）の空き状況HTMLに「体育室1 / 1」「体育室1 / 2」...「体育室1 / 6」が
含まれていれば、それぞれ別のスロットとして自動的に識別されます。

## 部屋・区画の扱い

システムは facility（施設） → room（部屋） → section（区画）の階層構造を自動認識します。

### HTMLからの自動抽出

部屋名セルが以下の形式の場合、自動的に section が抽出されます：

- `"体育室1 / 1"` → `room="体育室1"`, `section="1"`
- `"体育室1/2"` → `room="体育室1"`, `section="2"`
- `"大集会室全室(500人)"` → `room="大集会室全室(500人)"`, `section=null`

### 差分検出

異なる部屋や区画は、たとえ同じ施設・同じ時刻でも別のスロットとして扱われます：

```javascript
// これらは全て別のスロットとして認識されます
{ facilityCode: '001', room: '体育室1', section: '1', time: '10:00' }
{ facilityCode: '001', room: '体育室1', section: '2', time: '10:00' }
{ facilityCode: '001', room: '体育室1', section: '3', time: '10:00' }
```

これにより、「体育室1の区画1が空いた」「体育室1の区画2が空いた」という通知が
それぞれ独立して行われます。

## 環境変数

`REDIS_URL` 環境変数でRedis接続を設定できます。

```bash
export REDIS_URL=redis://localhost:6379
npm run run ./config.json
```

設定されていない場合は自動的にファイルベースストレージにフォールバックします。
