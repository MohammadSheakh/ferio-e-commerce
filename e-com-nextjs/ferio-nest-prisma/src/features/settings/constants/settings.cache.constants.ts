export const SETTINGS_CACHE_CONFIG = {
  PREFIX: 'settings',
  TTL: 3600, // 1 hour
  INVALIDATION_PATTERNS: {
    SETTINGS_UPDATED: (type: string) => [`settings:${type}`, 'settings:all'],
  },
};

export const SETTINGS_RATE_LIMITS = {
  GET_SETTINGS: {
    windowMs: 60 * 1000,
    max: 100,
    keyPrefix: 'settings_get',
  },
  MANAGE_SETTINGS: {
    windowMs: 60 * 1000,
    max: 10,
    keyPrefix: 'settings_manage',
  },
} as const;
