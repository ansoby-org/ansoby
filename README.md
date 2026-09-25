# ansoby

公共施設予約システムのオーケストレーター

## 概要

ansobyは、複数の自治体の公共施設予約システムを統合的に利用するためのオーケストレーターです。
各自治体の異なる予約システムを統一されたインターフェースで操作できます。

## サポート自治体

### 茅ヶ崎市
- **システム**: p-kashikan (新システム)
- **対応機能**: 施設一覧、空き状況取得、施設詳細
- **ドキュメント**: [docs/CHIGASAKI.md](docs/CHIGASAKI.md)

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

## ライセンス

MIT
