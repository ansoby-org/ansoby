# アーキテクチャ

## 概要

ansobyは既存の`ansoby/court_reservation`の運用構造を踏襲しつつ、茅ヶ崎市の新システムに対応した実装です。

## 運用フロー

```
定期実行（cron/systemd timer）
    ↓
取得（ChigasakiClient）
    ↓
前回状態との差分（getDiff）
    ↓
通知条件適用（applyNotifyConditions）
    ↓
メッセージ生成（generateNotifyMessage）
    ↓
LINE Messaging API送信（pushLineMessages）
    ↓
状態保存（Redis or FileStorage）
```

## コンポーネント

### 1. プロバイダー層 (`src/providers/`)

施設予約システムとの通信を担当。

- **ChigasakiClient**: 茅ヶ崎市の新システム (k7.p-kashikan.jp) 対応
  - POSTリクエストでHTMLを取得
  - HTMLをパースして空き状況を抽出
  - セッション管理（Cookie）

### 2. ストレージ層 (`src/storage/`)

状態の永続化を担当。

- **RedisStorage**: Redis�を使用（本番推奨）
  - 既存運用との互換性
  - 高速なデータアクセス
  - TTL設定（30日）

- **FileStorage**: ファイルベース（フォールバック）
  - Redisが利用できない環境用
  - JSONファイルで状態を保存
  - `.ansoby-state/` ディレクトリ

### 3. コア層 (`src/core/`)

ビジネスロジックを担当。

- **diff.js**: 差分検出
  - `getDiff()`: 追加/削除を算出
  - `getNewAvailabilities()`: 新規空きのみ取得
  - 空きスロットのみを対象
  - スロットキー: `${facilityCode}:${room}:${section}:${date}:${time}`
  - 施設・部屋・区画・日付・時刻で一意に識別

- **notify-message.js**: 通知制御
  - `applyNotifyConditions()`: 通知条件フィルタリング
  - `generateNotifyMessage()`: メッセージ生成
  - 時間帯、曜日、日付範囲によるフィルタ

### 4. 通知層 (`src/notifier/`)

外部サービスとの連携を担当。

- **push-line-messages.js**: LINE Messaging API送信
  - POST https://api.line.me/v2/bot/message/push
  - fail-closed: 送信失敗を上位へ伝播
  - Idempotency対応 (X-Line-Retry-Key)

- **line.js**: LineNotifierクラス（後方互換）
  - 既存コードとの互換性のため保持
  - 内部的には push-line-messages を使用

### 5. アプリケーション層 (`src/app.js`)

全体のオーケストレーションを担当。

- **App**: メインアプリケーションクラス
  - `runFacility()`: 単一施設の監視
  - `run()`: 全施設の監視
  - 設定ファイル (config.json) ベース
  - fail-closed: 通知失敗時は状態を保存しない

### 6. CLI層 (`src/cli/`)

コマンドライン実行を担当。

- **run.js**: メインCLI
  - config.json から設定読み込み
  - Redisクライアント初期化
  - アプリケーション実行

## データ構造

### スロット（Slot）

空き状況の最小単位。facility（施設） → room（部屋） → section（区画）の階層構造を持ちます。

```javascript
{
  facilityCode: '001',        // 施設コード
  facilityName: '総合体育館', // 施設名（オプション）
  room: '体育室1',            // 部屋名
  section: '1',               // 区画番号（全面の場合はnullまたは'全面'）
  date: '2026-09-25',         // 日付 (YYYY-MM-DD)
  time: '10:00',              // 時刻 (HH:MM)
  status: 'available',        // ステータス (available/reserved/unavailable)
  provider: 'chigasaki',      // プロバイダー名
  timestamp: '2026-09-25T00:00:00.000Z'  // 取得日時
}
```

#### ステータス

- `available`: 空きあり（予約可能）
- `reserved`: 予約済み
- `unavailable`: 受付期間外

#### 階層構造

- **facility**: 施設全体（例: 総合体育館、市体育館、コミュニティホール）
- **room**: 施設内の部屋（例: 体育室1、大集会室全室、大集会室1）
- **section**: 部屋内の区画（例: 1, 2, 3, 全面、北面、南面）

**例1**: 総合体育館 体育室1 の区画1
```javascript
{ facilityCode: '001', room: '体育室1', section: '1', ... }
```

**例2**: 市体育館 北面
```javascript
{ facilityCode: '002', room: '体育室', section: '北面', ... }
```

**例3**: コミュニティホール 大集会室全室（区画なし）
```javascript
{ facilityCode: '016', room: '大集会室全室(500人)', section: null, ... }
```

