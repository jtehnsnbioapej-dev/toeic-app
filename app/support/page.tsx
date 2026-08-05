import Link from "next/link";

export const metadata = {
  title: "サポート | Hikari TOEIC",
  description: "Hikari TOEIC のサポート・よくある質問・お問い合わせ",
};

const h2: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--text)",
  marginTop: 28,
  marginBottom: 8,
};

const q: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--text)",
  marginTop: 18,
  marginBottom: 4,
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

export default function SupportPage() {
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
          サポート
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2, fontWeight: 600 }}>
          Hikari TOEIC ／ よくある質問とお問い合わせ
        </p>
      </div>

      {/* 本文 */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 20px 0" }}>
        <p style={p}>
          Hikari TOEIC をご利用いただきありがとうございます。よくあるご質問をまとめました。解決しない場合は、ページ下部のお問い合わせ先までご連絡ください。
        </p>

        <h2 style={h2}>料金・課金について</h2>

        <p style={q}>Q. 無料でどこまで使えますか？</p>
        <p style={p}>
          各パートの一部（入門レベルの最初のセッション）を無料でお試しいただけます。すべてのパート・難易度・ランダムクイズはプレミアム（買い切り）で解放されます。
        </p>

        <p style={q}>Q. プレミアムを購入すると何ができますか？</p>
        <p style={p}>
          Part 1〜7・500〜900点レベルの全問題、ランダム出題のクイズがすべて解放されます。あわせてキャラ生成チケットを1枚プレゼントします。買い切りのため、月額料金はかかりません。
        </p>

        <p style={q}>Q. 購入したのに反映されません／機種変更しました</p>
        <p style={p}>
          ペイウォール画面の「購入を復元」ボタンをタップしてください。購入時と同じ Apple ID でサインインしていれば、プレミアムの権利が復元されます。
        </p>

        <p style={q}>Q. キャラ生成チケットとは何ですか？</p>
        <p style={p}>
          あなたの写真からオリジナルキャラクターを生成するために使用するチケットです（1枚＝1キャラ生成）。生成が成功したときにのみ消費され、生成に失敗した場合は消費されません。
        </p>

        <p style={q}>Q. 返金してほしい</p>
        <p style={p}>
          App内課金の返金は Apple が窓口となります。
          <a href="https://reportaproblem.apple.com/" style={link}>
            reportaproblem.apple.com
          </a>
          からお手続きください。
        </p>

        <h2 style={h2}>キャラクター生成について</h2>

        <p style={q}>Q. どんな写真を使えばよいですか？</p>
        <p style={p}>
          ペットや人物がはっきり写った、明るい写真がおすすめです。AIによる生成のため、写真を忠実に再現するものではなく、雰囲気を元にしたイラストが作られます。
        </p>

        <p style={q}>Q. 生成が途中で止まってしまいます</p>
        <p style={p}>
          生成中に他の画面へ移動すると処理が中断されることがあります。生成中は画面をそのままにしてお待ちください。通信環境の良い場所での実行をおすすめします。
        </p>

        <h2 style={h2}>学習データについて</h2>

        <p style={q}>Q. 学習データはどこに保存されますか？</p>
        <p style={p}>
          進捗・設定・生成したキャラクターはすべてお使いの端末内に保存されます。開発者のサーバーには保存されません。詳しくは
          <Link href="/privacy" style={link}>
            プライバシーポリシー
          </Link>
          をご覧ください。
        </p>

        <p style={q}>Q. データを削除したい</p>
        <p style={p}>
          アプリを削除（アンインストール）すると、端末内の学習データはすべて消去されます。キャラクターは設定画面から個別に削除することもできます。
        </p>

        <h2 style={h2}>音・その他</h2>

        <p style={q}>Q. 効果音や読み上げが鳴りません</p>
        <p style={p}>
          端末のサイレント（消音）スイッチと音量をご確認ください。効果音はホーム画面または設定画面のトグルでオン／オフを切り替えられます。
        </p>

        <h2 style={h2}>お問い合わせ</h2>
        <p style={p}>
          上記で解決しない場合や、ご要望・不具合のご報告は、以下のメールアドレスまでお気軽にご連絡ください。数日以内に返信いたします。
        </p>
        <p style={{ ...p, fontWeight: 700 }}>
          メール：hikari.app2026@gmail.com
        </p>
        <p style={p}>
          お問い合わせの際は、ご利用の端末・iOSバージョン・発生している状況を記載いただけるとスムーズです。
        </p>

        <h2 style={h2}>関連リンク</h2>
        <ul style={ul}>
          <li style={li}>
            <Link href="/privacy" style={link}>
              プライバシーポリシー
            </Link>
          </li>
        </ul>

        <p style={{ ...p, color: "var(--text-sub)", marginTop: 24, fontSize: 13 }}>
          Hikari TOEIC
        </p>
      </div>
    </div>
  );
}
