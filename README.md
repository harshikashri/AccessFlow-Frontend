# AccessFlow Frontend

The AccessFlow frontend is a standalone React application for the Enterprise Access & Workflow Management Platform. It includes the design system, authentication flow, a responsive permission-aware workspace shell, and a data-driven dashboard backed by the existing dashboard APIs.

## Technology

- React and TypeScript
- Vite
- React Router
- Axios
- TanStack Query
- Vitest and Testing Library
- ESLint and Prettier

## Project structure

- `src/app`: application entry point, providers, and router.
- `src/assets`: static images, icons, and fonts.
- `src/app/pages`: application pages, including the development-only component showcase.
- `src/components/ui`: reusable controls and display primitives; `common` and `feedback` contain shared page and state components.
- `src/config` and `src/constants`: validated environment and shared configuration.
- `src/features/auth`: authentication API services, in-memory access-token handling, session context, protected routes, and sign-in/password pages.
- `src/features/authorization`: validated permission types, scope-aware permission checks, and centralized navigation requirements.
- `src/features/dashboard`: typed dashboard API integration, permission-aware widgets, filters, charts, activity, and dashboard states.
- `src/features/departments`: tenant-scoped department directory, department forms and details, scoped status management, and manager assignment.
- `src/features/organizations`: typed organization API integration, platform-only routes, server-paginated listing, organization forms, details, and status management.
- `src/features/users`: tenant-scoped user directory, profile and membership lifecycle management, department transfers, and permission-scoped role assignment.
- `src/layouts` and `src/routes`: shared workspace layout and routing primitives, including authenticated and permission-aware route guards.
- `src/lib` and `src/services`: third-party client configuration and shared API infrastructure.
- `src/stores`: reserved for genuinely global client-side state; server state belongs in TanStack Query.
- `src/styles`, `src/types`, and `src/utils`: global styling, shared types, and pure utilities.

## Design system preview

Run `npm run dev` and open `/ui-showcase` to explore the reusable components and responsive layout foundation. This route is registered only in Vite development mode and is not included in production routing. Design tokens are centralized in `src/styles/variables.css`; shared component and responsive layout styles live in `src/styles/components.css`.

The UI foundation includes accessible buttons, form controls, cards, badges, dialogs, dropdowns, tabs, tooltips, tables, avatars, separators, skeletons, spinners, alerts, and toasts.

The authentication routes are `/login`, `/forgot-password`, `/reset-password`, and `/set-password`. Authenticated users get a responsive sidebar, breadcrumbs, account menu, and explicit loading/unavailable/forbidden states. The platform and tenant dashboards, Super Admin organization management, tenant department management, tenant user management, role management, and request management routes load API-backed data. Workflows, approvals, and audit logs remain informational placeholders. Request attachments are displayed when returned by the API, but the current backend exposes metadata only and has no upload/download endpoint. Notifications continue to use backend workflow services rather than frontend code.

## Prerequisites

- Node.js 22.12 or newer.
- npm 10 or newer.

## Install and run

```sh
npm install
npm run dev
```

Vite starts the development server at `http://localhost:5173` by default.

## Build and quality checks

```sh
npm run build
npm run preview
npm run lint
npm run typecheck
npm test
npm run format:check
```

Use `npm run format` to format project files.

## Environment and API connection

Copy `.env.example` to `.env.local` and configure `VITE_API_BASE_URL`. For local backend development, the example value is `http://localhost:5000/api`.

The shared Axios client reads this variable through `src/config/env.ts`; the backend URL is not embedded in application source. The backend mounts REST modules under `/api`.

Authentication calls use `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`, `/auth/logout-all`, `/auth/forgot-password`, `/auth/reset-password`, and `/auth/set-password`. The refresh token stays in the backend's HttpOnly cookie; access tokens are held only in memory and are never written to browser storage. The Axios interceptor refreshes once for `401 TOKEN_EXPIRED` responses and shares concurrent refreshes.

Login and session restoration call `/auth/me` to obtain the authoritative current-user profile. Its `authorization` object contains `platformPermissions`, `organizationPermissions`, and `departmentPermissions` keyed by department ID. The frontend validates permission IDs and department IDs, keeps organization and department scopes separate, hides protected navigation until authorization is available, and guards direct feature URLs using the same requirements. Super Admin platform navigation uses the backend's `SUPER_ADMIN` session role; the frontend does not invent platform permission IDs. Authorization can be refreshed through the current-user endpoint.

