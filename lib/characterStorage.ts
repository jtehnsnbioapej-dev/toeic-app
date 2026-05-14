import { PetImages, Emotion } from "@/components/PetSprite";

export type CharacterRole = "pet" | "user";

export type CharacterStock = {
  id: string;
  name: string;
  type?: string; // ペットのみ（猫・犬など）
  role: CharacterRole;
  images: Partial<PetImages>;
  isDefault: boolean;
  createdAt: string;
};

type CharacterStocks = {
  pets: CharacterStock[];
  users: CharacterStock[];
  activePetId: string;
  activeUserId: string;
};

const DEFAULT_PET_STOCK: CharacterStock = {
  id: "default-pet",
  name: "ひーちゃん",
  type: "猫",
  role: "pet",
  images: {
    idle: "/pet-idle.png",
    happy: "/pet-happy.png",
    sad: "/pet-sad.png",
    think: "/pet-think.png",
    excited: "/pet-excited.png",
  },
  isDefault: true,
  createdAt: "2026-01-01",
};

const DEFAULT_USER_STOCK: CharacterStock = {
  id: "default-user",
  name: "わたし",
  role: "user",
  images: {
    idle: "/user-idle.png",
    happy: "/user-happy.png",
    sad: "/user-sad.png",
    think: "/user-think.png",
    excited: "/user-excited.png",
  },
  isDefault: true,
  createdAt: "2026-01-01",
};


const DEFAULT_PET2_STOCK: CharacterStock = {
  id: "default-pet2",
  name: "あーちゃん",
  role: "pet",
  images: {
    idle: "/pet2-idle.png",
    happy: "/pet2-happy.png",
    sad: "/pet2-sad.png",
    think: "/pet2-think.png",
    excited: "/pet2-excited.png",
  },
  isDefault: true,
  createdAt: "2026-01-01",
};

const DEFAULT_USER2_STOCK: CharacterStock = {
  id: "default-user2",
  name: "わたし２",
  role: "user",
  images: {
    idle: "/user2-idle.png",
    happy: "/user2-happy.png",
    sad: "/user2-sad.png",
    think: "/user2-think.png",
    excited: "/user2-excited.png",
  },
  isDefault: true,
  createdAt: "2026-01-01",
};

const DEFAULT_USER_IMAGES: PetImages = {
  idle: "/user-idle.png",
  happy: "/user-happy.png",
  sad: "/user-sad.png",
  think: "/user-think.png",
  excited: "/user-excited.png",
};

const STOCKS_KEY = "toeic_char_stocks";

function makeDefaultStocks(): CharacterStocks {
  return {
    pets: [DEFAULT_PET_STOCK, DEFAULT_PET2_STOCK],
    users: [DEFAULT_USER_STOCK, DEFAULT_USER2_STOCK],
    activePetId: "default-pet2",
    activeUserId: "default-user2",
  };
}

export function getStocks(): CharacterStocks {
  if (typeof window === "undefined") return makeDefaultStocks();

  const raw = localStorage.getItem(STOCKS_KEY);
  if (raw) {
    try {
      const parsed: CharacterStocks = JSON.parse(raw);
      // デフォルトキャラが必ず存在するよう保証
      const syncDefault = <T extends { id: string; name: string }>(list: T[], def: T) => {
        const idx = list.findIndex((x) => x.id === def.id);
        if (idx === -1) { list.unshift(def); } else { list[idx].name = def.name; }
      };
      syncDefault(parsed.pets, DEFAULT_PET_STOCK);
      if (!parsed.pets.find((p) => p.id === "default-pet2")) {
        parsed.pets.splice(1, 0, DEFAULT_PET2_STOCK);
      } else {
        parsed.pets.find((p) => p.id === "default-pet2")!.name = DEFAULT_PET2_STOCK.name;
      }
      syncDefault(parsed.users, DEFAULT_USER_STOCK);
      if (!parsed.users.find((u) => u.id === "default-user2")) {
        parsed.users.splice(1, 0, DEFAULT_USER2_STOCK);
      } else {
        parsed.users.find((u) => u.id === "default-user2")!.name = DEFAULT_USER2_STOCK.name;
      }
      return parsed;
    } catch {
      // ignore parse error
    }
  }

  // 既存の petProfile があれば移行
  const legacyRaw = localStorage.getItem("petProfile");
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      const migratedPet: CharacterStock = {
        id: "migrated-pet-" + Date.now(),
        name: legacy.name ?? "マイペット",
        type: legacy.type,
        role: "pet",
        images: legacy.emotions ?? DEFAULT_PET_STOCK.images,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      const stocks: CharacterStocks = {
        pets: [DEFAULT_PET_STOCK, migratedPet],
        users: [DEFAULT_USER_STOCK],
        activePetId: migratedPet.id,
        activeUserId: "default-user",
      };
      saveStocks(stocks);
      return stocks;
    } catch {
      // ignore
    }
  }

  return makeDefaultStocks();
}

