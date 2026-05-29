# 家計簿（expense-tracker）

日々の支出を記録する個人用 PWA 家計簿です。Firestore に保存し、Firebase Hosting で公開します。レシートの AI 読み取り（Gemini）に対応しています。

## 環境構築・設定（必読）

**初めてセットアップする人は、[SETUP.md](./SETUP.md) を上から順に実施してください。**

Node.js のインストール、Firebase / Gemini の API 設定、`.env.local` の作成、デプロイまで一通り記載しています。

## クイックリファレンス（設定済みの場合）

```bash
npm install
npm run dev          # http://localhost:3000
npm run deploy:hosting   # Firebase Hosting へ公開
```

環境変数は `.env.example` をコピーして `.env.local` を作成し、Firebase / Gemini の値を設定します。
