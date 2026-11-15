export const auditLogQueryKeys = {
  all: ['audit-logs'] as const,
  list: (params: unknown) => [...auditLogQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...auditLogQueryKeys.all, 'detail', id] as const,
  statistics: () => [...auditLogQueryKeys.all, 'statistics'] as const,
};