Role and workflow endpoints have additional backend assignment rules not represented in the `/auth/me` contract. Their current pages are placeholders and make no feature API calls, so they do not imply those additional backend capabilities are available in the UI.

## Organization management (Phase 5)

Organization management is available at `/organizations`, with separate creation (`/organizations/new`), detail (`/organizations/:organizationId`), and edit (`/organizations/:organizationId/edit`) pages. Every route is protected by the existing platform-session navigation guard and checks the authenticated `platformRole` against `SUPER_ADMIN`, matching the backend's `requireSuperAdmin` middleware. The backend does not define organization-management permission IDs; tenant administrators and custom tenant roles are not granted access by role name or by unrelated permissions.

The frontend uses the shared Axios client, TanStack Query, and typed runtime-validated responses for these existing endpoints (relative to the `/api` base URL):

| Method and path                                   | Supported behavior                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /organizations`                              | Server-paginated list. Supports `page`, `limit` (1–100), name-only `search`, `status` (`ACTIVE`/`INACTIVE`), `sortBy` (`name`, `createdAt`, `updatedAt`, `status`), and `sortOrder` (`asc`/`desc`). Defaults are page 1, limit 10, created date descending. |
| `POST /organizations`                             | Creates an organization and required initial administrator. Body: `{ name, admin: { name, email, password } }`.                                                                                                                                             |
| `GET /organizations/:organizationId`              | Returns the public organization profile and `memberCount`, `activeMemberCount`, and `departmentCount`.                                                                                                                                                      |
| `PATCH /organizations/:organizationId`            | Updates only `{ name }`.                                                                                                                                                                                                                                    |
| `PATCH /organizations/:organizationId/activate`   | Activates the organization.                                                                                                                                                                                                                                 |
| `PATCH /organizations/:organizationId/deactivate` | Deactivates the organization.                                                                                                                                                                                                                               |

Organization names and initial administrator names must be 2–200 characters. The administrator email follows the backend's email pattern; the password must contain at least 10 characters, a lowercase letter, an uppercase letter, a number, and a special character. The backend creates an active organization, initial admin membership and role, built-in organization roles, default request types, and an approval workflow in a transaction. The UI collects only fields accepted by the create/update validators and explains that status deactivation prevents organization members from signing in; it does not delete data.

List summary cards use the organization list endpoint's server-returned totals with `limit=1` for the overall, active, and inactive counts. The directory itself always uses server-side pagination and supports debounced name search, status filtering, and the backend's supported sort fields. Organization details display only fields and counts returned by the detail endpoint. The create, edit, and status mutations invalidate organization and dashboard caches for the current user.

The backend has no organization delete endpoint, organization code/contact fields, organization-scoped user or department listing endpoints, or organization activity/audit read endpoint. Organization creation, updates, and status changes are audit-logged by the backend, but those records cannot be displayed per organization through the current APIs. Detail pages state these limitations instead of fabricating data. Organization analytics remain available on the platform dashboard, whose organization rows link to the corresponding detail page.

## Department management (Phase 6)

The tenant Department Management module uses the active organization context of the authenticated session. It is not a platform-wide directory: the backend requires an organization context for every department endpoint, and Super Admin platform sessions explicitly have no organization context. Department routes are available at `/departments`, `/departments/new`, `/departments/:departmentId`, and `/departments/:departmentId/edit`. Existing navigation visibility is based on `departments.view`; department details and edit actions additionally check the requested department's effective permission scope. Department creation requires organization-scoped `departments.create`, matching the backend's organization-wide-only create guard. The backend remains the authorization boundary and enforces organization and department scope for every request.

The frontend uses the shared Axios client, TanStack Query, and runtime-validated response shapes for these existing APIs (relative to the `/api` base URL):

| Method and path                               | Purpose and contract                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /departments`                            | Server-paginated, active-organization list. Supports `page`, `limit` (1–100), name-only `search`, `status` (`ACTIVE`/`INACTIVE`), `sortBy` (`name`, `description`, `status`, `createdAt`, `updatedAt`), and `sortOrder`. Departments are narrowed by backend `departments.view` organization or department scope. |
| `POST /departments`                           | Creates `{ name, description? }` in the session's active organization. The server creates it as `ACTIVE`; the organization must be active.                                                                                                                                                                        |
| `GET /departments/:departmentId`              | Returns the department, authorized manager and member summaries, plus manager/member counts.                                                                                                                                                                                                                      |
| `PATCH /departments/:departmentId`            | Updates only `name` and/or `description`; updates are rejected for inactive departments.                                                                                                                                                                                                                          |
| `PATCH /departments/:departmentId/managers`   | Replaces the full list with `{ managerIds: string[] }`. The backend validates active account and organization membership, eligible active role assignments and permission scope, then ensures or deactivates the built-in Department Manager assignment as appropriate.                                           |
| `PATCH /departments/:departmentId/activate`   | Activates the department.                                                                                                                                                                                                                                                                                         |
| `PATCH /departments/:departmentId/deactivate` | Deactivates the department.                                                                                                                                                                                                                                                                                       |
| `GET /roles`                                  | Used only to discover active roles carrying `departments.edit` when opening manager assignment. The backend exposes role management only to Organization Admin access.                                                                                                                                            |
| `GET /users`                                  | Used with `status=ACTIVE` and a qualifying `roleId` to find candidate accounts. Candidates are additionally checked for active organization membership and matching organization/department role-assignment scope.                                                                                                |

