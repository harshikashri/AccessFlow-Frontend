const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL must be set in the frontend environment.');
}

let apiBaseUrl: URL;

try {
  apiBaseUrl = new URL(configuredApiBaseUrl);
} catch {
  throw new Error('VITE_API_BASE_URL must be a valid absolute URL.');
}

if (!['http:', 'https:'].includes(apiBaseUrl.protocol)) {
  throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS.');
}

export const env = Object.freeze({
  apiBaseUrl: configuredApiBaseUrl.replace(/\/+$/, ''),
});
