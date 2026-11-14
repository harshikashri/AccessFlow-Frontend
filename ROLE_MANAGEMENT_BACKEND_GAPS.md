# Role Management backend-gap report

This report records the boundaries of the existing backend contract used by the Phase 8 frontend. The implementation uses only mounted backend routes; it does not change backend code or simulate missing endpoints.

## Supported backend contract

The role routes are mounted under `/api/roles`. They require authentication, an active organization context, the corresponding organization-scoped `roles.view`, `roles.create`, or `roles.edit` permission, and an active Organization Admin assignment. A Super Admin platform session does not provide the tenant organization context required by these routes.

The mounted API supports role listing and details, custom-role creation, supported metadata and permission updates, custom-role activation/deactivation, a permission catalog, paginated role assignments, and assignment add/remove operations. Role definitions are tenant-bound to the active session; the browser cannot select a different organization.

## Unsupported capabilities and frontend behavior

| Backend limitation                                                                                                                                                                            | Frontend behavior                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| There is no role deletion endpoint.                                                                                                                                                           | No role-delete action is shown. Deactivation is not presented as deletion.                                                                                                                                                   |
| Audit events are written for role changes, but no role-specific audit read endpoint is mounted.                                                                                               | The role pages do not show or request an Activity/Audit feed.                                                                                                                                                                |
| There is no atomic assignment-scope update endpoint.                                                                                                                                          | Scope cannot be edited in place. The UI does not issue a remove-then-add sequence, which could leave partial state.                                                                                                          |
| The role list supports name-only search, status filtering, pagination, and a fixed set of sort fields; it has no role-type filter. Organization scope comes from the session, not a filter.   | Only supported filters and sorting are offered; the active organization is shown as the scope.                                                                                                                               |
| The role assignment list is paginated but has no search or status-filter parameters.                                                                                                          | The UI does not display unsupported assignment-list filters.                                                                                                                                                                 |
| No dedicated endpoint finds role-assignment candidates. User lookup uses `GET /users`, which requires `users.view`; department options use `/departments`, which requires `departments.view`. | Candidate and department lookup reports authorization/API errors and never submits without required candidate, duplicate-check, and scope data. The backend remains responsible for final assignment validation.             |
| The API does not expose another user's complete effective-permission snapshot. A role's permission list is not the same as a user's effective access.                                         | The UI labels role permissions as role-definition permissions. It refreshes the signed-in administrator's `/auth/me` after changes that can affect their own access and does not infer another user's effective permissions. |
| `assignmentCount` counts active assignment records, not distinct users.                                                                                                                       | The UI labels this metric “Active assignments.”                                                                                                                                                                              |

## Backend-enforced role and assignment rules

- Role APIs require both the relevant `roles.*` permission and an Organization Admin assignment; a permission grant alone is insufficient.
- Built-in roles cannot be renamed, have their purpose changed, or be activated/deactivated through these APIs. Department Manager is the only built-in role whose permissions can be changed. Built-in descriptions may be updated.
- Role purpose is limited to `GENERAL` and `FINANCE_APPROVER`; role permissions are validated against the backend catalog.
- Organization Admin assignments must be organization-scoped. Department Manager assignments must be department-scoped. Department-scoped assignments require a valid active department in the same organization.
- Assignment creation also requires an active user account, active organization membership, an active role, compatible role assignments, and permission scope that the actor is allowed to grant. The backend prevents permission/status changes or assignment removals that would leave the organization without a capable active Organization Admin.
- Deactivating a role or changing its permissions affects backend effective-permission resolution; it does not delete assignment records.

The frontend validates response shapes and reports API failures, but these client checks do not replace backend authorization or validation.
