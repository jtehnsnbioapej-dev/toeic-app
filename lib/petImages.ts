import { PetImages } from "@/components/PetSprite";
import { getActivePetImages } from "@/lib/characterStorage";

export const DEFAULT_PET_IMAGES: PetImages = {
  idle:    "/pet-idle.png",
  happy:   "/pet-happy.png",
  sad:     "/pet-sad.png",
  think:   "/pet-think.png",
  excited: "/pet-excited.png",
};

/** 現在選択中のペット画像を返す。なければデフォルトを使用。 */
export function getPetImages(): PetImages {
  if (typeof window === "undefined") return DEFAULT_PET_IMAGES;
  try {
    return getActivePetImages();
  } catch {
    return DEFAULT_PET_IMAGES;
  }
}
