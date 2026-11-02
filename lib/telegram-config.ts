/**
 * Central configuration for Telegram integration across PureSim.
 *
 * Rules:
 * - TG_SUPPORT_URL: Direct personal 1-on-1 customer support chat.
 * - TG_CHANNEL_URL: Official broadcast channel ("PureSim Portal") for news and travel tips.
 * Never hardcode t.me URLs inside component strings or translation dictionaries.
 */

export const TG_SUPPORT_URL = 'https://t.me/autoacts';
export const TG_CHANNEL_URL = 'https://t.me/PureSim';
