import { env } from '@/config/env';

export const appConfig = Object.freeze({
  name: 'FuzioNest',
  apiBaseUrl: env.apiBaseUrl,
});
