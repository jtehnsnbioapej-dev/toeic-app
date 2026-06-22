import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import fs from "fs";
import path from "path";

export const maxDuration = 120;

// B方式: GPT-4oで写真分析 → テキストから画像生成（写真に引きずられない）
// false に戻すと旧方式（写真→アニメ変換）に切り替わる
const MALE_TWO_STEP = false;

const AGE_DESCRIPTIONS: Record<string, string> = {
  child:       "a child under 10 years old",
  teen:        "a teenager in their teens",
  young_adult: "a young adult in their 20s-30s",
  middle_aged: "a middle-aged person in their 40s-50s",
  senior:      "a senior aged 60 or above",
};

// デフォルトキャラ生成時と同じスタイル指定。写真は種類/外見の参照のみ。
const PET_IDLE =
  "Analyze the animal in the reference image and identify its species.\n\n" +
  "Create a charming mascot-style character based on the animal while preserving its real-world identity and unique traits.\n\n" +
  "Priority order:\n" +
  "1. Preserve the actual pet's identity.\n" +
  "2. Preserve facial structure, markings, fur patterns, eye shape, ear shape, muzzle shape, tail shape, and body proportions.\n" +
  "3. Enhance appeal and character charm.\n" +
  "4. Apply moderate stylization without losing resemblance.\n\n" +
  "The final character should immediately be recognizable as the pet in the reference photo.\n\n" +
  "Do NOT create a generic cartoon animal.\n" +
  "Do NOT create a chibi character.\n" +
  "Do NOT create an exaggerated anime mascot.\n" +
  "Do NOT simplify facial features.\n" +
  "Do NOT replace the animal's unique markings.\n\n" +
  "Target style:\n\n" +
  "High-quality semi-realistic 3D anime character.\n" +
  "Professional game mascot character design.\n" +
  "Premium Nintendo-quality character artwork.\n" +
  "Modern collectible character design.\n" +
  "Cute, appealing, and expressive while remaining believable as a real animal.\n" +
  "The character should feel like an official mascot from a premium video game franchise.\n" +
  "Balance realism and stylization carefully.\n" +
  "Realism: 70%\n" +
  "Stylization: 30%\n\n" +
  "Facial design:\n" +
  "Slightly larger eyes (15-20% larger than reality).\n" +
  "Bright, expressive, deeply appealing eyes with vivid color.\n" +
  "Warm and charming facial expression with clear personality.\n" +
  "Softened facial proportions for character appeal.\n" +
  "Preserve realistic muzzle structure.\n" +
  "Preserve realistic nose shape.\n" +
  "Preserve realistic ear shape.\n" +
  "Maintain the pet's recognizable facial identity.\n\n" +
  "Fur:\n" +
  "Preserve the EXACT asymmetric distribution of markings from the reference photo.\n" +
  "If the markings are asymmetric (e.g., patch only on one side of the face), reproduce that asymmetry faithfully.\n" +
  "Preserve color distribution and stripe patterns.\n" +
  "Detailed layered fur rendering.\n" +
  "Visible fur direction.\n" +
  "Soft fluffy fur volume.\n" +
  "VIVID, BRIGHT, PUNCHY color palette throughout.\n" +
  "Reproduce the EXACT fur colors and markings from the large reference photo. Do NOT shift, alter, or replace the coat color.\n" +
  "Strong color contrast between light and dark fur areas.\n" +
  "Vibrant glowing highlights that match the actual fur color of the animal.\n" +
  "Maximum color richness — avoid muted or desaturated tones.\n" +
  "Warm and vibrant appearance.\n\n" +
  "Lighting:\n" +
  "Beautiful studio-quality lighting.\n" +
  "Soft global illumination.\n" +
  "Subtle rim lighting.\n" +
  "Gentle highlights on fur.\n" +
  "Strong three-dimensional volume.\n" +
  "Depth and form clearly visible.\n" +
  "Clean professional shadows.\n\n" +
  "Rendering:\n" +
  "Semi-realistic 3D anime rendering.\n" +
  "Clean bold outlines.\n" +
  "Variable line weight.\n" +
  "Crisp silhouette.\n" +
  "Professional illustration quality.\n" +
  "Highly polished finish.\n\n" +
  "Pose:\n" +
  "Full body visible from head to tail tip.\n" +
  "Character height must be approximately 55% of the total image height. Leave significant empty space above the head and below the paws.\n" +
  "The character must appear small and compact within the frame — NOT filling the entire image.\n" +
  "Natural balanced standing pose.\n" +
  "Body turned approximately 30 degrees left.\n" +
  "Head slightly turned left.\n" +
  "Tail visible.\n" +
  "Natural posture.\n\n" +
  "Expression:\n" +
  "Friendly.\n" +
  "Warm.\n" +
  "Lovable.\n" +
  "Slight natural smile.\n" +
  "Bright attentive eyes.\n\n" +
  "Background:\n" +
  "Completely transparent background. No background color. No ground shadow. No cast shadow. No drop shadow anywhere.\n" +
  "The animal must appear to float with fully transparent surroundings.\n" +
  "Do not add any background color, gradient, or vignette.\n\n" +
  "The final result should feel like an official game mascot based on the real pet, combining accurate resemblance, strong character appeal, vibrant colors, and premium professional artwork quality.";

