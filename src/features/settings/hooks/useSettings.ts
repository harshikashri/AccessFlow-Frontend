import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
  preferences: () => [...settingsKeys.all, 'preferences'] as const,
  notifications: () => [...settingsKeys.all, 'notifications'] as const,
  sessions: () => [...settingsKeys.all, 'sessions'] as const,
  organization: () => [...settingsKeys.all, 'organization'] as const,
};

export const useProfile = () =>
  useQuery({ queryKey: settingsKeys.profile(), queryFn: settingsService.profile });
export const usePreferences = () =>
  useQuery({ queryKey: settingsKeys.preferences(), queryFn: settingsService.preferences });
export const useNotifications = () =>
  useQuery({ queryKey: settingsKeys.notifications(), queryFn: settingsService.notifications });
export const useSessions = () =>
  useQuery({ queryKey: settingsKeys.sessions(), queryFn: settingsService.sessions });
export const useOrganizationSettings = () =>
  useQuery({ queryKey: settingsKeys.organization(), queryFn: settingsService.organization });

export const useUpdateProfile = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updateProfile,
    onSuccess: (data) => client.setQueryData(settingsKeys.profile(), data),
  });
};
export const useUpdatePreferences = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updatePreferences,
    onSuccess: (data) => client.setQueryData(settingsKeys.preferences(), data),
  });
};
export const useUpdateNotifications = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updateNotifications,
    onSuccess: (data) => client.setQueryData(settingsKeys.notifications(), data),
  });
};
export const useRevokeSession = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: settingsService.revokeSession,
    onSuccess: () => void client.invalidateQueries({ queryKey: settingsKeys.sessions() }),
  });
};
export const useChangePassword = () => useMutation({ mutationFn: settingsService.changePassword });
