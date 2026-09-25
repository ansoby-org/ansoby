# 茅ヶ崎市 施設コード一覧

## 新予約システム（p-kashikan）の施設

### 確認済み施設

| 施設コード | 施設名 | 部屋/区画 | 備考 |
| --- | --- | --- | --- |
| 016 | 茅ヶ崎市コミュニティホール | 大集会室全室(500人) | 実装済み |
| 016 | 茅ヶ崎市コミュニティホール | 大集会室1(250人) | 実装済み |

### 未確認施設（要調査）

以下の施設については、実際のサイトで施設コード、部屋名、区画名を確認する必要があります。

| 仮施設コード | 施設名 | 想定される部屋/区画 | 確認状況 |
| --- | --- | --- | --- |
| ??? | 総合体育館 | 体育室1 / 全面 | 未確認 |
| ??? | 総合体育館 | 体育室1 / 1 | 未確認 |
| ??? | 総合体育館 | 体育室1 / 2 | 未確認 |
| ??? | 総合体育館 | 体育室1 / 3 | 未確認 |
| ??? | 総合体育館 | 体育室1 / 4 | 未確認 |
| ??? | 総合体育館 | 体育室1 / 5 | 未確認 |
| ??? | 総合体育館 | 体育室1 / 6 | 未確認 |
| ??? | 市体育館 | 全面 | 未確認 |
| ??? | 市体育館 | 北面 | 未確認 |
| ??? | 市体育館 | 南面 | 未確認 |

## 施設コードの確認方法

### 方法1: ブラウザの開発者ツールを使用

1. https://k7.p-kashikan.jp/chigasaki-city/ にアクセス
2. 「空き状況の確認」をクリック
3. 施設を選択
4. 開発者ツールのNetworkタブでPOSTリクエストを確認
5. `ShosetsuCode` パラメータの値が施設コード

### 方法2: curlコマンドを使用

```bash
# トップページにアクセスしてセッションを確立
curl -c cookies.txt 'https://k7.p-kashikan.jp/chigasaki-city/' \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'

# 施設選択ページにPOST
curl -b cookies.txt -c cookies.txt \
  'https://k7.p-kashikan.jp/chigasaki-city/index.php' \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'SshID=aid' \
  > facility_list.html

# HTMLから施設コードを抽出
grep -i "ShosetsuCode" facility_list.html
```

## 部屋名・区画名の確認方法

施設コードが判明したら、その施設の空き状況HTMLを取得して部屋名・区画名を確認します。

```bash
# 総合体育館の空き状況を取得（施設コードが001の場合）
curl -b cookies.txt \
  'https://k7.p-kashikan.jp/chigasaki-city/index.php' \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'SshID=aid' \
  --data-urlencode 'UserYM=202609' \
  --data-urlencode 'UseDay=25' \
  --data-urlencode 'UseDate=20260925' \
  --data-urlencode 'ShosetsuCode=001' \
  > gym_availability.html

# 部屋名を抽出（koma-tableの最初のtdがwidth:140pxの場合）
grep -A 100 'koma-table' gym_availability.html | grep 'width:140px'
```

## 設定ファイルへの追加方法

施設コード、部屋名、区画名が確認できたら、`config.json` に追加します。

```json
{
  "facilities": [
    {
      "code": "001",
      "name": "総合体育館 体育室1 / 1",
      "baseDate": "2026-09-25",
      "date": "2026-09-25",
      "notifyConditions": {
        "timeFrom": "18:00",
        "timeTo": "22:00"
      }
    },
    {
      "code": "001",
      "name": "総合体育館 体育室1 / 2",
      "baseDate": "2026-09-25",
      "date": "2026-09-25",
      "notifyConditions": {
        "timeFrom": "18:00",
        "timeTo": "22:00"
      }
    }
  ]
}
```

**注意**: 同じ施設コードでも、HTMLパーサーが部屋名・区画名を自動的に抽出するため、
複数の部屋・区画を監視する場合でも同じ施設コードを使用できます。
システムは `room` と `section` フィールドで自動的に区別します。