const PET_EMOTIONS: Record<string, string> = {
  happy:
    "Same animal character with the exact same design and left-facing pose. " +
    "Big smile with eyes curved happily, tail raised up cheerfully. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
  sad:
    "Same animal character with the exact same design and left-facing pose. " +
    "Teary eyes, ears drooping down, shoulders slumped in sadness. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
  think:
    "Same animal character with the exact same design and left-facing pose. " +
    "Head tilted to one side, eyes looking upward thoughtfully, one paw raised to chin. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
  excited:
    "Same animal character with the exact same design and left-facing pose. " +
    "Eyes sparkling wide open with excitement, mouth open joyfully, body leaning forward energetically, tail wagging. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
};

const USER_IDLE =
  "Analyze the reference image carefully. " +
  "Ignore the background completely. Use only the person as reference. Do not copy scenery, objects, or environmental details. " +
  "Identify and preserve: gender presentation, facial structure, eye shape, hairstyle, hair texture, clothing, accessories, personality impression, emotional atmosphere. " +
  "Preserve identity first. Anime stylization second. The result must look like the same person in anime form. " +
  "Create a premium modern anime character illustration based on the person. " +
  "STYLE: " +
  "Modern elegant anime illustration. " +
  "Premium Japanese anime aesthetic. " +
  "Stylized modern anime character design. " +
  "Soft painterly anime rendering. " +
  "Clean refined anime lineart. " +
  "Elegant simplified shading. " +
  "High-end visual novel CG quality. " +
  "Premium mobile game character illustration quality. " +
  "Balanced between anime stylization and realism. " +
  "Clearly stylized, not photorealistic. " +
  "Tasteful anime simplification. " +
  "Elegant fashionable anime character aesthetic. " +
  "Refined modern gacha-style illustration feel. " +
  "Stylish and sophisticated anime beauty atmosphere. " +
  "VISUAL STYLE: " +
  "Soft elegant appearance. " +
  "Refined stylish balance. " +
  "Premium polished anime rendering. " +
  "Lightweight but sophisticated visual feeling. " +
  "Emotionally warm but slightly cool atmosphere. " +
  "Subtle fashionable elegance. " +
  "Gentle luminous atmosphere. " +
  "Avoid excessive softness or childish cuteness. " +
  "Avoid excessive detail density. " +
  "Avoid realistic rendering complexity. " +
  "Stylized premium anime beauty aesthetic. " +
  "CHARACTER DESIGN: " +
  "Preserve the recognizable identity and atmosphere of the reference person. " +
  "Anime-style reinterpretation of the real person. " +
  "Natural anime facial proportions. " +
  "Slightly mature anime beauty balance. " +
  "Elegant modern heroine atmosphere. " +
  "Calm intelligent expression. " +
  "Subtle cool elegance. " +
  "Gentle emotional warmth. " +
  "Less childish. " +
  "Less cute. " +
  "Less dramatic. " +
  "Less realistic. " +
  "Stylish modern anime character balance. " +
  "Sophisticated fashionable impression. " +
  "FACE: " +
  "Elegant anime face design. " +
  "Slightly mature facial proportions. " +
  "Slightly longer mid-face balance. " +
  "Refined slim jawline. " +
  "Less rounded cheeks. " +
  "Balanced facial structure. " +
  "Elegant almond-shaped anime eyes. " +
  "Eyes moderately sized, not oversized. " +
  "Refined eyelashes. " +
  "Small delicate nose with subtle nose bridge shadow. " +
  "Soft natural lips with gentle lip line depth. " +
  "Subtle closed-mouth smile. " +
  "Healthy vivid luminous complexion. " +
  "Warm rosy peach skin tones with clearly visible pink undertones. " +
  "Strong healthy blood circulation feel — noticeably rosy and warm. " +
  "Vivid rosy blush on cheeks, clearly visible and warm. " +
  "Soft pink flush on nose bridge and cheek apples. " +
  "Warm peachy-pink glow across the face. " +
  "Skin looks flushed, warm, and full of life. " +
  "Translucent anime skin rendering with warm rosy depth. " +
  "Clear facial shading that defines cheekbones and eye sockets. " +
  "Bright elegant facial balance with visible light-shadow contrast. " +
  "Avoid pale or desaturated skin. " +
  "Avoid cold or grey skin tones. " +
  "Avoid realistic skin texture. " +
  "Avoid pores or photographic skin detail. " +
  "Avoid overly youthful or childlike face proportions. " +
  "Avoid flat uniform facial lighting. " +
  "EYES: " +
  "Elegant almond-shaped anime eyes. " +
  "Warm slightly glossy eyes. " +
  "Soft catchlights. " +
  "Refined gentle gaze. " +
  "Slightly relaxed eyelids. " +
  "Sophisticated anime eye balance. " +
  "Bright but calm eye atmosphere. " +
  "Not overly round. " +
  "Not overly large. " +
  "Not childish. " +
  "HAIR: " +
  "Richly shaded anime hair with strong three-dimensional volume. " +
  "Bright specular highlight streak along the top of the hair crown. " +
  "Secondary softer highlight on hair mid-section. " +
  "Deep shadow areas between hair layers and underneath hair mass. " +
  "Clear contrast between lit surface and shadow underside of hair. " +
  "Anime-style rim lighting along hair silhouette edge. " +
  "Smooth flowing silhouette with distinct layer separation. " +
  "Elegant controlled hair flow with visible depth. " +
  "Healthy smooth hair texture with glossy sheen. " +
  "Rich dark shadow at the roots and beneath the outer hair layer. " +
  "Luminous highlight band across the top catching the light. " +
  "Soft gradient from highlight to midtone to deep shadow within each hair section. " +
  "Premium anime hair rendering — NOT flat, NOT uniform color. " +
  "Slightly heavier elegant hair mass. " +
  "Avoid flat uniform hair coloring. " +
  "Avoid hyper-detailed individual strands. " +
  "Hair should feel glossy, voluminous, and richly shaded. " +
  "POSE & COMPOSITION: " +
  "Ignore the body direction and pose of the reference photo. Draw the character in the following pose regardless of the photo: " +
  "Three-quarter view facing slightly to the right. Nose tip points toward the right edge. The character's left cheek is more visible to the viewer. The character's left shoulder is slightly closer to the viewer. " +
  "Show character from waist to top of head. " +
  "Waist and belt at the very bottom edge of the image. Head near the top. " +
  "Character fills the full image height from waist to head. " +
  "Do NOT crop at chest or shoulders. " +
  "Balanced modern composition. " +
  "Character centered naturally. " +
  "Relaxed elegant posture. " +
  "Stylish composition balance. " +
  "Natural visual flow. " +
  "LIGHTING: " +
  "Soft directional lighting from upper-left. " +
  "Clear light and shadow separation. " +
  "Gentle warm facial illumination with visible depth. " +
  "Elegant ambient lighting with defined shadow areas. " +
  "Subtle glow around the hair. " +
  "Moderate contrast shading to create volume. " +
  "Soft luminous atmosphere. " +
  "Bright clean face balance with subtle cheek shadow. " +
  "Gentle soft bloom on lit areas. " +
  "No harsh shadows. " +
  "No dramatic realism. " +
  "No cinematic realism. " +
  "Elegant anime movie atmosphere with clear depth. " +
  "CLOTHING: " +
  "Preserve the clothing design from the reference image. " +
  "Simplify into clean anime fashion. Maintain recognizable colors and details. " +
  "Soft elegant fabric rendering. Avoid overly realistic fabric texture. " +
  "BACKGROUND: " +
  "Completely transparent background. No background color. No ground shadow. No cast shadow. " +
  "No gradients. No texture. No objects. " +
  "COLOR STYLE: " +
  "Elegant soft colors. " +
  "Natural healthy skin tones. " +
  "Warm luminous complexion. " +
  "Soft rosy skin balance. " +
  "Balanced beige and brown palette. " +
  "Soft balanced saturation. " +
  "No excessive orange tones. " +
  "No magenta reflections on the character. " +
  "Elegant anime color harmony. " +
  "Premium modern anime color grading. " +
  "RENDER STYLE: " +
  "Modern stylish anime illustration. " +
  "Premium anime mobile game character art. " +
  "Elegant visual novel artwork. " +
  "Refined anime portrait illustration. " +
  "Stylized anime rendering. " +
  "Soft painterly anime finish. " +
  "More anime-like than realistic. " +
  "Simple elegant detail balance. " +
  "High-end polished anime artwork. " +
  "Sophisticated anime heroine aesthetic. " +
  "Balanced between softness and stylish elegance. " +
  "NEGATIVE PROMPT: " +
  "photorealistic, hyperrealistic, realistic skin texture, pores, realistic photography, live-action look, excessive realism, cinematic realism, overly detailed face, realistic lighting, doll face, plastic skin, oily skin, harsh shadows, sharp contrast, thick outlines, western cartoon, chibi, childish face, baby face, overly round face, oversized anime eyes, giant eyes, cute mascot style, generic anime, cheap anime style, noisy image, stiff pose, hyper-detailed hair strands, fluffy childish hair, realistic fabric texture, over-rendered image, heavy detail density, 3D CGI realism, oversaturated colors, orange skin, magenta lighting, gradient background, low quality, low detail, harsh facial shadows, realistic pores, ultra detailed skin, messy hair silhouette, flat eyes, dead eyes, expressionless face, exaggerated cuteness, immature facial proportions, flat shading, flat lighting, no shading, uniform lighting, shadowless, washed out, overexposed, two-dimensional appearance, pale skin, grey skin, cold skin, desaturated face, sickly appearance, cropped at chest, cropped at shoulders, half body.";

