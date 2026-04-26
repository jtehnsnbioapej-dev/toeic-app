import { PetImages } from "@/components/PetSprite";

export const DEFAULT_PET_IMAGES: PetImages = {
  idle:     "/pet-idle.png",
  happy:    "/pet-happy.png",
  sad:      "/pet-sad.png",
  think:    "/pet-think.png",
  surprise: "/pet-surprise.png",
};

/** localStorageのpetProfileに保存された画像を返す。なければDEFAULT_PET_IMAGESを使用。 */
export function getPetImages(): PetImages {
  if (typeof window === "undefined") return DEFAULT_PET_IMAGES;
  try {
    const raw = localStorage.getItem("petProfile");
    if (!raw) return DEFAULT_PET_IMAGES;
    const profile = JSON.parse(raw);
    const emotions = profile.emotions as PetImages | undefined;
    if (emotions && Object.keys(emotions).length > 0) return emotions;
  } catch {
    // ignore
  }
  return DEFAULT_PET_IMAGES;
}
