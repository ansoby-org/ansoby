# ansoby

公共施設予約システムのオーケストレーター

## 概要

ansobyは、複数の自治体の公共施設予約システムを統合的に利用するためのオーケストレーターです。
各自治体の異なる予約システムを統一されたインターフェースで操作できます。

### 主な機能

- **空き状況取得**: 実サイトのHTMLを解析して空き状況を取得
- **差分検出**: 前回取得時との差分を自動検出
- **LINE通知**: 新規の空きが見つかった場合にLINEで自動通知
- **定期監視**: cronやsystemd timerで定期実行可能

## サポート自治体

### 茅ヶ崎市
- **システム**: p-kashikan (新システム)
- **対応機能**: 空き状況取得、差分検出、LINE通知
- **ドキュメント**: [docs/CHIGASAKI.md](docs/CHIGASAKI.md)
- **監視機能**: [docs/MONITOR.md](docs/MONITOR.md)

## インストール

```bash
npm install
```

## 使い方

### 基本的な使用例

```javascript
import { ChigasakiClient } from './src/providers/chigasaki/index.js';
import { getToday } from './src/utils/date.js';

const client = new ChigasakiClient();

const facilities = await client.getFacilities();
console.log(`施設数: ${facilities.length}`);

const availability = await client.getAvailability({
  facilityId: facilities[0].id,
  date: getToday(),
  days: 7,
});

console.log(`空き状況: ${availability.length}件`);
```

### CLIでの実行

```bash
npm run dev
```

## テスト

```bash
npm test
```

## クイックスタート

### 1. LINE Messaging APIの設定

[LINE Developers Console](https://developers.line.biz/console/) でMessaging APIチャネルを作成し、チャネルアクセストークンと通知先IDを取得

### 2. Redis設定（オプション）

```bash
# Redisを使用する場合
export REDIS_URL=redis://localhost:6379

# Redisなしでも動作（ファイルベース）
```

### 3. 設定ファイルの作成

```bash
cp config.example.json config.json
# config.jsonを編集してトークンと施設設定を記入
```

### 4. 監視の実行

```bash
# 設定ファイルベース（推奨）
npm run run ./config.json

# または環境変数ベース（シンプル版）
export LINE_CHANNEL_ACCESS_TOKEN=your_token
export LINE_GROUP_ID=your_group_id
npm run monitor
```

## 使用例

### 空き状況の監視とLINE通知

```bash
# デフォルト設定で監視
npm run monitor

# 施設と日付を指定
npm run monitor -- --facility 016 --date 2026-09-25 --days 14
```

### 定期実行（cron）

```bash
# 10分おきに実行
*/10 * * * * cd /path/to/ansoby && npm run monitor >> /path/to/logs/monitor.log 2>&1
```

詳細は [docs/MONITOR.md](docs/MONITOR.md) を参照してください。

### CLIツールの使用

```bash
# 施設一覧を取得
node examples/fetch-availability.js facilities

# 特定の施設の空き状況を取得
node examples/fetch-availability.js availability <施設コード>
```

## プロジェクト構造

```
ansoby/
├── src/
│   ├── providers/
│   │   └── chigasaki/     # 茅ヶ崎市プロバイダー
│   │       ├── client.js  # APIクライアント
│   │       └── index.js   # エクスポート
│   ├── utils/             # ユーティリティ
│   │   └── date.js        # 日付処理
│   └── index.js           # メインエントリーポイント
├── tests/                 # テストコード
├── docs/                  # ドキュメント
└── package.json
```

## 開発

### 新しいプロバイダーの追加

1. `src/providers/[自治体名]/`ディレクトリを作成
2. `client.js`でAPIクライアントを実装
3. `index.js`で設定とエクスポート
4. `tests/`にテストを追加
5. `docs/`にドキュメントを追加

### コーディング規約

- ES Modulesを使用
- JSDocでドキュメント化
- Node.js標準のテストフレームワークを使用
- エラーハンドリングを適切に実装

## ドキュメント

- [APIリファレンス](docs/API.md) - 詳細なAPI仕様
- [茅ヶ崎市プロバイダー仕様](docs/CHIGASAKI.md) - 茅ヶ崎市の実装詳細

## ライセンス

MIT
