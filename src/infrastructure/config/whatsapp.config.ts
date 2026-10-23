export const WHATSAPP_CONFIG = {
  API_URL:'https://hub.telinfy.com/unified/developer/api/v1/whatsapp/campaigns/send',
  API_KEY: process.env.WHATSAPP_API_KEY,
  DEFAULT_LANGUAGE: 'en',
  REQUEST_TIMEOUT: 15000,
} as const;