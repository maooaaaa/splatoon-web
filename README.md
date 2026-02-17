# SplatZone - 3D Ink Battle

スプラトゥーン風の3Dインクバトルゲームです。ブラウザで動作します。

## 🎮 遊び方

### オンラインでプレイ

GitHub Pages で公開中: **[https://maooaaaa.github.io/splatoon-web/](https://maooaaaa.github.io/splatoon-web/)**

### ローカルで実行

このリポジトリをクローンして、`index.html` をブラウザで開いてください。

```bash
git clone https://github.com/maooaaaa/splatoon-web.git
cd splatoon-web
```

その後、`index.html` をブラウザで開くか、ローカルサーバーを起動してください：

```bash
# Python 3 の場合
python -m http.server 8000

# Node.js がある場合
npx http-server
```

ブラウザで `http://localhost:8000` にアクセスしてプレイできます。

## 🎯 操作説明

- **W A S D** - 移動
- **マウス** - 照準（上下左右）
- **左クリック** - 射撃 / チャージ溜め
- **Space** - ジャンプ / 壁登り
- **Shift** - イカ潜り（自チームインク上）
- **E** - ミニボム投げ
- **Q** - スペシャル発動
- **1 2 3** - 武器切替
- **R** - スーパージャンプ

## 📦 技術スタック

- **Three.js** (v0.160.0) - 3Dグラフィックス
- バニラJavaScript (ES Modules)
- HTML5 Canvas
- CSS3

## 🚀 GitHub Pages の設定方法

このリポジトリを GitHub Pages で公開するには：

1. リポジトリの **Settings** → **Pages** に移動
2. **Source** で **Deploy from a branch** を選択
3. **Branch** で **main** ブランチと **/ (root)** フォルダを選択
4. **Save** をクリック

数分後、`https://<username>.github.io/splatoon-web/` でアクセスできるようになります。

## 📁 プロジェクト構造

```
splatoon-web/
├── index.html          # メインHTMLファイル
├── src/
│   ├── main.js        # エントリーポイント
│   ├── game.js        # ゲームループとロジック
│   ├── player.js      # プレイヤー制御
│   ├── ai.js          # AI制御
│   ├── map.js         # マップ生成
│   ├── ink.js         # インク描画システム
│   ├── particles.js   # パーティクルエフェクト
│   ├── audio.js       # サウンド管理
│   ├── input.js       # 入力処理
│   ├── ui.js          # UI管理
│   └── style.css      # スタイルシート
└── README.md          # このファイル
```

## 🎨 ゲーム特徴

- **4 vs 4** のインクバトル
- **90秒間** の対戦時間
- **3種類の武器**:
  - 🔫 シューター（バランス型）
  - 🖌️ ローラー（近接+塗り）
  - 🎯 チャージャー（溜め撃ち一撃）
- インク塗り面積で勝敗が決まる
- イカ潜伏で高速移動＆インク回復
- スペシャルウェポン＆ボム

## 📝 ライセンス

このプロジェクトは個人的な学習・趣味目的で作成されています。