const USER_IDLE_MALE =
  "Analyze the reference image carefully. " +
  "Ignore the background completely. Use only the person as reference. Do not copy scenery, objects, or environmental details. " +
  "FACE STUDY — before drawing, read and memorize these specific features from the reference photo: " +
  "(1) eye shape — single or double eyelid, size relative to face, spacing between the eyes. " +
  "(2) nose — bridge height (high or low), tip shape (narrow or wider). " +
  "(3) jaw line and chin — is the jaw soft and rounded, or angular and defined? " +
  "(4) skin tone and overall impression. " +
  "Convert these features faithfully into anime style. " +
  "Face shape should use natural balanced anime proportions — not elongated, not too long. Keep the face compact and balanced. " +
  "Preserve identity first. Anime stylization second. The result must look like the same person in anime form. " +
  "Create a premium modern anime MALE character illustration based on the person. " +
  "STYLE: " +
  "Modern elegant anime illustration. " +
  "Premium Japanese anime aesthetic. " +
  "Stylized modern anime character design. " +
  "Soft painterly anime rendering. " +
  "Clean refined anime lineart. " +
  "Clear rich shading with distinct shadow volumes like high-end visual novel art. " +
  "High-end visual novel CG quality. " +
  "Premium mobile game character illustration quality. " +
  "Balanced between anime stylization and realism. " +
  "Clearly stylized, not photorealistic. " +
  "Tasteful anime simplification. " +
  "Elegant fashionable anime character aesthetic. " +
  "Refined modern anime character art feel. " +
  "Stylish and sophisticated anime atmosphere. " +
  "VISUAL STYLE: " +
  "Soft elegant appearance. " +
  "Refined stylish balance. " +
  "Premium polished anime rendering. " +
  "Rich sophisticated visual feeling with strong shadow depth. " +
  "Emotionally warm atmosphere. " +
  "Subtle fashionable elegance. " +
  "Gentle luminous atmosphere. " +
  "Avoid excessive detail density. " +
  "Avoid realistic rendering complexity. " +
  "Stylized premium anime aesthetic. " +
  "CHARACTER DESIGN: " +
  "Preserve the recognizable identity and atmosphere of the reference person. " +
  "Anime-style reinterpretation of the real person. " +
  "Facial proportions taken directly from the reference photo — do NOT use generic anime facial proportions. " +
  "Slightly mature anime character balance. " +
  "Sophisticated modern male character atmosphere. " +
  "Calm intelligent expression. Very gentle soft smile. Kind and peaceful gaze. Warm approachable demeanor. " +
  "Subtle cool elegance. Gentle emotional warmth. " +
  "Less childish. Less dramatic. Less realistic. " +
  "Stylish modern anime character balance. " +
  "Sophisticated impression. " +
  "Preserve the appearance and features of the person from the reference photo. " +
  "FACE: " +
  "Convert the reference person's face into anime style — preserve their specific face shape, eye shape, nose, and jaw. " +
  "Facial structure faithfully reflecting the reference person — not a generic anime face. " +
  "Nose bridge height and tip shape from reference photo. " +
  "Jaw line and chin shape from reference photo. " +
  "Soft natural lips. " +
  "Very gentle closed-mouth smile. Kind serene expression. " +
  "Healthy vivid luminous complexion. " +
  "Warm golden-peach skin tones with clearly visible warm undertones. " +
  "Strong healthy blood circulation feel — noticeably warm and vivid. " +
  "Subtle warm flush on cheeks, clearly visible and warm. " +
  "Soft warm tone on nose bridge and cheekbones. " +
  "Warm healthy glow across the entire face. " +
  "Skin looks flushed, warm, and full of life. " +
  "Soft smooth skin rendering with gentle shadow gradients — skin feels warm and alive, not flat or plastic. " +
  "Translucent anime skin with warm luminous glow on the lit side. " +
  "Clear facial shading that defines cheekbones and eye sockets. " +
  "Visible soft shadow in the hollow beneath the cheekbones — this shadow must be clearly rendered. " +
  "Visible soft shadow in the eye socket above the eyelid. " +
  "Gentle shadow beneath the jaw line and along the chin. " +
  "Slight shadow along the side of the nose bridge. " +
  "Clear light-shadow contrast across the face — the face must have visible depth, not flat. " +
  "Avoid pale or desaturated skin. " +
  "Avoid cold or grey skin tones. " +
  "Avoid realistic skin texture. " +
  "Avoid flat uniform facial lighting. " +
  "Avoid expressionless stiff face. " +
  "No feminine makeup. " +
  "EYES: " +
  "Natural balanced anime male eyes — neither dramatically droopy nor dramatically upturned. " +
  "Warm slightly glossy eyes. " +
  "Multiple prominent catchlights — one large bright catchlight in upper iris, one smaller secondary catchlight. " +
  "Deep rich iris color with clear radial gradient: dark rim around the iris edge, lighter toward the center, dark pupil. " +
  "Eye has strong luminous depth — the iris must not look flat or uniform. " +
  "Kind gentle gaze. " +
  "Slightly relaxed eyelids. " +
  "Not overly round. Not overly large. Not feminine. " +
  "HAIR: " +
  "Preserve hairstyle and hair color from the reference image. " +
  "Richly shaded anime hair with strong three-dimensional volume. " +
  "Bright specular highlight streak along the top of the hair crown. " +
  "Secondary softer highlight on hair mid-section. " +
  "Deep rich black shadow areas between hair layers and underneath hair mass — shadows should be noticeably dark to contrast with bright highlights. " +
  "Clear contrast between lit surface and shadow underside of hair. " +
  "Anime-style rim lighting along hair silhouette edge. " +
  "Smooth controlled silhouette with distinct layer separation. " +
  "Elegant controlled hair flow with visible depth. " +
  "Healthy smooth hair texture with glossy sheen. " +
  "Luminous highlight band across the top catching the light. " +
  "Premium anime hair rendering — NOT flat, NOT uniform color. " +
  "Avoid flat uniform hair coloring. Avoid hyper-detailed individual strands. Avoid spiky anime hair. " +
  "Hair should feel glossy, voluminous, and richly shaded. " +
  "POSE & COMPOSITION: " +
  "Ignore the body direction and pose of the reference photo. Draw the character in the following pose regardless of the photo: " +
  "Three-quarter view facing slightly to the right. Nose tip points toward the right edge. The character's left cheek is more visible to the viewer. " +
  "Show character from waist to top of head. Character fills the full image height from waist to head. " +
  "Do NOT crop at chest or shoulders. " +
  "Balanced modern composition. Character centered naturally. " +
  "Relaxed elegant posture. Natural visual flow. " +
  "LIGHTING: " +
  "This is a fresh anime illustration — disregard the reference photo lighting entirely and paint new lighting from scratch. " +
  "Directional light source from upper-left. " +
  "FACE: strong shadow on the right side of the face, deep shadow in eye sockets, clear hollow under cheekbones, shadow under jaw. " +
  "HAIR: strong bright highlight streak across the hair crown, dark shadow areas underneath and between hair layers. " +
  "The illustration must look fully three-dimensional — like premium visual novel character art with clear light and shadow. " +
  "Soft anime shadow edges — not hard cel-shading, but clearly visible depth. " +
  "No flat lighting. No uniform lighting. No photorealistic shadows. " +
  "CLOTHING: " +
  "Preserve the clothing design and EXACT COLORS from the reference image. " +
  "Read the coat color directly from the reference photo and reproduce it faithfully — do NOT change it based on style conventions. White coat stays white. " +
  "If wearing a long coat, render as a long coat — not a jacket. Preserve the full length and silhouette. " +
  "Simplify into clean anime fashion. Maintain recognizable colors and details. Preserve scarf and accessories. " +
  "Soft elegant fabric rendering. Avoid overly realistic fabric texture. " +
  "Clear fabric fold shadows and highlights to convey clothing depth. Visible fabric volume and draping. " +
  "BACKGROUND: " +
  "Completely transparent background. No background color. No ground shadow. No cast shadow. " +
  "No gradients. No texture. No objects. " +
  "COLOR STYLE: " +
  "Elegant soft colors. Natural healthy skin tones. Warm luminous complexion. " +
  "Soft warm skin balance. Balanced warm palette. Soft balanced saturation. " +
  "No excessive orange tones. No magenta reflections on the character. " +
  "Elegant anime color harmony. Premium modern anime color grading. " +
  "RENDER STYLE: " +
  "Modern stylish anime illustration. " +
  "Premium anime mobile game character art. " +
  "Elegant visual novel artwork. " +
  "Refined anime portrait illustration. " +
  "Stylized anime rendering. Soft painterly anime finish. " +
  "More anime-like than realistic. Simple elegant detail balance. " +
  "High-end polished anime artwork. " +
  "Sophisticated anime male character aesthetic. " +
  "Balanced between softness and stylish elegance. " +
  "NEGATIVE PROMPT: " +
  "photorealistic, hyperrealistic, realistic skin texture, pores, realistic photography, live-action look, excessive realism, cinematic realism, overly detailed face, realistic lighting, doll face, plastic skin, oily skin, harsh shadows, sharp contrast, thick outlines, western cartoon, chibi, childish face, baby face, overly round face, oversized anime eyes, giant eyes, cute mascot style, generic anime, cheap anime style, noisy image, stiff pose, hyper-detailed hair strands, spiky anime hair, fluffy childish hair, realistic fabric texture, over-rendered image, heavy detail density, 3D CGI realism, oversaturated colors, orange skin, magenta lighting, gradient background, low quality, low detail, harsh facial shadows, flat eyes, dead eyes, expressionless face, flat shading, flat lighting, no shading, uniform lighting, shadowless, washed out, pale skin, grey skin, cold skin, desaturated face, sickly appearance, cropped at chest, cropped at shoulders, half body, generic anime face, stiff expressionless face, flat facial shading, flat coat, flat clothing, flat fabric shading, flat scarf, uniform scarf color, invisible cheekbone shadow, missing facial shadow volumes, flat facial lighting, insufficient facial shadow.";

