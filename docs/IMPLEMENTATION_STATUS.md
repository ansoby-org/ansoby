# 実装状況

## 完了済み

### コア機能

- [x] facility / room / section の階層構造実装
- [x] HTMLパーサーでの section 自動抽出（想定表記ベース）
- [x] 差分検出キーに section を含める
- [x] 複数部屋・複数区画の独立した追跡
- [x] 監視対象フィルタリング機能（targetRoomSections）
- [x] fail-closed設計（HTML構造変更検出）
- [x] セッション管理（Cookie）
- [x] 実測POST契約の再現（baseDate/date）
- [x] config.example.json JSONバリデーション

### ストレージ

- [x] Redis state storage (fail-closed)
- [x] File state storage (fail-closed)
- [x] 初回実行とstate読み込み失敗の区別

### 通知

- [x] LINE Messaging API統合
- [x] fail-closed（送信失敗時はstate保存しない）
- [x] 通知条件フィルタ（時間帯、曜日、日付範囲）

### テスト

- [x] 部屋名列を含むHTMLパース
- [x] section 抽出のテスト
- [x] 複数部屋・複数区画の差分検出テスト
- [x] POSTパラメータ実測値検証（spy test）
- [x] fail-closed テスト（ストレージ障害、unknown status）

### ドキュメント

- [x] ARCHITECTURE.md（階層構造、スロット構造）
- [x] CONFIG.md（baseDate/date、部屋・区画の扱い）
- [x] FACILITY_MIGRATION.md（移行対応表テンプレート）
- [x] FACILITIES.md（施設コード一覧、確認方法）
- [x] README.md（ドキュメント一覧）

## 未完了（要evidence取得）

### 総合体育館

- [ ] 施設コードの確認
- [ ] 実画面での部屋名・区画名の確認
- [ ] 体育室1の1〜6が別rowとして表示されることの確認
- [ ] HTMLサンプルの取得
- [ ] スクリーンショットの取得
- [ ] fixture/testの追加

### 市体育館

- [ ] 施設コードの確認
- [ ] 実画面での区画名の確認
- [ ] 全面/北面/南面が別rowとして表示されることの確認
- [ ] HTMLサンプルの取得
- [ ] スクリーンショットの取得
- [ ] fixture/testの追加

## 次のステップ

### 1. evidence取得

実際のサイトにアクセスして以下を確認：

1. トップページから施設一覧にアクセス
2. 総合体育館を選択して施設コードを確認
3. 体育室1の空き状況HTMLを取得
4. 体育室1の1〜6が別々のrowとして表示されることを確認
5. スクリーンショットとHTMLサンプルを保存

同様に市体育館についても確認。

### 2. 移行対応表の確定

evidence取得後、以下を確定：

- 正式な施設コード
- 正式な部屋名
- 正式な区画名
- room/section フィールドの値

### 3. 実装の検証

実際のHTMLを使用してテストを追加：

- 総合体育館 体育室1 の1〜6が別slotとして取得される
- 市体育館の全面/北面/南面が別slotとして取得される
- 差分検出が正しく動作する

### 4. 設定例の追加

config.example.json に総合体育館と市体育館の設定例を追加。

## 実装方針の確認

- [x] 表示名ではなくコードベースのidentity
- [x] facility → room → section の階層構造維持
- [x] fail-closed設計の維持
- [x] 同じ施設コードでも部屋・区画を自動識別
- [x] 複数区画の独立追跡

## レビューコメント対応状況

### 第1回（対応済み）

1. [x] 実HTMLの部屋名列対応
2. [x] POSTパラメータ実測値対応
3. [x] セッションbootstrap実装
4. [x] ストレージread errorをfail-closed化
5. [x] App.run()失敗時のexit 1対応

### 第2回（対応済み）

1. [x] 実測POST契約を production 経路で適用
2. [x] 旧 monitor 経路削除
3. [x] parser fail-closed 強化

### 第3回（追加要件）

1. [x] facility / room / section の階層構造実装
2. [x] section 自動抽出
3. [x] 差分検出キーに section を含める
4. [x] 移行対応表ドキュメント作成
5. [ ] 実際のサイトでの evidence 取得（総合体育館、市体育館）
6. [ ] 実HTMLを使用した fixture/test 追加
