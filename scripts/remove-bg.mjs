import sharp from "sharp";
import { readdirSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = new URL("../public", import.meta.url).pathname;
const FILES = readdirSync(PUBLIC_DIR).filter(
  (f) => (f.startsWith("user-") || f.startsWith("pet-")) && f.endsWith(".png")
);

async function removeBg(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H } = info;
  const d = data;

  // サンプリングでエッジの支配色を検出
  const step = Math.max(1, Math.floor(Math.min(W, H) / 20));
  const buckets = new Map();
  const sample = (pos) => {
    const i = pos * 4;
    if (d[i + 3] === 0) return;
    const qr = Math.round(d[i] / 32) * 32;
    const qg = Math.round(d[i + 1] / 32) * 32;
    const qb = Math.round(d[i + 2] / 32) * 32;
    const key = `${qr},${qg},${qb}`;
    const cur = buckets.get(key) ?? { count: 0, r: d[i], g: d[i + 1], b: d[i + 2] };
    buckets.set(key, { ...cur, count: cur.count + 1 });
  };
  for (let x = 0; x < W; x += step) { sample(x); sample(x + (H - 1) * W); }
  for (let y = 1; y < H - 1; y += step) { sample(y * W); sample((W - 1) + y * W); }

  if (buckets.size === 0) { console.log(`  skip (already transparent): ${filePath}`); return; }
  const dom = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  const { r: bgR, g: bgG, b: bgB } = dom;

  const sat = Math.max(bgR, bgG, bgB) - Math.min(bgR, bgG, bgB);
  const tol = Math.min(100, Math.max(40, Math.floor(sat * 0.4)));
  const isBg = (r, g, b) =>
    Math.abs(r - bgR) <= tol && Math.abs(g - bgG) <= tol && Math.abs(b - bgB) <= tol;

  // フラッドフィル（エッジから1パス）
  const visited = new Uint8Array(W * H);
  const queue = [];
  for (let x = 0; x < W; x++) { queue.push(x); queue.push(x + (H - 1) * W); }
  for (let y = 1; y < H - 1; y++) { queue.push(y * W); queue.push((W - 1) + y * W); }

  while (queue.length) {
    const pos = queue.pop();
    if (visited[pos]) continue;
    visited[pos] = 1;
    const i = pos * 4;
    if (isBg(d[i], d[i + 1], d[i + 2])) {
      d[i + 3] = 0;
      const x = pos % W, y = Math.floor(pos / W);
      if (x > 0) queue.push(pos - 1);
      if (x < W - 1) queue.push(pos + 1);
      if (y > 0) queue.push(pos - W);
      if (y < H - 1) queue.push(pos + W);
    }
  }

  await sharp(Buffer.from(d), { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(filePath);

  const removed = [...new Uint8Array(d)].filter((_, i) => i % 4 === 3 && d[i] === 0).length;
  console.log(`  done (bg=${bgR},${bgG},${bgB} tol=${tol} removed=${removed}/${W * H}): ${filePath}`);
}

for (const file of FILES) {
  const filePath = join(PUBLIC_DIR, file);
  process.stdout.write(`Processing ${file}...\n`);
  await removeBg(filePath);
}

console.log("\nAll done.");
