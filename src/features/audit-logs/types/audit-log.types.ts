export interface AuditLog {
  id: string;
  organizationId: string | null;
  departmentId: string | null;
  actorId: string | null;
  actorPlatformRole: 'SUPER_ADMIN' | null;
  actor: { id: string; name: string; email: string } | null;
  action: string;
  resourceType: string;
  resourceId: string;
  organization: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  result: string | null;
  status: string | null;
  timestamp: string;
  description?: string;
}

export interface AuditListParams {
  page: number;
  limit: number;
  search?: string;
  actorId?: string;
  action?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy: 'timestamp' | 'action' | 'resourceType' | 'result' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface AuditListResponse {
  items: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuditStatistics {
  total: number;
  today: number;
  week: number;
  byAction: { action: string; count: number }[];
}