Department names are trimmed and must be 2–200 characters; descriptions are trimmed and may contain at most 1000 characters. Names are unique within an organization, with conflicts reported by the backend. Create and edit forms send no organization, code, manager, or status fields because those are not accepted by their validators. The active organization is taken from the authenticated session, never selected or supplied by the browser.

The directory requests server-side pages and supports only backend-supported name search, status filtering and sorting. It displays backend manager/member counts, status and timestamps; it does not invent a department code, manager filter, organization-name column, or global organization selector. Details display the returned organization ID, manager profiles and active members. Manager assignment is presented as a full-list replacement and the backend revalidates every selected candidate. The candidate discovery APIs are stricter than the department mutation API: the UI requires organization-level `roles.view` and `users.view`, and the backend's role endpoints require Organization Admin access. If that candidate data is forbidden or unavailable, the UI reports the error and does not submit an unverified list.

Deactivation retains department membership and manager references; it does not delete users or remove role assignments. The backend blocks editing and new member additions while inactive, and department-scoped permissions are not effective for inactive departments. The UI confirms the change and describes these effects. Details show members read-only; although the backend has member-add/remove endpoints, those actions are left to the User Management phase. No department activity read endpoint is implemented (the audit module has no read route), so department audit events are not fetched or represented as a department activity feed.

Phase 5 Organization Details remains platform-only and cannot safely embed tenant department data: its Super Admin session has no organization context, and there is no platform organization-switching or organization-scoped department-list API. Department links are available through the tenant navigation and details routes instead. Dashboard Quick Actions now link authorized organization-wide creators directly to the dedicated department creation route.

## Request management (Phase 9)

Request Management is available at `/requests`, `/my-requests`, `/requests/new`, `/requests/:requestId`, and `/requests/:requestId/edit`. It uses the existing request-type, request, workflow-runtime, approval-progress, and approval-history APIs. Request types and dynamic fields are loaded from the backend; request types are not hardcoded in the frontend.

The request UI supports:

- Request type selection.
- Dynamic text, textarea, number, date, select, multi-select, and checkbox fields.
- Server-validated request creation and draft saving.
- Server-paginated request listing and personal request history.
- Draft and returned-request editing.
- Submission and returned-request resubmission.
- Request cancellation with a required reason.
- Request details, status, dynamic values, approval progress, and activity history.

The backend remains responsible for ownership, organization/department scope, dynamic-field validation, status transitions, workflow selection, approval-step creation, audit events, and notifications. The frontend does not implement approval decisions or claim-one behavior. Attachment metadata is displayed when present, but upload/download is not exposed because the current backend has no dedicated storage API.

The request APIs used by the frontend (relative to `/api`) are:

