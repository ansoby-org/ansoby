# 空き状況監視・LINE通知機能

## 概要

茅ヶ崎市公共施設予約システムの空き状況を定期的に監視し、新規の空きが見つかった場合にLINEで通知する機能です。

## 機能

### 1. 空き状況監視

- 指定した施設の空き状況を定期的にチェック
- 前回取得時との差分を検出
- 新規の空きスロットのみを抽出

### 2. 差分検出

- ファイルベースの状態管理（`.availability-state.json`）
- スロット単位での重複チェック（施設コード:日付:時刻）
- 新規空きのみを通知対象とする

### 3. LINE通知

- LINE Notify APIを使用した通知
- 分かりやすいフォーマット（日付・時刻別）
- 新規空きがある場合のみ通知

## セットアップ

### 1. LINE Messaging APIの設定

LINE Notifyは2025年3月31日に終了したため、Messaging APIを使用します。

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. プロバイダーとMessaging APIチャネルを作成
3. チャネルアクセストークン（長期）を発行
4. 通知先のグループIDまたはユーザーIDを取得
   - グループの場合: Botをグループに招待し、グループIDを取得
   - ユーザーの場合: BotとトークしてユーザーIDを取得

参考: https://developers.line.biz/ja/docs/messaging-api/

### 2. 環境変数の設定

```bash
export LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
export LINE_GROUP_ID=your_group_id_here
# または
export LINE_USER_ID=your_user_id_here
```

または、`.env` ファイルに記載:

```
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_GROUP_ID=your_group_id_here
```

## 使い方

### 基本的な使用

```bash
npm run monitor
```

デフォルトでは：
- 施設: 茅ヶ崎市コミュニティホール（コード: 016）
- 検索開始日: 今日
- 検索日数: 7日間

### オプション指定

```bash
# 施設を指定
npm run monitor -- --facility 016

# 日付を指定
npm run monitor -- --date 2026-09-25

# 検索日数を指定
npm run monitor -- --days 14

# 組み合わせ
npm run monitor -- --facility 016 --date 2026-09-25 --days 14
```

### 定期実行（cron）

cronで定期実行する例：

```bash
# crontabを編集
crontab -e

# 毎時0分に実行
0 * * * * cd /path/to/ansoby && /usr/bin/npm run monitor >> /path/to/logs/monitor.log 2>&1

# 10分おきに実行
*/10 * * * * cd /path/to/ansoby && /usr/bin/npm run monitor >> /path/to/logs/monitor.log 2>&1
```

### 定期実行（systemd timer）

より高度な設定例：

```ini
# /etc/systemd/system/ansoby-monitor.service
[Unit]
Description=Ansoby Availability Monitor
After=network.target

[Service]
Type=oneshot
User=your_user
WorkingDirectory=/path/to/ansoby
Environment="LINE_NOTIFY_TOKEN=your_token_here"
ExecStart=/usr/bin/npm run monitor

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/ansoby-monitor.timer
[Unit]
Description=Run Ansoby Monitor every 10 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min

[Install]
WantedBy=timers.target
```

有効化：

```bash
sudo systemctl daemon-reload
sudo systemctl enable ansoby-monitor.timer
sudo systemctl start ansoby-monitor.timer
```

## 出力例

### 通常実行

```
🔍 空き状況監視を開始
施設: 茅ヶ崎市コミュニティホール (016)
期間: 2026-09-25 から 7日間
時刻: 2026/9/25 14:30:00

2026-09-25 を確認中...
  ✓ 取得完了: 5/12 枠が空き
  🆕 新規空き: 2 枠
  📱 LINE通知を送信しました
2026-09-26 を確認中...
  ✓ 取得完了: 3/12 枠が空き
...

📊 監視結果サマリー
===================
総新規空き: 5 枠
通知送信: 2 回
エラー: 0 件

✅ 監視完了
```

### LINE通知メッセージ

```
🏢 茅ヶ崎市コミュニティホール
空きが見つかりました！

📅 2026-09-25
  ✓ 10:00
  ✓ 11:00

合計: 2枠
```

## アーキテクチャ

### コンポーネント

```
┌─────────────────┐
│  CLI Monitor    │  src/cli/monitor.js
└────────┬────────┘
         │
         v
┌─────────────────┐
│AvailabilityMon  │  src/monitor/availability.js
│     itor        │  - 差分検出
└────┬───────┬────┘  - 状態管理
     │       │
     v       v
┌─────────┐ ┌──────────┐
│Chigasaki│ │   LINE   │
│ Client  │ │ Notifier │
└─────────┘ └──────────┘
```

### データフロー

1. **状態読み込み**: 前回の空き状況を `.availability-state.json` から読み込む
2. **現在取得**: `ChigasakiClient` で現在の空き状況を取得
3. **差分検出**: 新規の空きスロットを特定
4. **通知送信**: 新規空きがあれば `LineNotifier` で通知
5. **状態保存**: 現在の状態を保存

## トラブルシューティング

### LINE通知が届かない

1. 環境変数が正しく設定されているか確認
   ```bash
   echo $LINE_CHANNEL_ACCESS_TOKEN
   echo $LINE_GROUP_ID
   ```

2. トークンの有効性をテスト
   ```bash
   curl -X POST https://api.line.me/v2/bot/message/push \
     -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "'"$LINE_GROUP_ID"'",
       "messages": [{"type": "text", "text": "Test"}]
     }'
   ```

3. Botがグループまたはユーザーとトークできる状態か確認

### 空き状況が取得できない

1. ネットワーク接続を確認
2. 施設コードが正しいか確認
3. システムがメンテナンス中でないか確認

### 状態ファイルの初期化

状態ファイルを削除して初期化:

```bash
rm .availability-state.json
```

次回実行時に全ての空きが「新規」として検出されます。

## 制限事項

- **レート制限**: 1秒間隔でリクエストを送信（サーバー負荷軽減）
- **セッション**: Cookie-basedセッションを自動管理
- **エラー**: 一時的なネットワークエラーは次回実行でリトライ

## 開発

### テスト

```bash
npm test
```

### モック実行

環境変数を設定せずにテスト（エラーになります）:

```bash
LINE_CHANNEL_ACCESS_TOKEN=test LINE_GROUP_ID=test npm run monitor -- --date 2026-09-25 --days 1
```

テスト時は `npm test` でモックを使用した単体テストを実行してください。

## ライセンス

MIT
