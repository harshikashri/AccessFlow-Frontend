import axios from 'axios';
import { API_TIMEOUT_MS } from '@/constants/api.constants';
import { env } from '@/config/env';

export const axiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});