export function saveStocks(stocks: CharacterStocks): void {
  localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
}

export function getActivePetImages(): PetImages {
  const stocks = getStocks();
  const active = stocks.pets.find((p) => p.id === stocks.activePetId);
  return (active?.images as PetImages) ?? DEFAULT_PET_STOCK.images as PetImages;
}

export function getActiveUserImages(): PetImages {
  const stocks = getStocks();
  const active = stocks.users.find((u) => u.id === stocks.activeUserId);
  return (active?.images as PetImages) ?? DEFAULT_USER_IMAGES;
}

export function setActivePet(id: string): void {
  const stocks = getStocks();
  if (!stocks.pets.find((p) => p.id === id)) return;
  stocks.activePetId = id;
  saveStocks(stocks);
}

export function setActiveUser(id: string): void {
  const stocks = getStocks();
  if (!stocks.users.find((u) => u.id === id)) return;
  stocks.activeUserId = id;
  saveStocks(stocks);
}

export function addStock(stock: Omit<CharacterStock, "id" | "createdAt">): CharacterStock {
  const stocks = getStocks();
  const newStock: CharacterStock = {
    ...stock,
    id: `${stock.role}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  if (stock.role === "pet") {
    stocks.pets.push(newStock);
    stocks.activePetId = newStock.id;
  } else {
    stocks.users.push(newStock);
    stocks.activeUserId = newStock.id;
  }
  saveStocks(stocks);
  return newStock;
}

export function removeStock(id: string): void {
  const stocks = getStocks();
  const petIdx = stocks.pets.findIndex((p) => p.id === id);
  if (petIdx !== -1 && !stocks.pets[petIdx].isDefault) {
    stocks.pets.splice(petIdx, 1);
    if (stocks.activePetId === id) stocks.activePetId = "default-pet2";
  }
  const userIdx = stocks.users.findIndex((u) => u.id === id);
  if (userIdx !== -1 && !stocks.users[userIdx].isDefault) {
    stocks.users.splice(userIdx, 1);
    if (stocks.activeUserId === id) stocks.activeUserId = "default-user2";
  }
  saveStocks(stocks);
}

export { DEFAULT_USER_IMAGES };

// 全感情を補完: idleキーのみのストックに対して全感情でidleをフォールバック
export function resolveImages(images: Partial<PetImages>): PetImages {
  const emotions: Emotion[] = ["idle", "happy", "sad", "think", "excited"];
  const result: PetImages = {};
  for (const e of emotions) {
    result[e] = images[e] ?? images.idle;
  }
  return result;
}

export function renameStock(id: string, name: string): void {
  if (!name.trim()) return;
  const stocks = getStocks();
  const pet = stocks.pets.find((p) => p.id === id);
  if (pet) { pet.name = name.trim(); saveStocks(stocks); return; }
  const user = stocks.users.find((u) => u.id === id);
  if (user) { user.name = name.trim(); saveStocks(stocks); }
}

export function getActivePetName(): string {
  const stocks = getStocks();
  const active = stocks.pets.find((p) => p.id === stocks.activePetId);
  return active?.name ?? "ペット";
}
