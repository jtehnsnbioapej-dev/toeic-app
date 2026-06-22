import { buildUserIdlePrompt, buildPetIdlePrompt, USER_EMOTIONS, PET_EMOTIONS } from "./imagePrompts";

function loadImageFromBase64(b64: string, mimeType = "image/png"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = `data:${mimeType};base64,${b64}`;
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`ポーズ参照画像の読み込みに失敗しました: ${url}`));
    img.src = url;
  });
}

function fitInside(srcW: number, srcH: number, maxW: number, maxH: number): { w: number; h: number } {
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
  return { w: Math.round(srcW * ratio), h: Math.round(srcH * ratio) };
}

async function buildCompositeForIdle(
  userPhotoBase64: string,
  role: "user" | "pet",
  gender: string
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "rgb(255,0,255)";
  ctx.fillRect(0, 0, 1024, 1024);

  const userImg = await loadImageFromBase64(userPhotoBase64);
  const { w: uW, h: uH } = fitInside(userImg.naturalWidth, userImg.naturalHeight, 700, 700);
  const uLeft = Math.floor((1024 - uW) / 2);
  const uTop = Math.floor((1024 - uH) / 2);
  ctx.drawImage(userImg, uLeft, uTop, uW, uH);

  const poseRefSrc =
    role === "user"
      ? gender === "male" ? "/user2-idle.png" : "/user-idle.png"
      : "/pet-idle.png";
  const poseImg = await loadImageFromUrl(poseRefSrc);

  const halfH = Math.floor(poseImg.naturalHeight * 0.5);
  const { w: pW, h: pH } = fitInside(poseImg.naturalWidth, halfH, 220, 220);

  ctx.drawImage(
    poseImg,
    0, 0, poseImg.naturalWidth, halfH,
    1024 - pW - 8, 1024 - pH - 8, pW, pH
  );

  return canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
}

// 透過背景生成で白い服の肩などをモデルが「背景」と誤判定し、体の内部に
// 透明な穴があくことがある。外周と連結していない透過領域＝内部の穴とみなし、
// 隣接する不透明ピクセルの色で塗りつぶす（外周連結の透過＝正しい背景は残す）。
function fillInteriorTransparentHoles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const ALPHA_T = 16; // これ以下を透過とみなす（アンチエイリアスの半透明縁は不透明扱いで保持）
  const n = w * h;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const isTransparent = (p: number) => data[p * 4 + 3] <= ALPHA_T;

  // 外周から透過領域をフラッドフィルし「外側の背景」をマーク
  const exterior = new Uint8Array(n);
  const stack: number[] = [];
  const seed = (p: number) => {
    if (!exterior[p] && isTransparent(p)) {
      exterior[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + (w - 1));
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (y > 0) seed(p - w);
    if (y < h - 1) seed(p + w);
  }

  // 内部の穴 = 透過 かつ 外周非連結
  let remaining: number[] = [];
  for (let p = 0; p < n; p++) {
    if (isTransparent(p) && !exterior[p]) remaining.push(p);
  }
  if (remaining.length === 0) return;

  // 隣接する不透明ピクセルの色で内側へ向かって反復的に塗りつぶす（dilation）
  while (remaining.length) {
    const next: number[] = [];
    let progressed = false;
    for (const p of remaining) {
      const x = p % w;
      const y = (p / w) | 0;
      let src = -1;
      if (x > 0 && data[(p - 1) * 4 + 3] > ALPHA_T) src = p - 1;
      else if (x < w - 1 && data[(p + 1) * 4 + 3] > ALPHA_T) src = p + 1;
      else if (y > 0 && data[(p - w) * 4 + 3] > ALPHA_T) src = p - w;
      else if (y < h - 1 && data[(p + w) * 4 + 3] > ALPHA_T) src = p + w;
      if (src >= 0) {
        data[p * 4] = data[src * 4];
        data[p * 4 + 1] = data[src * 4 + 1];
        data[p * 4 + 2] = data[src * 4 + 2];
        data[p * 4 + 3] = 255;
        progressed = true;
      } else {
        next.push(p);
      }
    }
    if (!progressed) {
      // 念のため無限ループ防止（通常は到達しない）
      for (const p of next) data[p * 4 + 3] = 255;
      break;
    }
    remaining = next;
  }

  ctx.putImageData(imageData, 0, 0);
}

// ネイティブ解像度で穴埋めしたcanvasを返す
async function loadHoleFilledCanvas(b64: string): Promise<HTMLCanvasElement> {
  const img = await loadImageFromBase64(b64);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  fillInteriorTransparentHoles(ctx, w, h);
  return canvas;
}

async function processGeneratedImage(b64: string): Promise<string> {
  const W = 1024, H = 1500;
  const scaledW = Math.round(W * 0.8);
  const scaledH = Math.round(H * 0.8);
  const padX = Math.round((W - scaledW) / 2);
  const bottomPad = 10;
  const topPad = H - scaledH - bottomPad;

  const src = await loadHoleFilledCanvas(b64);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(src, 0, 0, src.width, src.height, padX, topPad, scaledW, scaledH);

  return canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
}

