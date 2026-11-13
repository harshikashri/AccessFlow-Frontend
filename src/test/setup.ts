import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5000/api');

afterEach(() => {
  cleanup();
});
