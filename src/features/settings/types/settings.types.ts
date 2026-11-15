export interface ProfileSettings {
  id: string;
  name: string;
  email: string;
  accountStatus: string;
  platformRole: string | null;
  organizationId: string | null;
}

export interface Preferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface NotificationPreferences {
  approvalTasks: boolean;
  requestUpdates: boolean;
  delegationUpdates: boolean;
  slaReminders: boolean;
  overdueAlerts: boolean;
  escalationAlerts: boolean;
  email: boolean;
  inApp: boolean;
}

export interface SessionInfo {
  id: string;
  organizationId: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  current: boolean;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  editableThrough: string;
}