const USER_EMOTIONS: Record<string, string> = {
  happy:
    "Same anime character illustration, exact same art style, exact same design and clothing, upper body turned slightly right. " +
    "Expression changed to: big warm smile, eyes curved happily. Arms relaxed. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
  sad:
    "Same anime character illustration, exact same art style, exact same design and clothing, upper body turned slightly right. " +
    "Expression changed to: slightly downcast eyes, eyebrows gently furrowed, looking discouraged, mouth closed. Arms relaxed. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
  think:
    "Same anime character illustration, exact same art style, exact same design and clothing, upper body turned slightly right. " +
    "Expression changed to: head tilted slightly, eyes looking upward thoughtfully, one hand raised to chin. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
  excited:
    "Same anime character illustration, exact same art style, exact same design and clothing, upper body turned slightly right. " +
    "Expression changed to: eyes wide open and sparkling, big joyful open smile, eyebrows raised with excitement. Arms relaxed. " +
    "Transparent background. No background color, no ground shadow, no drop shadow.",
};

function buildUserIdlePrompt(gender: string, ageGroup: string): string {
  const isMale = gender === "male";

  const ageDesc = AGE_DESCRIPTIONS[ageGroup] ?? "a young adult";

  const poseInstruction =
    `TWO REFERENCE IMAGES ARE PROVIDED: a large main image and a small thumbnail in the bottom-right corner. ` +
    `LARGE MAIN IMAGE: The real person. Use this as the primary reference for everything — face, features, hair, and clothing. ` +
    `SMALL THUMBNAIL (bottom-right): An anime character. Use this for POSE AND BODY DIRECTION ONLY — replicate the three-quarter view facing right. Do NOT copy any clothing, face, or appearance from the thumbnail. ` +
    `The final character must wear the clothing from the LARGE IMAGE only. `;

  if (isMale) {
    return (
      poseInstruction +
      `The person in the left photo is a male, appearing to be ${ageDesc}. ` +
      `Identity preservation is the primary objective. ` +
      USER_IDLE_MALE
    );
  } else {
    return (
      poseInstruction +
      `The person in the left photo is a FEMALE, appearing to be ${ageDesc}. ` +
      USER_IDLE
    );
  }
}

