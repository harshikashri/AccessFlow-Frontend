import { useQuery } from '@tanstack/react-query';
import { auditLogQueryKeys } from './audit-log-query-keys';
import { auditLogService } from '../services/audit-log.service';
import type { AuditListParams } from '../types/audit-log.types';

export const useAuditLogs = (params: AuditListParams, enabled: boolean) =>
  useQuery({
    queryKey: auditLogQueryKeys.list(params),
    queryFn: ({ signal }) => auditLogService.list(params, signal),
    enabled,
    staleTime: 15_000,
  });

export const usePlatformAuditLogs = (params: AuditListParams, enabled: boolean) =>
  useQuery({
    queryKey: auditLogQueryKeys.platformList(params),
    queryFn: ({ signal }) => auditLogService.listPlatform(params, signal),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useAuditLog = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: auditLogQueryKeys.detail(id),
    queryFn: () => auditLogService.get(id),
    enabled: enabled && Boolean(id),
  });

export const useAuditStatistics = (enabled: boolean) =>
  useQuery({
    queryKey: auditLogQueryKeys.statistics(),
    queryFn: auditLogService.statistics,
    enabled,
    staleTime: 30_000,
  });
