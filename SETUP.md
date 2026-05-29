# 家計簿アプリ 環境構築・設定手順書

このドキュメントだけを見れば、**開発環境（Node.js / Next.js）** と **Firebase / Gemini** の設定から、ローカル動作確認・本番公開まで完了できるようにまとめています。

対象: 家族・友人へ配布するための **自分用インスタンス** を新規に作る人（Windows / macOS）

---

## 目次

1. [完成するとこうなる](#1-完成するとこうなる)
2. [事前に用意するもの](#2-事前に用意するもの)
3. [Part A: 開発環境の構築（Node.js など）](#part-a-開発環境の構築nodejs-など)
4. [Part B: ソースコードの取得](#part-b-ソースコードの取得)
5. [Part C: Firebase の設定](#part-c-firebase-の設定)
6. [Part D: Gemini API の設定（レシート読み取り）](#part-d-gemini-api-の設定レシート読み取り)
7. [Part E: プロジェクト内ファイルの設定](#part-e-プロジェクト内ファイルの設定)
8. [Part F: ローカルで動作確認](#part-f-ローカルで動作確認)
9. [Part G: Firebase Hosting へ公開](#part-g-firebase-hosting-へ公開)
10. [友人・家族に渡すとき](#10-友人家族に渡すとき)
11. [よくあるトラブル](#11-よくあるトラブル)
12. [最終チェックリスト](#12-最終チェックリスト)

---

## 1. 完成するとこうなる

- PC で `npm run dev` → `http://localhost:3000` で家計簿が動く
- `npm run deploy:hosting` → `https://あなたのプロジェクトID.web.app` で公開できる
- 支出データは **あなた専用の Firestore** に保存される
- レシート撮影・写真選択で AI 読み取り（Gemini キー設定時）

---

## 2. 事前に用意するもの

| 項目 | 必須 | 説明 |
|------|------|------|
| Google アカウント | ◎ | Firebase / Gemini 用 |
| インターネット接続 | ◎ |  |
| Node.js **20 以上**（LTS 推奨） | ◎ | ビルド・開発用 |
| Git | △ | clone する場合のみ |
| テキストエディタ | △ | メモ帳でも可。VS Code / Cursor 推奨 |

**不要なもの**

- Next.js / TypeScript / React の個別インストール（`npm install` で自動取得）
- Blaze プラン（Hosting + Firestore のみなら **Spark 無料** で可）
- Vercel アカウント（本アプリは Firebase Hosting で公開）

---

## Part A: 開発環境の構築（Node.js など）

### A-1. Node.js のインストール

1. [Node.js 公式](https://nodejs.org/) を開く
2. **LTS**（推奨版）をダウンロードしてインストール
3. ターミナル（Windows: PowerShell / macOS: ターミナル）で確認:

```bash
node -v
```

**期待する結果:** `v20.x.x` 以上（例: `v22.11.0` でも可）

```bash
npm -v
```

**期待する結果:** バージョン番号が表示される（例: `10.x.x`）

> **Windows の注意:** インストール後は PowerShell を**いったん閉じて開き直す**。

### A-2. Firebase CLI のインストール

```bash
npm install -g firebase-tools
```

確認:

```bash
firebase --version
```

**期待する結果:** `13.x` や `14.x` などバージョンが表示される

### A-3. Firebase CLI にログイン

```bash
firebase login
```

ブラウザが開くので、**この家計簿用に作る Google アカウント**でログインする。

確認:

```bash
firebase projects:list
```

作成済みの Firebase プロジェクトが一覧に出れば OK（まだ無ければ Part C で作成）。

---

## Part B: ソースコードの取得

### 方法1: Git で clone（推奨）

```bash
git clone https://github.com/toku1639/expense-tracker.git
cd expense-tracker
```

### 方法2: ZIP で受け取った場合

1. ZIP を解凍
2. 解凍フォルダでターミナルを開く
3. 以下を実行

### 依存パッケージのインストール（必須・初回1回）

プロジェクトのルート（`package.json` がある場所）で:

```bash
npm install
```

**期待する結果:** エラーなく完了し、`node_modules` フォルダができる（数分かかることがあります）。

---

## Part C: Firebase の設定

### C-1. Firebase プロジェクトを新規作成

1. [Firebase コンソール](https://console.firebase.google.com/) を開く
2. **「プロジェクトを追加」**
3. プロジェクト名を入力（例: `yamada-kakeibo`）
4. Google アナリティクスは **無効でも可**
5. 作成完了後、**プロジェクト ID** をメモ（例: `yamada-kakeibo-a1b2c3`）  
   → 後で `.firebaserc` に書く

> **料金:** Spark（無料）プランのままで開始して問題ありません。

### C-2. Firestore を有効化

1. 左メニュー **「Firestore Database」**
2. **「データベースの作成」**
3. ロケーション: **`asia-northeast1`（東京）** 推奨
4. セキュリティルール: 初回は「テストモード」でも可（後で C-3 を実施）

アプリはコレクション名 **`expenses`** を使用します。手動作成は不要です。

### C-3. Firestore セキュリティルール

左メニュー Firestore → **「ルール」** タブ。

このアプリは **ログイン機能なし** のため、完全なアクセス制御はできません。  
**自分専用の Firebase プロジェクト** で使う前提で、次を設定します。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{expenseId} {
      allow read, write: if true;
    }
  }
}
```

**「公開」** をクリックして保存。

> **重要:** API キーはクライアントに含まれるため、他人と **同じプロジェクトを共有しない** でください。家族ごとに別プロジェクトを作ります。

### C-4. Web アプリを登録（環境変数用の6値）

1. プロジェクトの **歯車アイコン** → **「プロジェクトの設定」**
2. **「マイアプリ」** → **`</>` Web** をクリック
3. アプリのニックネーム（例: `kakeibo-web`）→ **アプリを登録**
4. 表示される `firebaseConfig` の値を控える（次の表）

| Firebase コンソール | `.env.local` の変数名 |
|---------------------|------------------------|
| apiKey | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| authDomain | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| projectId | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| storageBucket | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| messagingSenderId | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| appId | `NEXT_PUBLIC_FIREBASE_APP_ID` |

---

## Part D: Gemini API の設定（レシート読み取り）

レシートの AI 読み取りを使わない場合は **スキップ可**（支出の手入力・編集は動作します）。

### D-1. API キーの作成

1. [Google AI Studio - API Keys](https://aistudio.google.com/apikey) を開く
2. **「API キーを作成」**
3. 表示されたキーをコピー → `NEXT_PUBLIC_GEMINI_API_KEY` に使う

### D-2. API キーの制限（推奨・デプロイ後）

デプロイして URL が決まったあと、[Google Cloud Console - 認証情報](https://console.cloud.google.com/apis/credentials) で該当キーを開き:

- **アプリケーションの制限:** HTTP リファラー（ウェブサイト）
- **許可するリファラー例:**
  - `http://localhost:3000/*`（ローカル開発）
  - `https://あなたのプロジェクトID.web.app/*`（本番）

設定を変えたら、本番反映のため **再度デプロイ**（Part G）します。

---

## Part E: プロジェクト内ファイルの設定

以下は **リポジトリ直下**（`package.json` と同じ階層）での作業です。

### E-1. `.env.local` を作成（必須）

1. `.env.example` をコピーして `.env.local` という名前にする

**Windows（PowerShell）:**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

2. `.env.local` をテキストエディタで開き、Part C-4 / D-1 の値を貼り付ける

**記入例（値はすべて自分のものに置き換える）:**

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yamada-kakeibo-a1b2c3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yamada-kakeibo-a1b2c3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yamada-kakeibo-a1b2c3.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

**注意**

- `=` の前後にスペースを入れない
- 値を `"` で囲まない
- **他人の `.env.local` をコピーしない**
- `.env.local` は **Git にコミットしない**（`.gitignore` 済み）

### E-2. `.firebaserc` を編集（必須）

ファイルを開き、`default` を **自分の Firebase プロジェクト ID** に変更する。

**変更前（例・他人の ID が入っている場合）:**

```json
{
  "projects": {
    "default": "expense-tracker-de45e"
  }
}
```

**変更後（例）:**

```json
{
  "projects": {
    "default": "yamada-kakeibo-a1b2c3"
  }
}
```

### E-3. 編集しなくてよいファイル

| ファイル | 説明 |
|----------|------|
| `firebase.json` | Hosting 設定（そのまま） |
| `src/lib/firebase.ts` | 環境変数を読むだけ（変更不要） |
| `next.config.ts` | 変更不要 |

### E-4. 任意のカスタマイズ

| ファイル | 内容 |
|----------|------|
| `public/manifest.webmanifest` | PWA のアプリ名（`name`, `short_name`） |
| `src/app/layout.tsx` | ブラウザタブのタイトル |
| `src/lib/receipt-scan.ts` | エラーメッセージ内のプロジェクト名表記（任意） |

---

## Part F: ローカルで動作確認

プロジェクトルートで:

```bash
npm run dev
```

**期待する結果:**

```
▲ Next.js ...
- Local: http://localhost:3000
```

ブラウザで **http://localhost:3000** を開く。

### 確認項目

- [ ] ホーム画面が表示される
- [ ] 下部 **「入力」** から支出を1件保存できる
- [ ] **履歴** にその支出が表示される
- [ ] 履歴の行をタップして **編集・削除** できる
- [ ] Firebase コンソール → Firestore → `expenses` にデータが増えている
- [ ] （Gemini 設定時）レシートの **撮影 / 写真を選ぶ** が動く

### うまくいかないとき

- `.env.local` 保存後、**`npm run dev` を止めて（Ctrl+C）再起動**
- 6つの `NEXT_PUBLIC_FIREBASE_*` がすべて埋まっているか確認

停止: ターミナルで `Ctrl + C`

---

## Part G: Firebase Hosting へ公開

### G-1. デプロイ先プロジェクトの確認

```bash
firebase use
```

**期待する結果:** 自分のプロジェクト ID が `(current)` と表示される。

違う場合:

```bash
firebase use あなたのプロジェクトID
```

### G-2. ビルドとデプロイ

```bash
npm run deploy:hosting
```

内部で `npm run build` → `out` フォルダ生成 → Hosting へアップロードされます。

**期待する結果（末尾付近）:**

```
+  Deploy complete!
Hosting URL: https://yamada-kakeibo-a1b2c3.web.app
```

### G-3. 本番確認

1. 表示された **Hosting URL** をスマホのブラウザで開く
2. 支出の追加・履歴・編集を再度確認
3. Gemini を使う場合: リファラー制限に **この URL** を追加済みか確認（Part D-2）

### G-4. コードを変更したあと

機能追加や `.env.local` の変更を反映するたび:

```bash
npm run deploy:hosting
```

---

## 10. 友人・家族に渡すとき

### 渡してよいもの

- ソースコード（GitHub URL または ZIP）
- この **SETUP.md**

### 渡してはいけないもの

- あなたの `.env.local`
- あなたの Firebase / Gemini の API キー

### 各人が行うこと

**この SETUP.md の Part A 〜 G を、自分の Google アカウントで最初から実行する。**

- 開発環境（Node.js）: **自分でデプロイする人の PC に必要**
- ビルドだけ任せる場合: 設定値（6+1）を渡し、代行者の PC で Part E〜G を実行

### 同じ URL を全員で共有したい場合

現状のアプリは **ログイン機能がない** ため、1つの URL を共有すると **全員が同じ家計簿データを見られ・書き換えられます**。個人用には **1人1 Firebase プロジェクト** を推奨します。

---

## 11. よくあるトラブル

| 症状 | 対処 |
|------|------|
| `node` / `npm` が認識されない | Node.js を再インストールし、ターミナルを開き直す |
| `npm install` が失敗する | Node を 20 以上に上げる。ウイルス対策ソフトの除外を確認 |
| Firebase 環境変数が未設定 | `.env.local` の6項目。dev サーバー再起動 |
| Firestore に保存できない | Firestore 作成済みか、ルールを公開したか、プロジェクト ID 一致 |
| デプロイ先が他人のプロジェクト | `.firebaserc` と `firebase login` アカウントを確認 |
| レシートが使えない | `NEXT_PUBLIC_GEMINI_API_KEY` と再デプロイ、429 は時間をおく |
| 本番だけ古い画面 | PWA キャッシュ。アプリ終了→再起動、再デプロイ後に再読み込み |
| PowerShell で `&&` が使えない | コマンドを1行ずつ実行する |

---

## 12. 最終チェックリスト

### 開発環境

- [ ] `node -v` が v20 以上
- [ ] `npm -v` が表示される
- [ ] `firebase --version` が表示される
- [ ] `firebase login` 済み
- [ ] `npm install` 済み

### Firebase / Gemini

- [ ] Firebase プロジェクト作成（Spark）
- [ ] Firestore 作成（`asia-northeast1` 推奨）
- [ ] Firestore ルール公開
- [ ] Web アプリ登録 → 6 値取得
- [ ] （任意）Gemini API キー取得

### プロジェクト設定

- [ ] `.env.local` 作成・7 変数記入
- [ ] `.firebaserc` の `default` を自分のプロジェクト ID に変更

### 動作・公開

- [ ] `npm run dev` で localhost 動作
- [ ] Firestore に `expenses` データあり
- [ ] `npm run deploy:hosting` 成功
- [ ] Hosting URL でスマホ動作確認

---

## 参考リンク

- [Firebase コンソール](https://console.firebase.google.com/)
- [Firebase 料金（Spark）](https://firebase.google.com/pricing)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API 料金](https://ai.google.dev/gemini-api/docs/pricing)
- [Node.js ダウンロード](https://nodejs.org/)

---

*このアプリ: Next.js 16 + Firestore + Firebase Hosting + Gemini（レシート OCR）*
