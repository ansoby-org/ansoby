# 必要な Evidence 取得手順

## 概要

現在の実装は、仮の施設コードと想定HTMLに基づいています。
**新システムを正本として対応表を確定する**ため、実際のサイトから以下の evidence を取得する必要があります。

## 取得が必要な施設

### 1. 総合体育館（仮コード: 001）

#### 必要な情報

- **施設コード**: POSTパラメータ `ShosetsuCode` の値
- **正式名称**: HTML上の表示名
- **部屋構成**:
  - 第1体育室の正式名称
  - 第1体育室の区画: 面1〜6 の正式名称と HTML 構造
  - 第2体育室の正式名称
- **安定ID**: HTML要素のid属性、data属性など、表示名以外の識別子

#### 取得手順

1. **トップページにアクセス**
   ```bash
   curl -c cookies.txt 'https://k7.p-kashikan.jp/chigasaki-city/' \
     -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' \
     > top.html
   ```

2. **施設選択ページにアクセス**
   ```bash
   curl -b cookies.txt -c cookies.txt \
     'https://k7.p-kashikan.jp/chigasaki-city/index.php' \
     -X POST \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' \
     --data-urlencode 'SshID=aid' \
     > facility_list.html
   ```

3. **総合体育館のコードを確認**
   ```bash
   grep -i "総合体育館" facility_list.html | grep -i "ShosetsuCode"
   ```

4. **総合体育館の空き状況を取得**
   ```bash
   # 施設コードが判明したら（例: 001）
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
   ```

5. **HTMLを保存**
   ```bash
   cp gym_availability.html evidence/gym_availability_20260925.html
   ```

6. **スクリーンショットを取得**
   - ブラウザで実際にアクセスし、総合体育館の空き状況ページをスクリーンショット
   - `evidence/screenshot_gym_availability.webp` として保存

7. **HTML構造を確認**
   ```bash
   # 部屋名と区画名を抽出
   grep -A 100 'koma-table' evidence/gym_availability_20260925.html | \
     grep 'width:140px' | head -20
   ```

#### 確認すべき事項

- [ ] 第1体育室の部屋名セルに「第1体育室」が含まれているか
- [ ] 面1〜6が個別の行（`<tr>`）として表示されているか
- [ ] 面の表記: `"第1体育室 / 面1"` なのか `"第1体育室/面1"` なのか `"面1"` だけなのか
- [ ] td要素のid属性に安定したコードが含まれているか
- [ ] 第2体育室も同じHTML内に含まれているか、別の施設コードか

### 2. 市体育館（仮コード: 002）

#### 必要な情報

- **施設コード**: POSTパラメータ `ShosetsuCode` の値
- **正式名称**: HTML上の表示名
- **区画構成**:
  - 北面の正式名称と HTML 構造
  - 南面の正式名称と HTML 構造
- **安定ID**: HTML要素のid属性、data属性など

#### 取得手順

総合体育館と同様の手順で以下を取得：

1. 市体育館の施設コードを確認
2. 市体育館の空き状況HTMLを取得
3. HTMLを `evidence/city_gym_availability_20260925.html` として保存
4. スクリーンショットを `evidence/screenshot_city_gym_availability.webp` として保存

#### 確認すべき事項

- [ ] 北面と南面が個別の行（`<tr>`）として表示されているか
- [ ] 区画の表記: `"体育室 / 北面"` なのか `"北面"` だけなのか
- [ ] td要素のid属性に安定したコードが含まれているか
- [ ] 全面も同じHTML内に表示されているか（監視対象外だが構造確認のため）

## Evidence 取得後の作業

### 1. 対応表の確定

`docs/FACILITY_MIGRATION.md` を更新：

```markdown
| 旧システムでの扱い | 新システム側の対応 | facilityCode | room | section | 備考 |
| --- | --- | --- | --- | --- | --- |
| 総合体育館 / 第1体育室 / 6分の1 | 総合体育館 / 第1体育室 / 面1 | 001 | 第1体育室 | 面1 | 確認済み |
```

### 2. 実装の更新

#### parser の更新

実際のHTML構造に基づいて、`src/providers/chigasaki/client.js` の section 抽出ロジックを修正。

安定IDが取得可能な場合:
```javascript
// td要素のid属性から抽出
const cellId = cell.fullCell.match(/id="([^"]+)"/);
if (cellId) {
  const parts = cellId[1].split('|');
  // 実際の構造に基づいてroomCode, sectionCodeを抽出
  roomCode = parts[0];
  sectionCode = parts[1];
}
```

### 3. テストの追加

実HTMLを使用したfixtureを追加：

```javascript
// tests/gym.test.js
it('should parse 総合体育館 第1体育室 面1〜6', () => {
  const client = new ChigasakiClient();
  const html = readFileSync('evidence/gym_availability_20260925.html', 'utf-8');
  
  const availability = client._parseAvailabilityFromHtml(html, '001', '2026-09-25');
  
  // 面1〜6が個別のスロットとして認識される
  const sections = availability
    .filter(s => s.room === '第1体育室' && s.time === '10:00')
    .map(s => s.section)
    .sort();
  
  assert.deepStrictEqual(sections, ['面1', '面2', '面3', '面4', '面5', '面6']);
});
```

### 4. 設定ファイルの更新

`config.example.json` に実際の施設コードと部屋名・区画名を反映：

```json
{
  "facilities": [
    {
      "code": "001",
      "name": "総合体育館",
      "baseDate": "2026-09-25",
      "date": "2026-09-25",
      "notifyConditions": { ... }
    }
  ],
  "targetRoomSections": {
    "001": {
      "第1体育室": ["面1", "面2", "面3", "面4", "面5", "面6"],
      "第2体育室": [null]
    },
    "002": {
      "体育室": ["北面", "南面"]
    }
  }
}
```

## チェックリスト

### 総合体育館

- [ ] 施設コード確認
- [ ] HTML取得（`evidence/gym_availability_20260925.html`）
- [ ] スクリーンショット取得（`evidence/screenshot_gym_availability.webp`）
- [ ] 第1体育室の正式名称確認
- [ ] 面1〜6の正式名称確認
- [ ] 安定ID（コード）の有無確認
- [ ] 第2体育室の正式名称確認
- [ ] 対応表確定（`docs/FACILITY_MIGRATION.md`）
- [ ] parser更新
- [ ] 実HTMLを使用したテスト追加
- [ ] config.example.json更新

### 市体育館

- [ ] 施設コード確認
- [ ] HTML取得（`evidence/city_gym_availability_20260925.html`）
- [ ] スクリーンショット取得（`evidence/screenshot_city_gym_availability.webp`）
- [ ] 体育室の正式名称確認
- [ ] 北面・南面の正式名称確認
- [ ] 安定ID（コード）の有無確認
- [ ] 対応表確定（`docs/FACILITY_MIGRATION.md`）
- [ ] parser更新
- [ ] 実HTMLを使用したテスト追加
- [ ] config.example.json更新

## 注意事項

1. **新システムを正本とする**: 実際のHTML/画面上の名称を優先してください。
2. **仮定しない**: `"面1"` `"1"` `"区画1"` など、表記を推測せず、実際の表記を使用してください。
3. **安定IDを優先**: td要素のid属性などに安定したコードがある場合、それをidentityとして使用してください。
4. **全区画を確認**: 監視対象外の区画（全面、組み合わせ区画など）も構造把握のために確認してください。
5. **fail-closed維持**: 実HTMLの構造が想定と異なる場合、エラーを投げるようにしてください。