function buildPetIdlePrompt(): string {
  return (
    `TWO REFERENCE IMAGES ARE PROVIDED: a large main image and a small thumbnail in the bottom-right corner. ` +
    `LARGE MAIN IMAGE: The real pet animal. This is the ONLY source for coat color, markings, fur pattern, eye color, face structure, and all visual identity. ` +
    `SMALL THUMBNAIL (bottom-right): An anime pet character used for POSE AND BODY DIRECTION ONLY. ` +
    `CRITICAL — The thumbnail character has orange/brown coloring. This color MUST BE COMPLETELY IGNORED. ` +
    `Do NOT blend, mix, or borrow any color, marking, or fur pattern from the thumbnail. ` +
    `If the animal in the large image is white, generate a white character. If it has grey patches, preserve the grey patches. ` +
    `The final character's coat color and markings must match the LARGE IMAGE exactly, not the thumbnail. ` +
    PET_IDLE
  );
}

async function analyzePerson(openai: OpenAI, imageBase64: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        { type: "text", text:
          "Analyze this person's appearance for creating an anime character. " +
          "Describe specifically: hair color and exact style, face shape, skin tone, eye color and shape, " +
          "clothing type and exact colors (e.g. 'long beige outer coat' not 'coat'), accessories with colors, " +
          "overall personality vibe. Be concise but specific. Ignore the background entirely."
        }
      ]
    }],
    max_tokens: 300,
  });
  return res.choices[0]?.message.content ?? "";
}

