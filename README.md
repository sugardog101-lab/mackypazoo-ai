# MACKYPAZOO AI試合分析（保存なし・KV不要）

既存のバドミントン組み合わせ表とは別の Cloudflare Worker です。

## 機能
- MACKYPAZOO公開動画の最新15件をYouTubeフィードから表示
- タイトル検索・動画再生・URLからの手動指定
- 試合全体を対象とした分析プロンプトをコピー
- Google AI Studioへ移動して各自のGoogleアカウントで分析
- レポート保存・共有・管理者パスワード・KVは一切なし

## 設置
1. Cloudflare Workersで新規Worker `mackypazoo-ai` を作成（既存Workerは変更しない）
2. Wranglerを使用する場合はこのフォルダで `npx wrangler deploy`
3. YouTube動画一覧が取得できない場合は、YouTubeチャンネルのUCから始まるチャンネルIDを調べ、`wrangler.toml` の `[vars]` に `YOUTUBE_CHANNEL_ID = "UC..."` を追加して再デプロイ

## 注意
- YouTube動画一覧は公開フィードに含まれる最新15件です。全動画の一覧ではありません。
- YouTube側の取得制限がある場合はURLを手入力できます。
- Google AI Studioへのプロンプトと動画の完全自動入力はできません。コピーしたプロンプトを貼り付け、動画を指定してください。
- 動画の映像解析はGoogle側の機能・利用枠・制限に依存します。
- Worker側でAI APIを呼ばないため、AI API料金は発生しません。ただし各自のGoogle側の利用枠は消費される場合があります。