async function processIdleImage(b64: string): Promise<{ idle: string; idleRef: string }> {
  const W = 1024, H = 1500;
  const scaledW = Math.round(W * 0.8);
  const scaledH = Math.round(H * 0.8);
  const padX = Math.round((W - scaledW) / 2);
  const bottomPad = 10;
  const topPad = H - scaledH - bottomPad;

  // 穴埋めは一度だけ実施し、idle（表示用）とidleRef（emotion生成の参照）の双方に反映
  const src = await loadHoleFilledCanvas(b64);

  const idleCanvas = document.createElement("canvas");
  idleCanvas.width = W;
  idleCanvas.height = H;
  const idleCtx = idleCanvas.getContext("2d")!;
  idleCtx.drawImage(src, 0, 0, src.width, src.height, padX, topPad, scaledW, scaledH);
  const idle = idleCanvas.toDataURL("image/png").replace("data:image/png;base64,", "");

  // idleRef（emotion生成の参照画像）はネイティブ解像度のまま渡す。
  // クライアント直叩きで転送制約がないため、縮小せず細部の画風・線・塗りを保持し、
  // emotion側でのスタイル再解釈（画風ズレ）を抑える。穴埋め済みのsrcをそのまま使用。
  const idleRef = src.toDataURL("image/png").replace("data:image/png;base64,", "");

  return { idle, idleRef };
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function callOpenAIImageEdit(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  size: "1024x1024" | "1024x1536",
  quality: "low" | "medium" | "high",
  background: "transparent" | "opaque"
): Promise<string> {
  // XHR を使用: CapacitorHttp は window.fetch のみパッチし XHR はパッチしない。
  // WKWebView ネイティブ XHR は FormData+Blob を正しくバイナリシリアライズする。
  // xhr.timeout で 5 分のタイムアウトを設定可能。
  if (!apiKey || apiKey.length < 20) {
    return Promise.reject(new Error(`OpenAI APIキーが無効です（長さ: ${apiKey?.length ?? 0}）。NEXT_PUBLIC_OPENAI_API_KEYを確認してください。`));
  }
  return new Promise((resolve, reject) => {
    const imageBuffer = base64ToArrayBuffer(imageBase64);
    const blob = new Blob([imageBuffer], { type: "image/png" });

    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("image", blob, "image.png");
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", size);
    formData.append("quality", quality);
    formData.append("background", background);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.openai.com/v1/images/edits");
    xhr.timeout = 300000; // 5分
    xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`);
    // Content-Type は XHR が FormData から自動設定（boundary 含む）

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const b64 = data?.data?.[0]?.b64_json as string | undefined;
          if (!b64) reject(new Error("画像データがレスポンスに含まれていません"));
          else resolve(b64);
        } catch {
          reject(new Error("レスポンスの解析に失敗しました"));
        }
      } else {
        let msg = `OpenAI APIエラー (HTTP ${xhr.status})`;
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData?.error?.message) msg += `: ${errData.error.message}`;
          if (errData?.error?.code) msg += ` [${errData.error.code}]`;
        } catch {
          if (xhr.responseText) msg += `\n${xhr.responseText.substring(0, 300)}`;
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("ネットワークエラー: OpenAI APIに接続できません"));
    xhr.ontimeout = () => reject(new Error("タイムアウト（5分経過）"));

    xhr.send(formData);
  });
}

async function callWithRetry(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  size: "1024x1024" | "1024x1536",
  quality: "low" | "medium" | "high",
  background: "transparent" | "opaque",
  maxRetries = 2
): Promise<string> {
  let lastError: Error = new Error("不明なエラー");
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    try {
      return await callOpenAIImageEdit(imageBase64, prompt, apiKey, size, quality, background);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      // 5xx系・タイムアウトのみリトライ。4xx系はリトライしない
      const shouldRetry = /HTTP (5\d\d)/.test(msg) || msg.includes("タイムアウト") || msg.includes("ネットワークエラー");
      if (!shouldRetry || attempt === maxRetries) throw lastError;
    }
  }
  throw lastError;
}

export async function generateIdleClient(
  userPhotoBase64: string,
  role: "user" | "pet",
  gender: string,
  ageGroup: string,
  apiKey: string
): Promise<{ idle: string; idleRef: string }> {
  const composite = await buildCompositeForIdle(userPhotoBase64, role, gender);
  const prompt =
    role === "user" ? buildUserIdlePrompt(gender, ageGroup) : buildPetIdlePrompt();
  const b64 = await callWithRetry(composite, prompt, apiKey, "1024x1536", "medium", "transparent");
  return processIdleImage(b64);
}

export async function generateEmotionClient(
  idleRefBase64: string,
  emotion: string,
  role: "user" | "pet",
  apiKey: string
): Promise<string> {
  const emotionPrompts = role === "user" ? USER_EMOTIONS : PET_EMOTIONS;
  const prompt = emotionPrompts[emotion] ?? emotionPrompts["happy"];
  const b64 = await callWithRetry(idleRefBase64, prompt, apiKey, "1024x1536", "medium", "transparent");
  return processGeneratedImage(b64);
}
