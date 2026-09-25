# 茅ヶ崎市公共施設予約システム API調査 - 成果物一覧

## 調査完了日時
2026年9月25日 14:18 UTC

## 成果物ファイル一覧

### 1. メインレポート
- **ファイル名**: `chigasaki_availability_api_report.md`
- **内容**: APIエンドポイント、リクエストパラメータ、レスポンス形式、HTML構造、実装方法などの詳細なドキュメント

### 2. HTMLサンプル
- **ファイル名**: `html_sample_availability_table.html`
- **内容**: 実際の空き状況テーブルのHTML構造のサンプル（注釈付き）

### 3. スクリーンショット
1. **screenshot_1_top_page.webp** (72KB)
   - トップページの空き状況確認画面

2. **screenshot_2_availability_sep25.webp** (85KB)
   - 茅ヶ崎市コミュニティホールの空き状況（2026年9月25日）

3. **screenshot_3_availability_oct02.webp** (85KB)
   - 同施設の空き状況（2026年10月2日）- 異なる空き状況パターンを表示

4. **screenshot_4_network_details.webp** (73KB)
   - ブラウザ開発者ツールでのネットワークリクエスト詳細

## 主要な調査結果

### APIの特徴
- **タイプ**: 従来型のサーバーサイドレンダリング（SSR）
- **プロトコル**: HTTP POST
- **レスポンス形式**: HTML（JSON APIは存在しない）
- **エンドポイント**: `https://k7.p-kashikan.jp/chigasaki-city/index.php`

### 重要な発見
1. **XHR/Fetch APIは使用されていない** - すべてフォームPOSTによるページ遷移
2. **空き状況データはHTML埋め込み** - サーバー側で生成されたHTMLテーブル
3. **セッション管理が必要** - Cookie-basedセッション
4. **背景色で状態判定** - CSS background-color属性で空き/予約済/期間外を表現

### 実装に必要な技術
- HTTPクライアント（requests, curl等）
- HTML解析ライブラリ（BeautifulSoup, cheerio等）
- セッション/Cookie管理
- 正規表現またはDOM解析

### curlコマンド例
```bash
curl -X POST 'https://k7.p-kashikan.jp/chigasaki-city/index.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Referer: https://k7.p-kashikan.jp/chigasaki-city/' \
  --data-urlencode 'SshID=aid' \
  --data-urlencode 'UserYM=202609' \
  --data-urlencode 'UseDay=25' \
  --data-urlencode 'UseDate=20260925' \
  --data-urlencode 'ShosetsuCode=016'
```

### POSTパラメータ
- `SshID`: "aid" (空き状況確認モード)
- `UserYM`: 年月 (YYYYMM)
- `UseDay`: 基準日 (DD)
- `UseDate`: 対象日付 (YYYYMMDD)
- `ShosetsuCode`: 施設コード (例: "016" = 茅ヶ崎市コミュニティホール)

### 空き状況の判定方法

| 表示 | 背景色 | 意味 |
|------|--------|------|
| ○ | #01fafa | 空きあり |
| × | #ffffe0 | 予約済み |
| - | #ffffff | 受付期間外 |

## 調査手法
1. ブラウザ（Chrome）で実際にアクセス
2. 開発者ツール（Network タブ）でHTTPトラフィックを監視
3. Elements タブでDOM構造を解析
4. Console でHTML要素を抽出
5. curlコマンドでAPI動作を検証

## 結論
このシステムは**REST APIを提供していない**ため、空き状況を取得するには：
1. POSTリクエストでHTMLページを取得
2. HTML解析ライブラリでテーブル要素を抽出
3. セル背景色またはテキストで空き状況を判定

**Webスクレイピング技術が必須**となります。