### 差分検出キー

スロットの一意性は以下のキーで判定されます：

```javascript
`${facilityCode}:${room}:${section || 'default'}:${date}:${time}`
```

これにより、同じ施設・同じ時刻でも、異なる部屋や区画は別のスロットとして扱われます。

### 部屋名・区画名の抽出

HTMLパーサーは部屋名セルから自動的に section を抽出します。

- `"体育室1 / 1"` → `room="体育室1"`, `section="1"`
- `"体育室1/2"` → `room="体育室1"`, `section="2"`
- `"大集会室全室(500人)"` → `room="大集会室全室(500人)"`, `section=null`

## 設定

### config.json

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
      "date": "2026-09-25",
      "notifyConditions": {
        "timeFrom": "18:00",
        "timeTo": "22:00",
        "daysOfWeek": [0, 6],
        "footer": "予約URL"
      }
    }
  ]
}
```

### 環境変数

- **REDIS_URL**: Redis接続URL（オプション）
- **LINE_CHANNEL_ACCESS_TOKEN**: LINEチャネルアクセストークン（必須）
- **LINE_GROUP_ID** または **LINE_USER_ID**: 通知先（必須）

## エラーハンドリング

### fail-closed設計

1. **HTMLパース**
   - 必須マーカー（koma-table, SelectCalendarOuter）がない場合はエラー
   - 時間帯ヘッダーがない場合もエラー
   - 正常な空結果とエラーを明確に区別

2. **通知送信**
   - 送信失敗時は例外をthrow
   - 上位で catch されるまで処理を中断

3. **状態保存**
   - 通知成功後のみ状態を保存
   - 保存失敗時も例外をthrow
   - 次回実行時に再通知可能

### リトライ戦略

- **通知失敗**: 次回実行時に同じ空きを再検出・再通知
- **取得失敗**: エラーログを記録し、次回実行で再試行
- **状態保存失敗**: 例外を投げて処理を中断

## テスト戦略

### 単体テスト

- **プロバイダー**: HTMLパースのロジックテスト
- **差分検出**: 追加/削除の算出テスト
- **通知条件**: フィルタリングロジックテスト
- **ストレージ**: 保存/読み込みテスト

### 統合テスト

- **通知失敗シナリオ**: 状態が保存されないことを確認
- **再通知シナリオ**: 失敗後の再試行を確認

## 既存実装との互換性

### ansoby/court_reservation との対応

| 旧実装 | 新実装 | 備考 |
|--------|--------|------|
| `src/app.js` | `src/app.js` | 運用フロー踏襲 |
| `src/getDiff.js` | `src/core/diff.js` | ロジック移植 |
| `src/generateNotifyMessage.js` | `src/core/notify-message.js` | ロジック移植 |
| `src/pushLineMessages.js` | `src/notifier/push-line-messages.js` | fail-closed改善 |
| `src/redisUtils.js` | `src/storage/redis.js` | Redis操作 |
| Puppeteer | ChigasakiClient | POSTリクエスト方式 |

### 改善点

1. **fail-closed対応**: 通知失敗時は状態を保存しない
2. **HTMLパース精度**: 複数のマーカーで検証
3. **テストカバレッジ**: 45テスト（全パス）
4. **モジュール分離**: 責務の明確化

## デプロイ

### cron設定例

```bash
# 10分おきに実行
*/10 * * * * cd /path/to/ansoby && npm run run /path/to/config.json >> /var/log/ansoby.log 2>&1
```

### systemd timer設定例

```ini
# /etc/systemd/system/ansoby.service
[Unit]
Description=Ansoby Availability Monitor

[Service]
Type=oneshot
WorkingDirectory=/path/to/ansoby
Environment="REDIS_URL=redis://localhost:6379"
ExecStart=/usr/bin/npm run run /path/to/config.json
```

```ini
# /etc/systemd/system/ansoby.timer
[Unit]
Description=Run Ansoby every 10 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min

[Install]
WantedBy=timers.target
```

## パフォーマンス

- **HTTPリクエスト**: 施設ごとに1リクエスト
- **レート制限**: 施設間で1秒待機
- **Redis接続**: アプリケーション実行中のみ
- **メモリ使用量**: 最小限（状態はRedis/ファイル）

## セキュリティ

- **認証情報**: 環境変数で管理
- **Redisアクセス**: 必要な権限のみ
- **エラーログ**: 機密情報を含めない
- **状態ファイル**: `.gitignore` で除外
