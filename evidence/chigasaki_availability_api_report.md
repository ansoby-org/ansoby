# 茅ヶ崎市公共施設予約システム API調査報告

## 調査日時
2026年9月25日

## 対象システム
- **システム名**: 茅ヶ崎市公共施設予約システム
- **URL**: https://k7.p-kashikan.jp/chigasaki-city/

## 調査結果概要

### 1. アーキテクチャの特徴
このシステムは**従来型のサーバーサイドレンダリング**を採用しており、以下の特徴があります：

- **XHR/Fetch APIは使用されていない**：ブラウザのNetwork監視で確認した結果、空き状況取得時にXHR/Fetch APIコールは一切発生しませんでした
- **サーバーサイドHTML生成**：すべての空き状況データはPHPによってサーバー側で生成されたHTMLとして返されます
- **POST形式のページ遷移**：空き状況の表示や日付変更は、全てPOSTリクエストによる画面遷移で実現されています

### 2. APIエンドポイント

#### 空き状況取得API
- **URL**: `https://k7.p-kashikan.jp/chigasaki-city/index.php`
- **メソッド**: `POST`
- **Content-Type**: `application/x-www-form-urlencoded`

#### リクエストパラメータ

##### 例1: 茅ヶ崎市コミュニティホール（2026年9月25日）
```
SshID=aid
UserYM=202609
UseDay=25
UseDate=20260925
ShosetsuCode=016
```

##### 例2: 同施設（2026年10月2日）
```
SshID=aid
UserYM=202609
UseDay=25
UseDate=20261002
ShosetsuCode=016
disp_open=0
```

**パラメータ説明**:
- `SshID`: セッション識別子（"aid" = 空き状況確認モード）
- `UserYM`: 表示年月（YYYYMM形式）
- `UseDay`: 基準日（日のみ）
- `UseDate`: 表示対象日付（YYYYMMDD形式）
- `ShosetsuCode`: 施設コード（例: 016 = 茅ヶ崎市コミュニティホール）
- `disp_open`: 表示オプション（任意）

### 3. レスポンス形式

**形式**: HTML（text/html; charset=UTF-8）

サーバーは完全なHTMLページを返します。JSONやXMLではありません。

#### レスポンスヘッダー
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: Thu, 19 Nov 1981 08:52:00 GMT
Server: Apache
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-Xss-Protection: 1; mode=block
```

#### HTMLサンプル（空き状況テーブル部分）
```html
<table class="koma-table" style="margin:0 auto;">
  <tbody>
    <tr>
      <th style="width:40px;">10</th>
      <th style="width:40px;">11</th>
      <th style="width:40px;">12</th>
      <!-- 時間帯のヘッダー -->
    </tr>
    <tr>
      <td style="width:140px;background-color:#01fafa;">○</td>  <!-- 空き -->
      <td style="width:140px;background-color:#ffffe0;">×</td>  <!-- 予約済 -->
      <td style="width:140px;background-color:#ffffff;">-</td>  <!-- 受付期間外 -->
    </tr>
  </tbody>
</table>
```

### 4. 空き状況の表現方法

HTMLテーブルのセル背景色とテキストで状態を表現：

| 記号 | 背景色 | カラーコード | 意味 |
|------|--------|-------------|------|
| ○ | 水色 | #01fafa | 空きあり（予約可能） |
| × | 薄いオレンジ | #ffffe0 | 予約済み（予約不可） |
| - | 白 | #ffffff | 受付期間外 |

### 5. DOM構造

```html
<div id="main">
  <div class="SelectCalendarOuter">
    <!-- カレンダーナビゲーション -->
    <div class="SelectCalendar">
      <!-- 日付選択ボタン -->
    </div>
    
    <!-- 空き状況テーブル群 -->
    <table class="koma-table" style="margin:0 auto;">
      <tbody>
        <tr>
          <th>部屋名</th>
          <th>時間帯...</th>
        </tr>
        <tr>
          <td>大集会室全室(500人)</td>
          <td style="background-color:#01fafa;">○</td>
          <!-- 各時間帯の空き状況 -->
        </tr>
        <tr>
          <td>大集会室1(250人)</td>
          <!-- ... -->
        </tr>
      </tbody>
    </table>
    
    <!-- 他の部屋のテーブル -->
    <table class="koma-table">...</table>
    <table class="koma-table">...</table>
  </div>
</div>
```

### 6. ページ遷移フロー

1. **トップページアクセス**
   - GET `https://k7.p-kashikan.jp/chigasaki-city/`
   
2. **「空き状況の確認」クリック**
   - POST `index.php` (施設選択画面へ遷移)
   
