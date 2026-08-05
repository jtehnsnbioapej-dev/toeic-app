import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー | Hikari TOEIC",
  description: "Hikari TOEIC のプライバシーポリシー",
};

const h2: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--text)",
  marginTop: 28,
  marginBottom: 8,
};

const p: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.85,
  color: "var(--text)",
  margin: "0 0 10px",
};

const li: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.8,
  color: "var(--text)",
  marginBottom: 6,
};

const ul: React.CSSProperties = {
  margin: "0 0 10px",
  paddingLeft: 20,
};

const link: React.CSSProperties = {
  color: "var(--primary-dark)",
  wordBreak: "break-all",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      {/* ヘッダー */}
      <div
        style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "52px 20px 16px",
        }}
      >
        <Link
          href="/"
          style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none" }}
        >
          ← ホーム
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginTop: 8 }}>
          プライバシーポリシー
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2, fontWeight: 600 }}>
          Hikari TOEIC ／ 制定日：2026年6月21日
        </p>
      </div>

      {/* 本文 */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 20px 0" }}>
        <p style={p}>
          本プライバシーポリシー（以下「本ポリシー」）は、モバイルアプリ「Hikari
          TOEIC」（以下「本アプリ」）における利用者の情報の取り扱いについて定めるものです。
        </p>

        <h2 style={h2}>1. 基本方針</h2>
        <p style={p}>
          本アプリはアカウント登録を必要とせず、学習データは原則として利用者の端末内に保存されます。本アプリは広告配信・行動トラッキング・第三者の解析（アナリティクス）SDKを一切使用していません。
        </p>

        <h2 style={h2}>2. 端末内に保存される情報</h2>
        <p style={p}>以下の情報は利用者の端末内にのみ保存され、開発者のサーバーへ送信・保存されることはありません。</p>
        <ul style={ul}>
          <li style={li}>学習の進捗（解答履歴、正答率、連続学習日数など）</li>
          <li style={li}>アプリの設定（効果音のオン／オフなど）</li>
          <li style={li}>利用者が生成したキャラクター画像</li>
          <li style={li}>課金状態（プレミアム購入の有無、チケット枚数）</li>
        </ul>
        <p style={p}>
          これらは端末内（localStorage / IndexedDB / iOS の UserDefaults
          等）に保存され、アプリを削除（アンインストール）すると消去されます。
        </p>

        <h2 style={h2}>3. 外部サービスへ送信される情報</h2>
        <p style={p}>
          本アプリの一部の機能は、その機能を提供する目的に限り、以下の外部サービスへ必要なデータを送信します。
        </p>
        <ul style={ul}>
          <li style={li}>
            <b>キャラクター生成</b>：利用者が選択した写真・画像を OpenAI へ送信し、キャラクター画像を生成します。
          </li>
          <li style={li}>
            <b>読み上げ音声</b>：読み上げ対象のテキストを Google Cloud Text-to-Speech へ送信します。
          </li>
          <li style={li}>
            <b>翻訳</b>：翻訳対象の英文を MyMemory 翻訳 API（Translated 社）へ送信します。
          </li>
          <li style={li}>
            <b>課金</b>：購入処理は Apple（App Store / StoreKit）が行います。
          </li>
        </ul>
        <p style={p}>
          これらのデータは各機能の提供のためにのみ利用されます。開発者は処理結果（生成された画像・音声・翻訳結果など）を受け取りますが、開発者のサーバーに恒久的に保存することはありません。
        </p>

        <h2 style={h2}>4. 写真の取り扱い</h2>
        <p style={p}>
          キャラクター生成のために選択された写真は、キャラクター画像を生成する目的でのみ OpenAI
          へ送信されます。生成された画像は利用者の端末内に保存され、元の写真を開発者のサーバーに保存することはありません。OpenAI
          の API
          は、API経由で送信されたデータをモデルの学習に使用しません（OpenAI のAPIデータ利用ポリシーに基づく）。
        </p>

        <h2 style={h2}>5. 第三者サービスのプライバシーポリシー</h2>
        <p style={p}>本アプリが利用する外部サービスの取り扱いについては、各社のプライバシーポリシーをご参照ください。</p>
        <ul style={ul}>
          <li style={li}>
            OpenAI：
            <a href="https://openai.com/policies/privacy-policy" style={link}>
              https://openai.com/policies/privacy-policy
            </a>
          </li>
          <li style={li}>
            Google（Cloud）：
            <a href="https://cloud.google.com/terms/cloud-privacy-notice" style={link}>
              https://cloud.google.com/terms/cloud-privacy-notice
            </a>
          </li>
          <li style={li}>
            Translated（MyMemory）：
            <a href="https://translated.com/privacy-policy" style={link}>
              https://translated.com/privacy-policy
            </a>
          </li>
          <li style={li}>
            Apple：
            <a href="https://www.apple.com/legal/privacy/" style={link}>
              https://www.apple.com/legal/privacy/
            </a>
          </li>
        </ul>

        <h2 style={h2}>6. 課金について</h2>
        <p style={p}>
          本アプリは Apple の App内課金（StoreKit）を利用します。クレジットカード情報などの決済情報は Apple
          が処理し、開発者がこれらを取得・保存することはありません。購入状態（プレミアムの有無・チケット枚数）は端末内にのみ保存されます。
        </p>

        <h2 style={h2}>7. お子様のプライバシー</h2>
        <p style={p}>
          本アプリは個人情報の登録を求めず、アカウント機能を備えていません。お子様が利用する場合も、個人を特定する情報を収集することはありません。
        </p>

        <h2 style={h2}>8. データの保存期間と削除</h2>
        <p style={p}>
          端末内に保存された情報は、アプリを削除（アンインストール）することでいつでも消去できます。また、アプリ内の機能（キャラクターの削除など）から個別に削除することもできます。
        </p>

        <h2 style={h2}>9. 本ポリシーの変更</h2>
        <p style={p}>
          本ポリシーは、法令の変更やサービス内容の変更に応じて改定することがあります。重要な変更がある場合は、本ページにて告知します。
        </p>

        <h2 style={h2}>10. お問い合わせ</h2>
        <p style={p}>
          本ポリシーまたは本アプリのプライバシーに関するお問い合わせは、以下までご連絡ください。
        </p>
        <p style={{ ...p, fontWeight: 700 }}>
          メール：hikari.app2026@gmail.com
        </p>

        <p style={{ ...p, color: "var(--text-sub)", marginTop: 24, fontSize: 13 }}>
          制定日：2026年6月21日
        </p>
      </div>
    </div>
  );
}
