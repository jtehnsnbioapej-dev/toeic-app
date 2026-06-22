import { registerPlugin, Capacitor } from '@capacitor/core';

interface IAPPlugin {
  isPremium(): Promise<{ value: boolean }>;
  purchasePremium(): Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  restorePurchases(): Promise<{ success: boolean }>;
  getTicketCount(): Promise<{ count: number }>;
  purchaseTickets(options: { productId: string }): Promise<{ success: boolean; cancelled?: boolean; tickets?: number; error?: string }>;
  consumeTicket(): Promise<{ success: boolean; remaining: number }>;
}

const IAP = registerPlugin<IAPPlugin>('IAP');

// App Store Connect で登録する製品 ID
export const PRODUCT_PREMIUM = 'com.toeicapp.app.premium';  // ¥980（リリース記念）→ ¥1,480（通常）
export const PRODUCT_CHARGEN = 'com.toeicapp.app.chargen';  // ¥200 / 1回

export async function checkPremium(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { value } = await IAP.isPremium();
    return value;
  } catch {
    return false;
  }
}

export async function purchasePremium(): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) return { success: false };
  try {
    return await IAP.purchasePremium();
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { success } = await IAP.restorePurchases();
    return success;
  } catch {
    return false;
  }
}

export async function getTicketCount(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  try {
    const { count } = await IAP.getTicketCount();
    return count;
  } catch {
    return 0;
  }
}

// productId: PRODUCT_CHARGEN のみ（¥200 = 1枚）
export async function purchaseTickets(productId: string): Promise<{ success: boolean; cancelled?: boolean; tickets?: number }> {
  if (!Capacitor.isNativePlatform()) return { success: false };
  try {
    return await IAP.purchaseTickets({ productId });
  } catch {
    return { success: false };
  }
}

export async function consumeTicket(): Promise<{ success: boolean; remaining: number }> {
  if (!Capacitor.isNativePlatform()) return { success: false, remaining: 0 };
  try {
    return await IAP.consumeTicket();
  } catch {
    return { success: false, remaining: 0 };
  }
}
