import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.toeicapp.app",
  appName: "Hikari TOEIC",
  webDir: "out",
  server: {
    // 本番: コメントアウト（ローカルビルドを使用）
    // 開発確認用: url: "http://localhost:3000"
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