function buildMaleTextPrompt(personDescription: string, ageDesc: string): string {
  return (
    `Create a premium modern anime MALE character illustration. The character appears to be ${ageDesc}. ` +
    `Character appearance: ${personDescription} ` +
    `STYLE: Modern elegant anime illustration. Premium Japanese anime aesthetic. ` +
    `High-end visual novel CG quality. Premium mobile game character illustration quality. ` +
    `Soft painterly anime rendering. Clean refined anime lineart. Elegant simplified shading. ` +
    `Balanced between anime stylization and realism. Clearly stylized, not photorealistic. ` +
    `Elegant fashionable anime character aesthetic. Refined modern anime character art. ` +
    `VISUAL STYLE: Soft elegant appearance. Premium polished anime rendering. ` +
    `Lightweight but sophisticated visual feeling. Emotionally warm atmosphere. Gentle luminous atmosphere. ` +
    `CHARACTER: Sophisticated cool male character. Calm intelligent expression. ` +
    `Very gentle soft smile. Kind warm gaze. Slightly mature anime character balance. ` +
    `Refined masculine appearance. Warm approachable demeanor. Subtle cool elegance. ` +
    `FACE: Elegant anime face. Natural anime facial proportions. Natural balanced facial structure. ` +
    `Healthy vivid luminous complexion. Warm peachy skin tones with natural warm blood circulation. ` +
    `Subtle warm flush on cheeks, clearly visible. Warm healthy glow across the face. ` +
    `Skin looks warm, healthy, and full of life. Translucent anime skin rendering with warm depth. ` +
    `Clear facial shading defining cheekbones and eye sockets. Light-shadow contrast creating depth and volume. ` +
    `Avoid flat face. Avoid pale or desaturated skin. Avoid cold or grey skin. ` +
    `EYES: Warm glossy anime male eyes. Bright soft catchlights. Kind gentle gaze. ` +
    `Moderately sized. Not oversized. Sophisticated anime eye balance. ` +
    `HAIR: Richly shaded anime hair with strong three-dimensional volume. ` +
    `Bright specular highlight streak along the top of the hair crown. ` +
    `Secondary softer highlight on hair mid-section. Deep shadow areas between hair layers. ` +
    `Glossy silky appearance. Luminous highlight band across the top. ` +
    `Premium anime hair rendering — NOT flat, NOT uniform color. ` +
    `POSE: Upper body portrait from waist to head. Do not crop at chest or shoulders. ` +
    `Character faces slightly to the right side. Three-quarter view facing right. ` +
    `Nose tip points toward the right edge. Relaxed natural posture. ` +
    `LIGHTING: Soft directional lighting from upper-left. Clear light and shadow separation. ` +
    `Gentle warm facial illumination with visible depth. Subtle glow around the hair. ` +
    `Moderate contrast shading to create volume. Soft luminous atmosphere. Bright clean face. ` +
    `No harsh shadows. No flat lighting. No uniform shadowless face. ` +
    `BACKGROUND: Completely transparent background. No background color. No ground shadow. No cast shadow. No gradients. No objects. ` +
    `COLOR: Natural healthy warm skin tones. Warm balanced palette. Elegant anime color harmony. ` +
    `No excessive orange tones. ` +
    `RENDER: Premium anime mobile game character art. Elegant visual novel artwork. ` +
    `High-end polished anime artwork. Sophisticated anime male character aesthetic. ` +
    `Balanced between softness and stylish elegance. ` +
    `NEGATIVE: photorealistic, hyperrealistic, realistic skin texture, pores, realistic photography, ` +
    `flat face, expressionless, stiff pose, pale skin, grey skin, cold skin, desaturated face, ` +
    `flat lighting, shadowless, uniform lighting, no shading, ` +
    `feminine face, female character, girl, heroine, feminine makeup, bishounen, ` +
    `oversized anime eyes, chibi, western cartoon, low quality, low detail, ` +
    `gradient background, half body, cropped at chest, cropped at shoulders.`
  );
}

