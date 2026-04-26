import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType, animalType } = await req.json();

    const buffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([buffer], { type: mediaType });

    const output = await replicate.run(
      "fofr/face-to-many",
      {
        input: {
          image: blob,
          style: "3D",
          prompt: `cute adorable ${animalType ?? "animal"} character, pixar style, soft lighting`,
          negative_prompt: "ugly, distorted, blurry, human face",
          num_steps: 20,
          guidance_scale: 7.5,
          ip_adapter_noise: 0.5,
          ip_adapter_weight: 0.6,
        },
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;
    return NextResponse.json({ imageUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-avatar error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
