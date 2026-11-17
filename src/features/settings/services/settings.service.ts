import { apiClient } from '@/services/api/api-client';
import type { ApiEnvelope } from '@/features/auth/types/auth.types';
import type {
  NotificationPreferences,
  OrganizationSettings,
  Preferences,
  ProfileSettings,
  SessionInfo,
} from '../types/settings.types';

const get = async <T>(path: string) => {
  const response = await apiClient.get<ApiEnvelope<T>>(path);
  if (!response.data.success) throw new Error(response.data.message || 'Settings request failed.');
  return response.data.data;
};

const patch = async <T>(path: string, payload: unknown) => {
  const response = await apiClient.patch<ApiEnvelope<T>>(path, payload);
  if (!response.data.success) throw new Error(response.data.message || 'Settings update failed.');
  return response.data.data;
};

export const settingsService = {
  profile: () => get<ProfileSettings>('/settings/profile'),
  updateProfile: (payload: { name: string }) =>
    patch<ProfileSettings>('/settings/profile', payload),
  preferences: () => get<Preferences>('/settings/preferences'),
  updatePreferences: (payload: Partial<Preferences>) =>
    patch<Preferences>('/settings/preferences', payload),
  notifications: () => get<NotificationPreferences>('/settings/notifications'),
  updateNotifications: (payload: Partial<NotificationPreferences>) =>
    patch<NotificationPreferences>('/settings/notifications', payload),
  sessions: async () => (await get<{ items: SessionInfo[] }>('/settings/sessions')).items,
  revokeSession: (id: string) =>
    settingsService.post(`/settings/sessions/${encodeURIComponent(id)}/revoke`),
  organization: () => get<OrganizationSettings>('/settings/organization'),
  post: async (path: string, payload?: unknown) => {
    const response = await apiClient.post<ApiEnvelope<unknown>>(path, payload);
    if (!response.data.success)
      throw new Error(response.data.message || 'Settings request failed.');
    return response.data.data;
  },
};