async function generateFromText(
  openai: OpenAI,
  prompt: string,
  size: "1024x1024" | "1024x1536" = "1024x1024"
): Promise<string> {
  const res = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size,
    quality: "high",
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image in response");
  return b64;
}

async function generateEdit(
  openai: OpenAI,
  imageBuffer: Buffer,
  prompt: string,
  mediaType: string,
  size: "1024x1024" | "1024x1536" = "1024x1024",
  quality: "low" | "medium" | "high" = "medium",
  background: "transparent" | "opaque" = "opaque"
): Promise<string> {
  const file = await toFile(imageBuffer, "image.png", { type: mediaType });
  const res = await openai.images.edit({
    model: "gpt-image-1",
    image: file,
    prompt,
    n: 1,
    size,
    quality,
    background,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image in response");
  return b64;
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-pet-images] unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  const { imageBase64, mediaType, role, gender, ageGroup, mode, idleRefBase64, emotion } = await req.json();

  const secret = process.env.API_SECRET;
  if (secret) {
    const clientSecret = req.headers.get("x-api-secret");
    if (clientSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });
  const W = 1024, H = 1500;
  const scaledW = Math.round(W * 0.8);
  const scaledH = Math.round(H * 0.8);
  const padX = Math.round((W - scaledW) / 2);
  const bottomPad = 10;
  const topPad = H - scaledH - bottomPad;

  async function processEmotion(b64: string): Promise<string> {
    const raw = Buffer.from(b64, "base64");
    const extracted = await sharp(raw)
      .extract({ left: 0, top: 0, width: W, height: H })
      .ensureAlpha()
      .png()
      .toBuffer();
    const sw = Math.round(W * 0.8), sh = Math.round(H * 0.8);
    const px = Math.round((W - sw) / 2);
    return (await sharp(extracted)
      .resize(sw, sh, { fit: "fill" })
      .extend({
        top: topPad,
        bottom: bottomPad,
        left: px,
        right: W - sw - px,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()).toString("base64");
  }

  // mode: "idle" (default) or "emotions" — どちらも imageBase64 から inputBuffer を再合成
  const photoBuffer = Buffer.from(imageBase64, "base64");

  let inputBuffer: Buffer;
  if (role === "user") {
    const isMale = gender === "male";
    const poseRefPath = path.join(process.cwd(), "public", isMale ? "user2-idle.png" : "user-idle.png");
    const poseRefBuffer = fs.readFileSync(poseRefPath);

    const scaledUser = await sharp(photoBuffer)
      .rotate()
      .resize(700, 700, { fit: "inside" })
      .toBuffer();
    const { width: uW, height: uH } = await sharp(scaledUser).metadata();
    const uLeft = Math.floor((1024 - uW!) / 2);
    const uTop = Math.floor((1024 - uH!) / 2);

    const poseMetadata = await sharp(poseRefBuffer).metadata();
    const headCropHeight = Math.floor(poseMetadata.height! * 0.5);
    const scaledPose = await sharp(poseRefBuffer)
      .extract({ left: 0, top: 0, width: poseMetadata.width!, height: headCropHeight })
      .resize(220, 220, { fit: "inside" })
      .toBuffer();
    const { width: pW, height: pH } = await sharp(scaledPose).metadata();

    inputBuffer = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: { r: 255, g: 0, b: 255 } },
    })
      .composite([
        { input: scaledUser, left: uLeft, top: uTop },
        { input: scaledPose, left: 1024 - pW! - 8, top: 1024 - pH! - 8 },
      ])
      .png()
      .toBuffer();
  } else {
    const poseRefPath = path.join(process.cwd(), "public", "pet-idle.png");
    const poseRefBuffer = fs.readFileSync(poseRefPath);

    const scaledPet = await sharp(photoBuffer)
      .rotate()
      .resize(700, 700, { fit: "inside" })
      .toBuffer();
    const { width: petW, height: petH } = await sharp(scaledPet).metadata();
    const petLeft = Math.floor((1024 - petW!) / 2);
    const petTop = Math.floor((1024 - petH!) / 2);

    const poseMetadata = await sharp(poseRefBuffer).metadata();
    const headCropHeight = Math.floor(poseMetadata.height! * 0.5);
    const scaledPose = await sharp(poseRefBuffer)
      .extract({ left: 0, top: 0, width: poseMetadata.width!, height: headCropHeight })
      .resize(220, 220, { fit: "inside" })
      .toBuffer();
    const { width: pW, height: pH } = await sharp(scaledPose).metadata();

    inputBuffer = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: { r: 255, g: 0, b: 255 } },
    })
      .composite([
        { input: scaledPet, left: petLeft, top: petTop },
        { input: scaledPose, left: 1024 - pW! - 8, top: 1024 - pH! - 8 },
      ])
      .png()
      .toBuffer();
  }

  // mode: "emotion" — idleRefBase64 を参照して1感情のみ生成
  if (mode === "emotion") {
    const refBuffer = idleRefBase64
      ? Buffer.from(idleRefBase64, "base64")
      : await (async () => {
          const pb = Buffer.from(imageBase64, "base64");
          return sharp(pb).rotate().resize(700, 700, { fit: "inside" }).png().toBuffer();
        })();
    const emotionPrompts = role === "user" ? USER_EMOTIONS : PET_EMOTIONS;
    const prompt = emotionPrompts[emotion] ?? emotionPrompts["happy"];
    const b64 = await generateEdit(
      openai, refBuffer, prompt, "image/png", "1024x1536", "medium", "transparent"
    );
    const processed = await processEmotion(b64);
    return NextResponse.json({
      emotion,
      image: processed,
      mimeType: "image/png",
    });
  }

  // mode: "idle" — idle画像を生成
  let idleB64: string;
  if (role === "user" && gender === "male" && MALE_TWO_STEP) {
    const ageDesc = AGE_DESCRIPTIONS[ageGroup ?? "young_adult"] ?? "a young adult";
    const personDesc = await analyzePerson(openai, imageBase64);
    const textPrompt = buildMaleTextPrompt(personDesc, ageDesc);
    idleB64 = await generateFromText(openai, textPrompt, "1024x1536");
  } else {
    const idlePrompt =
      role === "user"
        ? (gender && ageGroup ? buildUserIdlePrompt(gender, ageGroup) : USER_IDLE)
        : buildPetIdlePrompt();
    idleB64 = await generateEdit(
      openai, inputBuffer, idlePrompt, "image/png", "1024x1536", "high", "transparent"
    );
  }

  const rawBuffer = Buffer.from(idleB64, "base64");
  const processedBuffer = await sharp(rawBuffer)
    .extract({ left: 0, top: 0, width: W, height: H })
    .ensureAlpha()
    .png()
    .toBuffer();

  const finalBuffer = await sharp(processedBuffer)
    .resize(scaledW, scaledH, { fit: "fill" })
    .extend({
      top: topPad,
      bottom: bottomPad,
      left: padX,
      right: W - scaledW - padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // idleRef: 150×225に極小化してCapacitor転送サイズを最小化（~30-50KB）
  const idleRefBuffer = await sharp(processedBuffer)
    .resize(150, 225, { fit: "fill" })
    .png()
    .toBuffer();

  return NextResponse.json({
    images: { idle: finalBuffer.toString("base64") },
    idleRef: idleRefBuffer.toString("base64"),
    mimeType: "image/png",
  });
}