| Method and path | Purpose |
| --- | --- |
| `GET /request-types` | List active request types available to the current session. |
| `GET /request-types/:requestTypeId` | Load a dynamic request form definition. |
| `GET /requests` | Server-paginated, scope-filtered request listing. |
| `POST /requests` | Create a draft request. |
| `GET /requests/:requestId` | Load an authorized request. |
| `PATCH /requests/:requestId` | Update a draft or returned request. |
| `POST /requests/:requestId/submit` | Start the configured approval workflow. |
| `POST /requests/:requestId/resubmit` | Start a new approval attempt for a returned request. |
| `POST /requests/:requestId/cancel` | Cancel an eligible request. |
| `GET /requests/:requestId/approval-progress` | Load current approval progress. |
| `GET /requests/:requestId/approval-history` | Load request and approval timeline events. |

## Approval management (Phase 10)

Approval Management is available at `/approvals`, `/approvals/:approvalStepId`, and `/approvals/delegation`. It uses the existing approval runtime and delegation APIs; approval authorization, claim ownership, workflow advancement, scope checks, and audit events remain backend responsibilities.

The approval UI supports:

- Filtered and paginated approval inbox views for pending, available, claimed, completed, and relevant tasks.
- Approval request details, dynamic request information, SLA deadline display, and approval history.
- Claim-one, approve, reject, and return-for-correction actions with the backend-required comment rules.
- Creating and revoking organization- or department-scoped delegations.

The current backend does not expose a release-claim endpoint or a dedicated eligible-delegate search endpoint. Delegation creation therefore accepts a delegate user ID and the backend validates eligibility. Dates are entered as ISO-8601 values.

The approval APIs used by the frontend (relative to `/api`) are:

| Method and path | Purpose |
| --- | --- |
| `GET /approvals/inbox` | Load the authorized approval inbox. |
| `GET /approvals/:approvalStepId` | Load an authorized approval step and request details. |
| `POST /approvals/:approvalStepId/claim` | Atomically claim a claim-one approval. |
| `POST /approvals/:approvalStepId/approve` | Approve the current stage. |
| `POST /approvals/:approvalStepId/reject` | Reject the current stage with a required comment. |
| `POST /approvals/:approvalStepId/return` | Return the request for correction with a required reason. |
| `GET /approval-delegations` | List the current user's delegations. |
| `POST /approval-delegations` | Create a backend-validated delegation. |
| `POST /approval-delegations/:delegationId/revoke` | Revoke a delegation. |

## User management (Phase 7)

User Management is available only in the authenticated tenant organization at `/users`, `/users/new`, `/users/:userId`, and `/users/:userId/edit`. It uses the shared API client and TanStack Query, validates backend response shapes at runtime, and uses the authorization scopes returned by `/auth/me`. The directory and detail pages require effective `users.view`; create requires organization-wide `users.create`; profile edits and password instructions require `users.edit`; membership lifecycle actions require `users.deactivate`. Create-only users have a dedicated navigation and Quick Actions link to `/users/new`. The backend remains authoritative for tenant boundaries and each mutation.

The frontend supports these existing endpoints (relative to `/api`):

