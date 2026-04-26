export type ColorPalette = {
  primary: string;
  dark: string;
  light: string;
  hex: string;
  darkHex: string;
  lightHex: string;
  r: number;
  g: number;
  b: number;
};

const DEFAULT: ColorPalette = {
  primary: "rgb(232,192,138)",
  dark: "rgb(167,138,100)",
  light: "rgb(255,222,172)",
  hex: "#E8C08A",
  darkHex: "#A78A64",
  lightHex: "#FFDEAC",
  r: 232, g: 192, b: 138,
};

function toHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export async function extractPetColors(imageSrc: string): Promise<ColorPalette> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        const SIZE = 80;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(DEFAULT);

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Collect color buckets - skip near-white, near-black, low-saturation
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3];
          if (pa < 100) continue;
          const brightness = (pr + pg + pb) / 3;
          if (brightness > 240 || brightness < 10) continue;
          // Skip very desaturated (gray-ish) only if it's pure gray
          const maxC = Math.max(pr, pg, pb);
          const minC = Math.min(pr, pg, pb);
          if (maxC - minC < 8 && brightness > 180) continue; // skip gray-white
          r += pr; g += pg; b += pb;
          count++;
        }

        if (count < 100) return resolve(DEFAULT);

        const ar = Math.round(r / count);
        const ag = Math.round(g / count);
        const ab = Math.round(b / count);

        const dr = Math.round(ar * 0.68);
        const dg = Math.round(ag * 0.68);
        const db = Math.round(ab * 0.68);

        const lr = Math.min(255, Math.round(ar * 1.35 + 10));
        const lg = Math.min(255, Math.round(ag * 1.35 + 10));
        const lb = Math.min(255, Math.round(ab * 1.35 + 10));

        resolve({
          primary: `rgb(${ar},${ag},${ab})`,
          dark: `rgb(${dr},${dg},${db})`,
          light: `rgb(${lr},${lg},${lb})`,
          hex: toHex(ar, ag, ab),
          darkHex: toHex(dr, dg, db),
          lightHex: toHex(lr, lg, lb),
          r: ar, g: ag, b: ab,
        });
      } catch {
        resolve(DEFAULT);
      }
    };

    img.onerror = () => resolve(DEFAULT);
    img.src = imageSrc;
  });
}
