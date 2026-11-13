import { env } from '@/config/env';

export const appConfig = Object.freeze({
  name: 'AccessFlow',
  apiBaseUrl: env.apiBaseUrl,
});