| Method and path                                                         | Supported behavior                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /users`                                                            | Server pagination, name/email search, global account-status filter, department filter (`departmentId=null` means unassigned), role filter, and supported name/email/status/date sorting. Results are filtered by effective backend organization and department scope. |
| `POST /users`                                                           | Creates `{ name, email, departmentId?, roleAssignments? }` in the active organization and sends initial password setup instructions. No password or organization selector is sent.                                                                                    |
| `GET /users/:userId`                                                    | Returns the safe profile, current organization membership, department summary, and active role summaries.                                                                                                                                                             |
| `PATCH /users/:userId`                                                  | Changes only `{ name?, email? }`. Email remains globally unique; changing it revokes all of the user's sessions across organizations.                                                                                                                                 |
| `PATCH /users/:userId/department`                                       | Transfers only the current organization's membership with `{ departmentId: string                                                                                                                                                                                     | null }`. The target must be an active in-organization department and source/target scopes are checked. Department Manager role assignments are not implicitly changed. |
| `PATCH /users/:userId/activate` and `/deactivate`                       | Activate or deactivate this organization's membership only. The backend protects self/last-admin cases and revokes sessions for this organization on deactivation.                                                                                                    |
| `POST /users/:userId/password-reset`                                    | Sends password setup or reset instructions; the API does not return the token. The frontend displays only a success/failure notice.                                                                                                                                   |
| `GET /roles` and `GET /roles/users/:userId`                             | Discover active role options and assignment records for the role-management panel. Role endpoints additionally require Organization Admin access; a permission grant alone may not make these endpoints available.                                                    |
| `POST /roles/:roleId/assign` and `DELETE /roles/:roleId/assign/:userId` | Add or remove one role assignment at its explicit organization or department scope. The backend validates scope, role compatibility, active account/membership, and the last-admin constraint.                                                                        |
| `GET /departments`                                                      | Reused for active department choices and directory filters; the authenticated organization context is supplied by the session, not a browser-selected tenant.                                                                                                         |

Global account status and organization-membership status are deliberately displayed separately. A newly created account needs to complete password setup; the membership activate/deactivate actions do not change global account state. If user creation returns `USER_CREATED_EMAIL_FAILED`, the user record has already committed; the page surfaces the returned user ID, disables another create attempt, and tells the operator not to retry blindly.

The current APIs do not support Super Admin/platform user management, tenant selection, cross-organization filtering, global account activation/deactivation, a user-specific audit/activity read feed, last-login timestamps, employee/contact fields, or an atomic role-assignment scope update. The detail endpoint also omits `passwordSetupRequired`, so the UI does not infer setup state from an inactive global account. Role reassignment is not implemented as an implicit remove-then-add sequence. These capabilities require backend API changes and are not fabricated by the frontend.

## Role and permission management (Phase 8)

Role Management is available in the active tenant at `/roles`, `/roles/new`, `/roles/:roleId`, and `/roles/:roleId/edit`. The pages use the existing `/api/roles` endpoints and permission catalog. The backend requires an authenticated active organization context, the matching `roles.view`, `roles.create`, or `roles.edit` organization permission, and an active Organization Admin assignment; a Super Admin platform session has no organization context for these endpoints. The frontend also checks the effective organization permission before exposing each page action.

| Method and path                                                         | Supported behavior                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET /roles`                                                            | Organization-scoped pagination, role-name search, status filtering, and sorting by name, type, status, or timestamps. |
| `GET /roles/:roleId`                                                    | Returns role metadata, permissions, and active assignment-record count.                                               |
| `POST /roles`                                                           | Creates a custom role in the active organization with name, description, purpose, and permission IDs.                 |
| `PATCH /roles/:roleId`                                                  | Updates supported name, description, and custom-role purpose fields.                                                  |
| `PATCH /roles/:roleId/permissions`                                      | Replaces the role's permissions. Built-in permission changes are backend-protected except for Department Manager.     |
| `PATCH /roles/:roleId/activate` and `/deactivate`                       | Changes custom-role status; built-in role lifecycle changes are protected.                                            |
| `GET /roles/permissions/catalog`                                        | Provides the modules and permission definitions displayed in the permission matrix.                                   |
| `GET /roles/:roleId/users` and `GET /roles/users/:userId`               | Returns paginated assignment records with their scope and status.                                                     |
| `POST /roles/:roleId/assign` and `DELETE /roles/:roleId/assign/:userId` | Adds an assignment at an explicit scope or marks a matching active assignment inactive.                               |

Assignment scope belongs to each user-role assignment, not the role. Organization Admin requires organization scope; Department Manager requires department scope. Assignment candidates are discovered through the existing user directory (`users.view`), and department options through the department directory (`departments.view`); the backend validates membership, account, scope, role compatibility, and last-administrator protections again on submission. Permission changes affect effective access, so the signed-in user refreshes `/auth/me` after changing their own access. See the [Role Management backend-gap report](./ROLE_MANAGEMENT_BACKEND_GAPS.md) for unsupported API capabilities and constraints that the UI intentionally does not simulate.

## Dashboard API plan and scope

The dashboard uses the existing authenticated Axios client and TanStack Query. All dashboard endpoints are `GET /dashboard/...` relative to `VITE_API_BASE_URL`, which includes the backend `/api` prefix. Responses use the standard `{ success, message, data }` envelope; dashboard failures use the shared `{ success: false, message, code, details? }` API error shape.