3. **施設選択（例：茅ヶ崎市コミュニティホール）**
   - POST `index.php` with `ShosetsuCode=016`
   - HTMLレスポンスに空き状況テーブルが含まれる
   
4. **日付変更（ナビゲーションボタン）**
   - POST `index.php` with updated `UseDate`
   - 新しい日付の空き状況HTMLを取得

### 7. ネットワークトラフィック実測値

- **初回読み込み**: 31.3 kB（22リクエスト）
- **日付変更時**: 36.2 kB（22リクエスト、650ms）
- **主要リクエスト**: index.php（document）+ CSS/JS/フォントファイル

### 8. Cookie/セッション管理

システムは以下のCookieを使用：
- セッション管理用Cookie（詳細は要ブラウザ確認）
- Referrer Policy: `strict-origin-when-cross-origin`

### 9. 技術的な制約と考慮事項

#### スクレイピング実装時の注意点
1. **POSTパラメータの正確性**: 全てのパラメータ（SshID, UserYM, UseDate等）を正確に送信する必要があります
2. **セッション維持**: Cookieベースのセッション管理があるため、セッションを適切に管理する必要があります
3. **HTML解析**: 空き状況はHTMLテーブルとして提供されるため、HTML解析ライブラリ（BeautifulSoup、cheerio等）が必要です
4. **背景色による状態判定**: セルの背景色（style属性）またはテキスト（○×-）で空き状況を判定します
5. **レート制限**: 頻繁なアクセスはサーバー負荷になるため、適切な間隔を空けてアクセスすること

### 10. API呼び出しサンプル（curl）

```bash
# 施設コード016の2026年9月25日の空き状況を取得
curl -X POST 'https://k7.p-kashikan.jp/chigasaki-city/index.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' \
  -H 'Referer: https://k7.p-kashikan.jp/chigasaki-city/' \
  --data-urlencode 'SshID=aid' \
  --data-urlencode 'UserYM=202609' \
  --data-urlencode 'UseDay=25' \
  --data-urlencode 'UseDate=20260925' \
  --data-urlencode 'ShosetsuCode=016' \
  -c cookies.txt -b cookies.txt
```

### 11. 推奨する実装アプローチ

#### Python + Requests + BeautifulSoup4
```python
import requests
from bs4 import BeautifulSoup

session = requests.Session()

# 空き状況取得
response = session.post(
    'https://k7.p-kashikan.jp/chigasaki-city/index.php',
    data={
        'SshID': 'aid',
        'UserYM': '202609',
        'UseDay': '25',
        'UseDate': '20260925',
        'ShosetsuCode': '016'
    },
    headers={
        'User-Agent': 'Mozilla/5.0 ...',
        'Referer': 'https://k7.p-kashikan.jp/chigasaki-city/'
    }
)

# HTML解析
soup = BeautifulSoup(response.content, 'html.parser')
tables = soup.find_all('table', class_='koma-table')

for table in tables:
    # 各テーブルから空き状況を抽出
    cells = table.find_all('td')
    for cell in cells:
        text = cell.get_text().strip()
        bg_color = cell.get('style', '')
        
        if '○' in text or '#01fafa' in bg_color:
            print('空きあり')
        elif '×' in text or '#ffffe0' in bg_color:
            print('予約済み')
```

### 12. 主要な発見事項

1. **モダンなAPI（REST/GraphQL）は存在しない**
   - 従来型のWebアプリケーションアーキテクチャ
   - すべてサーバーサイドレンダリング

2. **データ形式はHTML**
   - JSON等の構造化データは提供されない
   - HTML解析が必須

3. **セッション管理が必要**
   - Cookie-basedセッション
   - 各リクエストで適切にCookieを維持

4. **ページ全体の再読み込み**
   - 部分更新（AJAX）は使用されていない
   - 各操作で完全なHTMLページが返される

### 13. スクリーンショット

調査時に取得したスクリーンショット:
- トップページ: /tmp/computer-use/aee65.webp
- 空き状況表示（9月25日）: /tmp/computer-use/9f49f.webp
- 空き状況表示（10月2日）: /tmp/computer-use/4b20b.webp
- Network詳細: /tmp/computer-use/dec43.webp

### 14. 結論

茅ヶ崎市公共施設予約システムは、**REST APIやJSON APIを提供しておらず**、従来型のPHPベースのWebアプリケーションです。空き状況を取得するには：

1. POSTリクエストでindex.phpにアクセス
2. 返されたHTMLを解析
3. テーブル要素から空き状況を抽出

実装する際は、Webスクレイピング技術（HTML解析、セッション管理等）が必要となります。