| Endpoint                                | Data used                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /dashboard/config`                 | Server-filtered `PLATFORM` or `DYNAMIC` dashboard type, visible widget registry, and supported date-range options. Query parameters are not accepted. |
| `GET /dashboard/summary`                | Effective KPI array, deferred widget metadata, and resolved date range. Accepts `range`, `fromDate`, `toDate`.                                        |
| `GET /dashboard/organization-analytics` | Platform organization registration/status trends and organization comparisons/overview.                                                               |
| `GET /dashboard/user-analytics`         | Platform or tenant user totals, registration trends, and platform organization/role or tenant department breakdowns.                                  |
| `GET /dashboard/request-analytics`      | Platform or authorized tenant request trends, status and type distributions, period comparison, and platform organization comparison.                 |
| `GET /dashboard/approval-analytics`     | Authorized tenant approval workload, status/stage/decision summaries, and returned approval-duration/SLA metrics. Not available to Super Admin.       |
| `GET /dashboard/department-analytics`   | Platform department analytics or the tenant department statistics/directory variant authorized by the caller's permissions.                           |
| `GET /dashboard/recent-activity`        | Scope-filtered platform or tenant activity with pagination. Accepts date-range fields plus `page` and `limit`; it has no activity-category filter.    |

The backend widget configuration is the source of truth for visible dashboard content. Tenant widgets map as follows: `REQUEST_SUMMARY` → request KPIs/analytics; `APPROVAL_SUMMARY` and `APPROVAL_ACTIVITY` → approval KPIs/analytics; `USER_STATISTICS` → user KPIs/analytics; `DEPARTMENT_OVERVIEW` → department KPIs/analytics; `ROLE_OVERVIEW` → role KPIs (role analytics is deferred); `AUDIT_ACTIVITY` → recent activity (its KPI provider is deferred). `REQUEST_CREATE` is a deferred data widget and may only link to the existing request placeholder when `requests.create` is effective.

Platform widgets map as follows: `PLATFORM_OVERVIEW` → platform KPIs; `ORGANIZATION_ANALYTICS` → organization analytics; `USER_ANALYTICS` → platform user analytics; `PLATFORM_USAGE_ANALYTICS` → platform request analytics; `DEPARTMENT_ANALYTICS` → platform department analytics; `PLATFORM_ACTIVITY` → platform recent activity. Deferred or unknown widgets are not given fabricated values.

Tenant dashboard authorization and scopes remain enforced by the backend and are also reflected in the existing `/auth/me` permission helpers. Department Managers and Employees receive personal/authorized request-history scope, not an assumed department-wide view. Approval analytics is limited to authorized assigned/delegated work. `availableToClaimStages` is only a count returned by the backend; the frontend does not infer claim eligibility or reveal details for unclaimed stages. Super Admin uses only the platform configuration and platform analytics endpoints.

Date filters use the backend-provided options (`LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`, `THIS_MONTH`, `THIS_YEAR`, `CUSTOM`), default to `LAST_30_DAYS`, and send custom UTC date bounds only when both are valid. Custom ranges are limited to 366 days and use a half-open interval. Summary user/department/role totals and most platform totals are current or lifetime counts, not date-windowed. Department request rows do not provide average approval time; the backend returns that field as `null`. No platform approval-analytics endpoint or custom widget-registration endpoint exists.

The dashboard uses the Phase 1 `PageHeader`, `Card`, `Table`, `Badge`, `Button`, feedback states, AccessFlow icons, Phase 3 workspace shell, authorization helpers, and query client. It renders accessible SVG/CSS visualizations from analytics response data without adding a chart dependency. Tenant dashboard presentations are driven by the returned `DYNAMIC` widget set; the API does not expose a built-in role-name dashboard discriminator, so the frontend does not guess whether a dynamic user is an Organization Admin, Department Manager, Department Member, or custom-role user.

The dashboard provides permission-filtered KPIs and widgets, server-supported date filters with validated custom UTC bounds, refresh, scoped quick actions, and paginated recent activity. It uses user- and filter-scoped TanStack Query keys, displays loading/error/empty states, and clears dashboard query data after a successful profile/permission refresh. Unsupported or deferred providers are not populated with fabricated data. Page, service, and utility tests cover tenant/platform rendering, filter requests, response validation, permissions, and user-context mismatches.

Tests run with Vitest and happy-dom and do not require a live backend.

## Repository boundary

The frontend is intended to be maintained in a repository separate from the backend. The backend was inspected read-only to align naming and API conventions; this initialization does not modify backend files.
